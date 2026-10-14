# OpenVINO — нативный Whisper на Intel CPU + iGPU + NPU

**GitHub:** https://github.com/openvinotoolkit/openvino
**PyPI:** https://pypi.org/project/optimum-intel/
**Использовать когда:** Intel Core Ultra (Meteor Lake / Lunar Lake / Arrow Lake), Intel Arc / Arc iGPU, Intel Xeon с AMX
**Не использовать когда:** Apple Silicon (там [mlx-whisper](mlx-whisper.md)) или NVIDIA GPU (там [faster-whisper](faster-whisper.md))

OpenVINO — Intel'овский inference engine. На Intel-железе он использует **все три ускорителя одновременно**: CPU, iGPU (Arc / UHD), NPU (AI Boost). `faster-whisper` через CTranslate2 видит только CPU-ядра — игнорирует ~70% AI-производительности современного Core Ultra.

На Core Ultra 7 155H + Intel Arc iGPU `large-v3-turbo` идёт **~9.8x realtime** (1.0 сек на 11-секундный клип) при качестве оригинальной модели.

## Когда брать

✅ **Intel Core Ultra** (любой 1xx/2xx серии) — встроенные NPU + Arc iGPU простаивают без OpenVINO
✅ **Intel Arc дискретные** (A380 / A580 / A770 / B580) — нативная поддержка через Level Zero
✅ **Intel Xeon с AMX** (4-го gen+) — int8 на CPU быстрее ctranslate2 благодаря AMX-инструкциям
✅ Хочешь **`large-v3-turbo` на ноутбуке без discrete GPU** — единственный реалистичный вариант

❌ Apple Silicon — берёшь [mlx-whisper](mlx-whisper.md)
❌ NVIDIA — родная поддержка через [faster-whisper](faster-whisper.md), нет смысла OpenVINO
❌ Speaker diarization — пока нет, бери [whisperx](whisperx.md) для multi-speaker задач

## Установка

```bash
# venv (любая ОС)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac Intel:
source .venv/bin/activate

pip install --upgrade openvino openvino-tokenizers \
            "optimum-intel[openvino]" onnx

# Опционально — для long-form (audio > 30s):
pip install silero-vad
```

Без `silero-vad` бэкенд работает, но `model.generate()` за один прогон видит только первые 30 секунд аудио (архитектурный лимит Whisper). С `silero-vad` аудио режется по паузам и каждый сегмент декодируется отдельно — как в faster-whisper / mlx-whisper.

### Windows: проверь драйвер Intel Arc/iGPU

Открой Device Manager → Display adapters → правый клик на Intel(R) Arc → Properties → Driver tab. Версия должна быть **32.0.x** или новее (релизы 2024+). Старые драйверы не поддерживают Whisper-операции на iGPU. Обновить: https://www.intel.com/content/www/us/en/download-center/home.html

### Linux: NPU и iGPU через Level Zero

```bash
# Ubuntu 22.04+:
sudo apt install -y intel-opencl-icd intel-level-zero-gpu level-zero
# NPU драйвер:
# https://github.com/intel/linux-npu-driver/releases
```

### Проверка что OpenVINO видит ускорители

```python
import openvino as ov
core = ov.Core()
for d in core.available_devices:
    print(d, core.get_property(d, "FULL_DEVICE_NAME"))
```

Должно вывести минимум `CPU` + (на Core Ultra) `GPU` + `NPU`. Если NPU не появился — обнови чипсет-драйвер Intel.

## Конвертация модели в IR-формат

OpenVINO использует свой формат **IR (Intermediate Representation)**. Однократно конвертируй PyTorch-модель → IR (~2-3 мин), дальше она лежит на диске и грузится мгновенно.

Готовый хелпер в скилле:

```bash
# Сконвертирует openai/whisper-large-v3-turbo в ~/.cache/openvino-whisper/whisper-large-v3-turbo-ov/
python scripts/convert_openvino.py large-v3-turbo

# Другие модели:
python scripts/convert_openvino.py small
python scripts/convert_openvino.py large-v3
```

Что внутри: `optimum.intel.OVModelForSpeechSeq2Seq.from_pretrained(src, export=True)` — стандартная конвертация optimum-intel, безо всякой магии.

## Минимальный пример

```python
from optimum.intel import OVModelForSpeechSeq2Seq
from transformers import AutoProcessor
import soundfile as sf

model_dir = "~/.cache/openvino-whisper/whisper-large-v3-turbo-ov"

processor = AutoProcessor.from_pretrained(model_dir)
model = OVModelForSpeechSeq2Seq.from_pretrained(
    model_dir,
    device="GPU",        # GPU = Intel Arc / iGPU. Также: NPU, CPU, AUTO
    compile=True,        # JIT под конкретный device при загрузке
)

audio, sr = sf.read("audio.wav", dtype="float32")
inputs = processor(audio, sampling_rate=16000, return_tensors="pt")

gen = model.generate(
    inputs.input_features,
    language="ru",
    task="transcribe",
    max_new_tokens=440,
)
text = processor.batch_decode(gen, skip_special_tokens=True)[0]
```

Через unified интерфейс скилла:

```python
import os
os.environ["WHISPER_BACKEND"] = "openvino"
os.environ["WHISPER_OV_DEVICE"] = "GPU"

from examples.common import transcribe
result = transcribe("audio.wav", language="ru", model_name="large-v3-turbo")
print(result.text)
```

## Выбор device

| device | Когда брать | Скорость относительно CPU |
|---|---|---|
| `GPU` | Дефолт на Core Ultra и Arc | **5-10x** ⭐ |
| `NPU` | Хочется минимальной задержки на коротких клипах | 3-5x (но fragile на длинных audio) |
| `CPU` | iGPU занят графикой, или fallback | 1.5-2x vs ctranslate2 на новых Xeon с AMX |
| `AUTO` | Лень выбирать — OpenVINO сам решит | как лучший доступный |

**Рекомендация:** `GPU` для всего, кроме случая «iGPU полностью забит играми/рендерингом» — тогда `NPU` для коротких или `AUTO`.

## Скорости на Intel Core Ultra 7 155H + Arc iGPU

Замеры на iGPU, large-v3-turbo, реальная русская речь:

| Длина аудио | Время инференса | Realtime ratio |
|---|---|---|
| 1.4 сек (короткая фраза) | ~0.9 сек | 1.5x |
| 3.2 сек | ~1.0 сек | 3.2x |
| 11 сек | 1.12 сек | **9.8x** |

**Cold load + GPU compile:** ~13 сек один раз при старте процесса. После — модель в кеше, инференс мгновенный.

Сравнение того же железа без OpenVINO (faster-whisper int8 на CPU 22 потока): для 1-2 сек фразы — 2.6 сек инференса. **OpenVINO в ~3x быстрее на ноутбуке без discrete GPU.**

## Известные грабли

### `RepositoryNotFoundError` или `OSError: ... is not a local folder`

Имена пре-конвертированных моделей `OpenVINO/whisper-*-int8-ov` в HF Hub не публичны или переименованы. Конвертируй сам через `scripts/convert_openvino.py <model>` — займёт 2-3 мин, потом всё работает.

### `Failed to find OpenCL ICD loader` / `GPU device not found`

Драйвер Intel Arc / iGPU не установлен или устаревший. На Windows обнови через Intel Driver Assistant. На Linux — `apt install intel-opencl-icd`.

### Скорость на NPU хуже чем на GPU

NPU оптимизирован под **короткие** последовательности (≤30 сек). На длинном audio (1+ мин) GPU всегда быстрее. Также NPU чувствителен к compute_type — если конвертировал с `compression="int8"`, NPU работает; с FP16 — иногда падает.

### `RuntimeError: cannot load openvino runtime` на Mac

OpenVINO на macOS работает только на Intel Mac (x86_64). На Apple Silicon — переключайся на [mlx-whisper](mlx-whisper.md), он быстрее и нативнее.

### Word-level timestamps не реализованы в этом бэкенде

Текущая реализация `_transcribe_openvino` отдаёт один сегмент = всё аудио, без пословных меток. Для CapCut-стиля сабов через OpenVINO нужен `optimum-intel.WhisperPipeline` с return_timestamps='word' — пока в скилле не подключено. Если нужно — используй [faster-whisper](faster-whisper.md) или [whisperx](whisperx.md).

### Модель занимает много места на диске

`large-v3-turbo` в IR-формате: ~700 MB (FP16), ~250 MB (INT8 после `nncf` квантизации). Это нормально. Кеш HuggingFace для исходной PyTorch-модели — отдельные ~2 GB, можно удалить после конвертации.

## Дальше

- Модели и бенчмарки: [models/README.md](../models/README.md)
- Установка под Windows: [docs/installation-windows.md](../docs/installation-windows.md)
- Speed-tuning: [docs/speed-tuning.md](../docs/speed-tuning.md)

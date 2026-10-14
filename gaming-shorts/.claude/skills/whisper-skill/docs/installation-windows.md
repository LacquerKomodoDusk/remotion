# Установка под Windows

> 🪟 **TL;DR**: Самый простой и стабильный путь — **WSL2 + Ubuntu**, дальше как [Linux](installation-linux.md). Нативно тоже работает, но грабли чаще.

## Опция 1 — WSL2 (рекомендую)

WSL2 = Ubuntu внутри Windows. С Windows 11 NVIDIA-драйвер автоматически прокидывается в WSL — GPU работает напрямую.

```powershell
# В PowerShell (от админа)
wsl --install Ubuntu-22.04

# Перезагрузись если попросит
# Запусти Ubuntu из меню Пуск, создай пользователя

# Внутри WSL — обычный Linux:
sudo apt update
sudo apt install -y python3 python3-venv python3-pip ffmpeg git
```

Дальше — следуй [docs/installation-linux.md](installation-linux.md). NVIDIA GPU будет видна автоматически (если Windows-драйвер установлен).

### Проверь что GPU виден из WSL

```bash
nvidia-smi
# Если работает — всё ок
# Если не работает — обнови NVIDIA driver на Windows: https://www.nvidia.com/Download/index.aspx
```

## Опция 2 — Нативно Windows + faster-whisper

```powershell
# 1) Python 3.10+
winget install Python.Python.3.12

# 2) ffmpeg
winget install Gyan.FFmpeg

# 3) Если есть NVIDIA GPU — CUDA Toolkit
# https://developer.nvidia.com/cuda-downloads → Windows → exe (network)

# 4) Build Tools (нужны для некоторых wheels)
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# В установщике выбери: "Desktop development with C++"
```

```powershell
# Создай venv
mkdir whisper-projects
cd whisper-projects
python -m venv .venv
.\.venv\Scripts\activate

pip install --upgrade pip
pip install faster-whisper yt-dlp
```

### Использование

```python
from faster_whisper import WhisperModel

# С NVIDIA GPU
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")

# Без GPU
# model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")

segments, info = model.transcribe("audio.mp3", language="ru", vad_filter=True)
for s in segments:
    print(f"[{s.start:.1f}s] {s.text}")
```

## Опция 3 — whisper.cpp нативно

Если не хочется Python:

```powershell
# Через chocolatey (поставь его если нет: https://chocolatey.org)
choco install whisper-cpp

# Или скачай готовый бинарник: https://github.com/ggerganov/whisper.cpp/releases
```

Скачай модель:
```powershell
# Если есть curl
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin

# Или через PowerShell
Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin" -OutFile "ggml-large-v3-turbo.bin"
```

Использование:
```powershell
# Конвертация в WAV если нужно
ffmpeg -i input.mp3 -ar 16000 -ac 1 audio.wav

# Транскрибация
whisper-cli -m ggml-large-v3-turbo.bin -l ru -f audio.wav --output-srt
```

## Опция 4 — OpenVINO для Intel Core Ultra / Intel Arc

Если у тебя процессор Intel Core Ultra (Meteor Lake / Lunar Lake / Arrow Lake) или дискретная Arc — это **самый быстрый путь без NVIDIA**. OpenVINO задействует **iGPU + NPU + CPU одновременно**.

```powershell
# В уже созданном venv:
pip install openvino openvino-tokenizers "optimum-intel[openvino]" onnx

# Проверь что OpenVINO видит iGPU + NPU:
python -c "import openvino as ov; [print(d) for d in ov.Core().available_devices]"
# Ожидается: CPU, GPU, NPU
```

Если NPU/GPU не появились — обнови [Intel Graphics Driver](https://www.intel.com/content/www/us/en/download-center/home.html) (нужна версия 32.0.x или новее, релизы 2024+).

```powershell
# Сконвертируй модель в OpenVINO IR (~2-3 мин, один раз):
python scripts\convert_openvino.py large-v3-turbo

# Использовать через unified интерфейс:
$env:WHISPER_BACKEND = "openvino"
$env:WHISPER_OV_DEVICE = "GPU"   # Intel Arc iGPU. Также: NPU, CPU, AUTO
python -m examples.transcribe_one input.mp3 --language ru --model large-v3-turbo
```

Подробнее, бенчмарки и грабли: [backends/openvino.md](../backends/openvino.md).

## Типичные грабли на Windows

### `error: Microsoft Visual C++ 14.0 or greater is required`

Не установлены Build Tools. Установи их (см. выше) или **используй WSL2** (там не нужны).

### `Could not locate cublasLt64_12.dll`

CUDA Toolkit не стоит или PATH не настроен. Решение:
1. Поставить CUDA Toolkit с https://developer.nvidia.com/cuda-downloads
2. Перезагрузить
3. Проверить: `nvcc --version` в PowerShell

### `OSError: [WinError 126]` при импорте faster-whisper

cuDNN не установлен. Скачай с https://developer.nvidia.com/cudnn (нужен NVIDIA Developer аккаунт, бесплатный) и распакуй в `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\`.

Или — переключись на WSL2.

### Скорость нативно сильно меньше чем на Linux

Известная проблема — Windows слабее на mathops. **WSL2 быстрее**. Если совсем нативно надо — попробуй `compute_type="float16"` явно.

### PyTorch ставится без CUDA

`pip install torch` ставит CPU-версию. Правильно — с `--index-url`:
```powershell
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

## Diarization на Windows

WSL2 — рекомендую. Нативно тоже работает:
```powershell
pip install whisperx

# HF token
[Environment]::SetEnvironmentVariable("HF_TOKEN", "hf_xxxxxxxx", "User")
# Перезапусти PowerShell чтобы env применился
```

⚠️ pyannote-модели на Windows иногда капризничают с путями (Unicode/spaces). Если упало — путь к проекту без пробелов и кириллицы.

## Где модели хранятся

`%USERPROFILE%\.cache\huggingface\hub\` — все скачанные модели. Можно перенести на другой диск через переменную:

```powershell
[Environment]::SetEnvironmentVariable("HF_HOME", "D:\hf-cache", "User")
```

## Smoke-test

```powershell
# 5 секунд тишины
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 test.wav

python -c "from faster_whisper import WhisperModel; m = WhisperModel('tiny', device='cpu', compute_type='int8'); list(m.transcribe('test.wav')[0]); print('OK')"
```

Если упало — открой [docs/known-issues.md](known-issues.md).

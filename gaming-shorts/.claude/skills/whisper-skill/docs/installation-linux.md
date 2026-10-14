# Установка под Linux

> 🐧 **TL;DR**: Есть NVIDIA GPU → `faster-whisper` с CUDA. Нет GPU → `faster-whisper` в CPU int8. AMD GPU → ROCm (сложнее) или Vulkan через whisper.cpp.

## Шаг 1 — базовые зависимости

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip ffmpeg git curl
```

Arch:
```bash
sudo pacman -S python python-pip ffmpeg git curl
```

Fedora:
```bash
sudo dnf install -y python3 python3-pip ffmpeg-free git curl
```

## Шаг 2A — С NVIDIA GPU (рекомендованный)

### Проверь драйвер и CUDA

```bash
nvidia-smi
# Должен показать:
#   Driver Version: 535.x или новее
#   CUDA Version: 12.x (это driver-side, нужно <= installed Toolkit)
```

Если `nvidia-smi` не работает — поставь драйвер:
```bash
sudo apt install -y nvidia-driver-535   # Ubuntu
# или через инсталлятор: https://www.nvidia.com/Download/index.aspx
```

### Поставь CUDA Toolkit

```bash
# Ubuntu 22.04 — пример для CUDA 12.4:
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt install -y cuda-toolkit-12-4
```

Или скачай runfile с https://developer.nvidia.com/cuda-downloads — выбери ОС.

```bash
# Проверка
nvcc --version
# Должен показать: Cuda compilation tools, release 12.4, V12.4.x
```

### Поставь cuDNN (нужен для faster-whisper)

```bash
sudo apt install -y libcudnn8 libcudnn8-dev
```

### Создай venv и поставь whisper

```bash
mkdir -p ~/whisper-projects && cd ~/whisper-projects
python3 -m venv .venv && source .venv/bin/activate

pip install --upgrade pip
pip install faster-whisper yt-dlp

# Проверка
python -c "from faster_whisper import WhisperModel; m = WhisperModel('tiny', device='cuda'); print('CUDA OK')"
```

### Использование

```python
from faster_whisper import WhisperModel

model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.mp3", language="ru", vad_filter=True)
for s in segments:
    print(f"[{s.start:.1f}s] {s.text}")
```

## Шаг 2B — Без GPU (CPU only)

```bash
mkdir -p ~/whisper-projects && cd ~/whisper-projects
python3 -m venv .venv && source .venv/bin/activate

pip install --upgrade pip
pip install faster-whisper yt-dlp
```

```python
# CPU режим — обязательно int8
model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
```

⚠️ Скорость на современном x86 8c CPU с `large-v3-turbo` int8 — примерно **0.5x от realtime**. Терпимо для коротких клипов, медленно для подкастов.

Альтернатива — `whisper.cpp` с AVX2/AVX512 оптимизациями (часто чуть быстрее на CPU):

```bash
sudo apt install -y build-essential cmake
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
cmake -B build && cmake --build build --config Release

bash ./models/download-ggml-model.sh large-v3-turbo
./build/bin/whisper-cli -m models/ggml-large-v3-turbo.bin -l ru -f audio.wav
```

## Шаг 2C — С AMD GPU (ROCm)

⚠️ AMD-путь капризный. Если упадёт — переключайся на whisper.cpp с Vulkan-бэкендом (тоже на AMD GPU работает но без ROCm).

### Поставь ROCm

```bash
# Ubuntu 22.04 — см. https://rocm.docs.amd.com/projects/install-on-linux/
wget https://repo.radeon.com/amdgpu-install/6.0.2/ubuntu/jammy/amdgpu-install_6.0.60002-1_all.deb
sudo apt install ./amdgpu-install_6.0.60002-1_all.deb
sudo amdgpu-install --usecase=rocm

# Проверка
rocminfo | head
```

### PyTorch с ROCm + faster-whisper

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/rocm6.0
pip install faster-whisper
```

```python
import torch
print(torch.cuda.is_available())  # True если ROCm работает (PyTorch маскирует под CUDA)
```

### Альтернатива — whisper.cpp + Vulkan

Проще и стабильнее:
```bash
sudo apt install -y libvulkan-dev vulkan-tools

git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
cmake -B build -DGGML_VULKAN=1
cmake --build build --config Release

bash ./models/download-ggml-model.sh large-v3-turbo
./build/bin/whisper-cli -m models/ggml-large-v3-turbo.bin -l ru -f audio.wav
```

## Diarization

```bash
pip install whisperx

# HF token (бесплатно):
# https://huggingface.co/settings/tokens

echo 'export HF_TOKEN=hf_xxxxxxxx' >> ~/.bashrc
source ~/.bashrc
```

## Прокси / закрытые сети

Если HF и PyPI закрыты сетью:
```bash
# Прокси для pip
pip install --proxy http://proxy:port faster-whisper

# Прокси для HF
export HF_HUB_HTTP_BACKEND=requests
export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
```

Альтернатива — скачать модель руками с зеркала и положить в кэш.

## Smoke-test

```bash
# Создай тестовый wav (5 сек тишины — Whisper должен дать пустой результат)
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 test.wav

python -c "
from faster_whisper import WhisperModel
m = WhisperModel('tiny', device='cuda' if 'cuda' in __import__('torch').cuda.get_device_name(0).lower() or True else 'cpu', compute_type='int8')
segs, info = m.transcribe('test.wav')
print('OK, language:', info.language)
"
```

Если падает — открой [docs/known-issues.md](known-issues.md).

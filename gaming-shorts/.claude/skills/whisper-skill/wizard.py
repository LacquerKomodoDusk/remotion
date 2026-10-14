#!/usr/bin/env python3
"""
Whisper Stack — интерактивный мастер настройки.

Запусти один раз — он спросит что хочешь делать, определит железо и
автоматически поставит всё что нужно.

    python wizard.py

Не нужно знать терминологию: просто отвечай на вопросы.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

# Подмешиваем scripts/ в path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# ─── ANSI ───────────────────────────────────────────────────────────────────
USE_COLOR = sys.stdout.isatty()


def _c(code, t):
    return f"\033[{code}m{t}\033[0m" if USE_COLOR else t


def green(t): return _c("32", t)
def yellow(t): return _c("33", t)
def red(t): return _c("31", t)
def blue(t): return _c("34", t)
def cyan(t): return _c("36", t)
def bold(t): return _c("1", t)
def dim(t): return _c("2", t)


def banner(text, color=blue):
    line = "─" * (len(text) + 2)
    print()
    print(color(f"┌{line}┐"))
    print(color(f"│ {bold(text)} │"))
    print(color(f"└{line}┘"))


def ask(prompt: str, default: str = None, choices: list[str] = None) -> str:
    """Задать вопрос. choices — если хочется ограничить варианты."""
    suffix = ""
    if choices:
        suffix = f" [{'/'.join(choices)}]"
    if default:
        suffix += f" (default: {default})"
    while True:
        sys.stdout.write(cyan(f"❯ {prompt}{suffix}: "))
        sys.stdout.flush()
        ans = input().strip()
        if not ans and default:
            return default
        if choices and ans.lower() not in [c.lower() for c in choices]:
            print(red(f"  Выбери одно из: {choices}"))
            continue
        if ans:
            return ans


def ask_yn(prompt: str, default: bool = True) -> bool:
    suffix = "[Y/n]" if default else "[y/N]"
    while True:
        sys.stdout.write(cyan(f"❯ {prompt} {suffix}: "))
        sys.stdout.flush()
        ans = input().strip().lower()
        if not ans:
            return default
        if ans in ("y", "yes", "да", "д"):
            return True
        if ans in ("n", "no", "нет", "н"):
            return False


def ask_choice(prompt: str, options: list[tuple[str, str]]) -> str:
    """options = [(key, description), ...]. Возвращает key."""
    print(cyan(f"\n❯ {prompt}\n"))
    for i, (key, desc) in enumerate(options, 1):
        print(f"  {bold(str(i))}) {desc}")
    while True:
        sys.stdout.write(cyan(f"\nТвой выбор [1-{len(options)}]: "))
        sys.stdout.flush()
        ans = input().strip()
        try:
            idx = int(ans) - 1
            if 0 <= idx < len(options):
                return options[idx][0]
        except ValueError:
            pass
        print(red(f"Введи число от 1 до {len(options)}"))


def run(cmd: list[str], shell: bool = False, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """Запуск команды. Если check=False — игнорировать exit code. capture=True вернёт stdout."""
    pretty = " ".join(cmd) if isinstance(cmd, list) else cmd
    print(green(f"  $ {pretty}"))
    return subprocess.run(
        cmd, shell=shell, check=check,
        capture_output=capture, text=True,
    )


def has_command(name: str) -> bool:
    return shutil.which(name) is not None


# ─── Persona detection ──────────────────────────────────────────────────────


PERSONAS = [
    ("dictation", "🎤  Диктовка вместо клавиатуры (push-to-talk)\n     Жмёшь хоткей → говоришь → текст вставляется в любое поле"),
    ("transcribe", "📝  Транскрибировать видео/аудио файлы\n     Один файл, папка пакетно, или URL TikTok/YouTube"),
    ("podcast", "🎙  Подкасты и интервью с разметкой спикеров\n     Кто-кого-говорит, точные таймстэмпы"),
    ("subs", "🎬  Сабы для shorts / TikTok / Reels (CapCut-стиль)\n     Прямо вшитые в MP4 с подсветкой текущего слова"),
    ("everything", "🧰  Всё сразу — поставь полный комплект"),
]


# ─── Main flow ──────────────────────────────────────────────────────────────


def step_welcome():
    print()
    print(blue(r"  ╔══════════════════════════════════════════════════════╗"))
    print(blue(r"  ║                                                      ║"))
    print(blue(r"  ║   🎤  ") + bold("Whisper Stack — мастер настройки") + blue(r"            ║"))
    print(blue(r"  ║                                                      ║"))
    print(blue(r"  ║   Локальная транскрибация без OpenAI API.            ║"))
    print(blue(r"  ║   Бесплатно. Все языки. На любом железе.             ║"))
    print(blue(r"  ║                                                      ║"))
    print(blue(r"  ╚══════════════════════════════════════════════════════╝"))


def step_persona() -> str:
    banner("Шаг 1 из 5 — Что хочешь делать?", color=blue)
    return ask_choice("Выбери основной сценарий:", PERSONAS)


def step_detect():
    banner("Шаг 2 из 5 — Определяю твоё железо", color=blue)
    # Reuse detect_env
    try:
        from scripts.detect_env import detect_all, recommend, report
    except Exception as e:
        print(red(f"Не могу загрузить детектор: {e}"))
        sys.exit(1)
    env = detect_all()
    rec = recommend(env)

    # Compact summary
    print(f"  ОС:      {green(env.os_name)} {env.os_version}")
    print(f"  CPU:     {green(env.cpu_brand or '?')}")
    print(f"  RAM:     {green(f'{env.ram_gb} GB')}")
    if env.has_nvidia_gpu:
        print(f"  GPU:     {green(f'{env.nvidia_gpu_name} ({env.nvidia_vram_gb} GB VRAM)')}")
    elif env.has_apple_gpu:
        print(f"  GPU:     {green('Apple Metal')}")
    elif env.has_amd_gpu:
        print(f"  GPU:     {green(f'{env.amd_gpu_name} (AMD)')}")
    else:
        print(f"  GPU:     {yellow('нет — будет работать на CPU')}")
    print()
    print(f"  ➤ Бэкенд:  {bold(green(rec.backend))}")
    print(f"  ➤ Модель:  {bold(green(rec.model))}")
    print(f"  ➤ {dim(rec.rationale)}")
    return env, rec


def step_install_deps(env, rec, persona) -> bool:
    banner("Шаг 3 из 5 — Установка", color=blue)

    # Что нужно поставить, в зависимости от persona и rec
    pkgs = []

    # Core backend
    if rec.backend == "mlx-whisper":
        pkgs.append("mlx-whisper")
    elif rec.backend == "faster-whisper":
        pkgs.append("faster-whisper")
    elif rec.backend == "whisper-cpp":
        pass  # ставится через brew/apt отдельно
    elif rec.backend == "whisperx":
        pkgs.append("whisperx")

    # Per-persona extra
    if persona == "dictation":
        pkgs += ["sounddevice", "soundfile", "pynput", "pyperclip", "pystray", "Pillow", "numpy"]
    elif persona == "podcast":
        pkgs.append("whisperx")  # для diarization
    elif persona == "subs":
        # ничего сверху — bake_subs использует ffmpeg
        pass
    elif persona == "transcribe":
        pkgs.append("yt-dlp")
    elif persona == "everything":
        pkgs += [
            "yt-dlp", "whisperx",
            "sounddevice", "soundfile", "pynput", "pyperclip", "pystray", "Pillow", "numpy",
        ]

    # Dedup
    pkgs = sorted(set(pkgs))

    print(f"\nПлан:")
    if not env.ffmpeg_installed:
        print(f"  • Установить {bold('ffmpeg')} через системный пакет-менеджер")
    if rec.backend == "whisper-cpp":
        print(f"  • Поставить {bold('whisper-cpp')} (нативный binary)")
        print(f"  • Скачать модель {bold(rec.model)} (~1.6 GB)")
    if pkgs:
        print(f"  • pip install: {' '.join(bold(p) for p in pkgs)}")
        print(f"  • Скачать модель {bold(rec.model)} (~1.6 GB) при первом запуске")

    if not ask_yn("\nПродолжить установку?", default=True):
        print(yellow("Отменено. Запусти когда будешь готов."))
        return False

    # 1. Install ffmpeg if missing
    if not env.ffmpeg_installed:
        if env.os_name == "macOS":
            if has_command("brew"):
                run(["brew", "install", "ffmpeg"], check=False)
            else:
                print(red("\n❌ Homebrew не найден."))
                print(yellow("Установи Homebrew: https://brew.sh"))
                print(yellow("Потом запусти wizard ещё раз."))
                return False
        elif env.os_name in ("Linux", "WSL"):
            if has_command("apt"):
                run(["sudo", "apt", "install", "-y", "ffmpeg"], check=False)
            elif has_command("pacman"):
                run(["sudo", "pacman", "-S", "--noconfirm", "ffmpeg"], check=False)
            elif has_command("dnf"):
                run(["sudo", "dnf", "install", "-y", "ffmpeg-free"], check=False)
            else:
                print(yellow("Не нашёл пакетного менеджера. Поставь ffmpeg вручную."))
        elif env.os_name == "Windows":
            if has_command("winget"):
                run(["winget", "install", "Gyan.FFmpeg"], check=False)
            else:
                print(yellow("Поставь ffmpeg вручную: https://ffmpeg.org/download.html"))

    # 2. Install whisper-cpp if relevant
    if rec.backend == "whisper-cpp":
        if env.os_name == "macOS" and has_command("brew"):
            run(["brew", "install", "whisper-cpp"], check=False)
        elif env.os_name in ("Linux", "WSL"):
            print(yellow("Сборка whisper.cpp из исходников. Это может занять 2-5 минут."))
            if ask_yn("Продолжить?", default=True):
                run("git clone https://github.com/ggerganov/whisper.cpp.git", shell=True, check=False)
                run(["cmake", "-B", "whisper.cpp/build", "-S", "whisper.cpp"], check=False)
                run(["cmake", "--build", "whisper.cpp/build", "--config", "Release"], check=False)
                run(["bash", "whisper.cpp/models/download-ggml-model.sh", rec.model], check=False)
        else:
            print(yellow("Поставь whisper-cpp вручную, см. backends/whisper-cpp.md"))

    # 3. pip install
    if pkgs:
        # venv на месте?
        in_venv = (
            sys.prefix != sys.base_prefix
            or os.environ.get("VIRTUAL_ENV") is not None
        )
        if not in_venv:
            print()
            print(yellow("⚠ Ты не в venv (виртуальное окружение)."))
            print(yellow("  Я могу создать venv в .venv и поставить туда. Это правильный путь."))
            if ask_yn("Создать venv?", default=True):
                run([sys.executable, "-m", "venv", ".venv"], check=False)
                pip = str(Path(".venv/bin/pip" if os.name != "nt" else ".venv/Scripts/pip.exe"))
                run([pip, "install", "--upgrade", "pip"], check=False)
                run([pip, "install"] + pkgs, check=False)
                print()
                print(green("✓ Установлено в .venv/"))
                print(yellow(f"⚠ В дальнейшем активируй venv:"))
                if os.name == "nt":
                    print(f"   .venv\\Scripts\\activate")
                else:
                    print(f"   source .venv/bin/activate")
            else:
                print(yellow("Окей, ставлю в текущий Python (не рекомендую, но ладно)."))
                run([sys.executable, "-m", "pip", "install"] + pkgs, check=False)
        else:
            run([sys.executable, "-m", "pip", "install"] + pkgs, check=False)

    return True


def step_setup_persona(env, rec, persona):
    banner(f"Шаг 4 из 5 — Настройка под '{persona}'", color=blue)

    if persona == "dictation":
        print("Создаю конфиг для voice dictation...")
        run([sys.executable, "-m", "examples.voice_dictation", "--setup"], check=False)
        print()
        if env.os_name == "macOS":
            print(yellow("⚠ ВАЖНО: на macOS нужны permissions"))
            print(yellow("  System Settings → Privacy & Security → Microphone — добавить Terminal"))
            print(yellow("  System Settings → Privacy & Security → Accessibility — добавить Terminal"))
            print(yellow("  Перезапусти терминал после."))
            print()
            print("Подробно: docs/voice-dictation.md → секция 'Permissions'")
        elif env.os_name in ("Linux", "WSL"):
            print(yellow("⚠ На Wayland могут быть проблемы с глобальным хоткеем."))
            print(yellow("   Если не сработает — см. docs/voice-dictation.md"))
        elif env.os_name == "Windows":
            print(green("✓ Permissions: ничего не нужно настраивать."))
        print()
        print("Запуск:")
        print(green(f"  python -m examples.voice_dictation"))
        print(f"\nДефолтный хоткей: {bold('Ctrl+Shift+Space')}")

    elif persona == "podcast":
        print("Для разметки спикеров (diarization) нужен бесплатный Hugging Face token.")
        print()
        print("1. Регистрируйся: https://huggingface.co (если ещё не)")
        print("2. Создай токен:  https://huggingface.co/settings/tokens (тип Read)")
        print("3. Прими условия использования двух моделей:")
        print("   • https://huggingface.co/pyannote/speaker-diarization-3.1")
        print("   • https://huggingface.co/pyannote/segmentation-3.0")
        print()
        if ask_yn("Уже есть HF token?", default=False):
            token = ask("Вставь токен (начинается с hf_)", default="")
            if token.startswith("hf_"):
                shell_rc = (
                    Path.home() / ".zshrc" if env.os_name == "macOS"
                    else Path.home() / ".bashrc"
                )
                with shell_rc.open("a") as f:
                    f.write(f"\nexport HF_TOKEN={token}\n")
                print(green(f"✓ Записал в {shell_rc}"))
                print(yellow(f"  Перезапусти терминал чтобы применилось"))
            else:
                print(yellow("Не похоже на HF-токен. Пропускаю."))
        print()
        print("Запуск:")
        print(green(f"  python -m examples.podcast_diarize podcast.mp3 --speakers 2"))

    elif persona == "subs":
        print("Готово! Запуск:")
        print(green(f"  python -m examples.bake_subs input.mp4 --style tiktok --output ready.mp4"))
        print()
        print("Доступные стили: tiktok, youtube_shorts, reels, podcast_clip, minimal")

    elif persona == "transcribe":
        print("Готово! Запуски:")
        print(green(f"  python -m examples.transcribe_one input.mp3 --language ru"))
        print(green(f"  python -m examples.batch_folder ./videos/ --language ru"))
        print(green(f"  python -m examples.from_url 'https://www.tiktok.com/@user/video/123'"))

    elif persona == "everything":
        print("Все компоненты готовы. Используй любой example:")
        print(green(f"  python -m examples.transcribe_one    # один файл"))
        print(green(f"  python -m examples.batch_folder      # папка"))
        print(green(f"  python -m examples.from_url          # URL"))
        print(green(f"  python -m examples.podcast_diarize   # подкаст с дикторами"))
        print(green(f"  python -m examples.bake_subs         # сабы в MP4"))
        print(green(f"  python -m examples.voice_dictation   # диктовка"))


def step_test(env, rec, persona):
    banner("Шаг 5 из 5 — Smoke-test", color=blue)
    if not ask_yn("Прогнать тестовый запрос на 5-секундном тестовом аудио?", default=True):
        return

    # Создаём тестовый wav (5 sec речи через ffmpeg + sample)
    if not env.ffmpeg_installed and not has_command("ffmpeg"):
        print(yellow("ffmpeg не нашёлся — пропускаю smoke-test."))
        return

    tests_dir = Path("tests/samples")
    sample = tests_dir / "jfk.wav"
    if not sample.exists():
        tests_dir.mkdir(parents=True, exist_ok=True)
        print("Скачиваю sample (JFK speech, 11 сек, EN)...")
        try:
            run(["curl", "-fsSL", "-o", str(sample),
                 "https://github.com/ggerganov/whisper.cpp/raw/master/samples/jfk.wav"], check=False)
        except Exception as e:
            print(yellow(f"Скачать не получилось: {e}"))
            return

    print(f"\n→ Транскрибирую {sample}...")
    try:
        run([sys.executable, "-m", "examples.transcribe_one", str(sample), "--language", "en", "--format", "txt"], check=False)
    except Exception as e:
        print(red(f"Smoke-test упал: {e}"))
        print(yellow("Открой docs/known-issues.md"))
        return

    txt_path = sample.with_suffix(".txt")
    if txt_path.exists():
        print()
        print(green("✓ Smoke-test прошёл. Транскрипт:"))
        print(dim("─" * 40))
        print(txt_path.read_text())
        print(dim("─" * 40))


def step_done(persona):
    banner("✅ Готово!", color=green)
    print()
    print(green(f"Whisper Stack настроен под сценарий: {bold(persona)}"))
    print()
    print("Дальше:")
    print(f"  • Документация:  {dim('SKILL.md, README.md')}")
    print(f"  • Примеры:       {dim('examples/')}")
    print(f"  • Грабли:        {dim('docs/known-issues.md')}")
    print(f"  • Бенчмарки:     {dim('methodology/quality-vs-speed.md')}")
    print()


# ─── Main ───────────────────────────────────────────────────────────────────


def main():
    try:
        step_welcome()
        persona = step_persona()
        env, rec = step_detect()
        if not step_install_deps(env, rec, persona):
            return 1
        step_setup_persona(env, rec, persona)
        step_test(env, rec, persona)
        step_done(persona)
    except (KeyboardInterrupt, EOFError):
        print()
        print(yellow("Прервано пользователем."))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

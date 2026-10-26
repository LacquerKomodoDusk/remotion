#!/usr/bin/env bash
# Builds whisper-cli and downloads a SHA1-verified ggml model.
set -euo pipefail

MODEL="${1:-small}"
ROOT="$HOME/.cache/whisper-skill"
SRC="$ROOT/whisper.cpp"
MODELS="$ROOT/models"
DEST="$MODELS/ggml-$MODEL.bin"
TAG="v1.8.2"

# SHA1 values from ggml-org/whisper.cpp models/README.md
declare -A SHA1=(
	[tiny]=bd577a113a864445d4c299885e0cb97d4ba92b5f
	[base]=465707469ff3a37a2b9b8d8f89f2f99de7299dac
	[small]=55356645c2b361a969dfd0ef2c5a50d530afd8d5
	[medium]=fd9727b6e1217c2f614f9b698455c4ffd82463b4
	[large-v3-turbo]=4af2b29d7ec73d781377bfd1758ca957a807e941
	[large-v3]=ad82bf6a9043ceed055076d0fd39f5f186ff8062
)
# Third-party GitHub release mirrors, used only if Hugging Face is unreachable.
declare -A MIRRORS=(
	[small]="https://github.com/Anhelter/whspr/releases/download/v1.0.0/ggml-small.bin"
)

if [[ -z "${SHA1[$MODEL]:-}" ]]; then
	echo "Unknown model '$MODEL'. Known: ${!SHA1[*]}" >&2
	exit 1
fi

mkdir -p "$ROOT" "$MODELS"

if [[ ! -x "$SRC/build/bin/whisper-cli" ]]; then
	[[ -d "$SRC" ]] || git clone -q --depth 1 --branch "$TAG" https://github.com/ggml-org/whisper.cpp "$SRC"
	cmake -S "$SRC" -B "$SRC/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF >/dev/null
	cmake --build "$SRC/build" -j"$(nproc)" --target whisper-cli >/dev/null
fi
echo "whisper-cli: $SRC/build/bin/whisper-cli"

verify() {
	[[ "$(sha1sum "$1" | cut -d' ' -f1)" == "${SHA1[$MODEL]}" ]]
}

if [[ -f "$DEST" ]] && verify "$DEST"; then
	echo "model: $DEST (cached)"
	exit 0
fi

if [[ -n "${WHISPER_MODEL_PATH:-}" ]]; then
	cp "$WHISPER_MODEL_PATH" "$DEST.part"
	if verify "$DEST.part"; then
		mv "$DEST.part" "$DEST"
		echo "model: $DEST (from WHISPER_MODEL_PATH)"
		exit 0
	fi
	rm -f "$DEST.part"
	echo "WHISPER_MODEL_PATH does not match the official SHA1 for '$MODEL'" >&2
	exit 1
fi

for url in "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$MODEL.bin" ${MIRRORS[$MODEL]:-}; do
	echo "trying $url"
	if curl -fL --retry 2 -m 1800 -o "$DEST.part" "$url"; then
		if verify "$DEST.part"; then
			mv "$DEST.part" "$DEST"
			echo "model: $DEST"
			exit 0
		fi
		echo "SHA1 mismatch, discarding $url" >&2
	fi
	rm -f "$DEST.part"
done

echo "No model source reachable. Ask the user for ggml-$MODEL.bin and rerun with WHISPER_MODEL_PATH=<file>." >&2
exit 1

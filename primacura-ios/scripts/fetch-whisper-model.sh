#!/bin/sh
# Download the on-device speech model that ships inside the iOS app.
# Run once from primacura-ios/ before building:  sh scripts/fetch-whisper-model.sh
set -eu

MODEL="ggml-base-q5_1.bin"
URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL}"
DEST="assets/models/${MODEL}"

mkdir -p assets/models
if [ -s "$DEST" ]; then
  echo "Already present: $DEST"
  exit 0
fi

echo "Downloading $MODEL (~57 MB)..."
curl -L --fail --progress-bar -o "$DEST.part" "$URL"
mv "$DEST.part" "$DEST"
echo "Saved $DEST"

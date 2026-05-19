#!/bin/bash
set -e
cd "$(dirname "$0")/../engine"

echo "Setting up Python engine..."

if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

uv venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"

echo "Downloading faster-whisper model (large-v3-turbo)..."
python -c "from faster_whisper import WhisperModel; WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')"

echo "Engine setup complete!"

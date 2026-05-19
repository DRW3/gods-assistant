#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Start Python engine
echo "Starting Python engine..."
cd engine && source .venv/bin/activate && python main.py &
ENGINE_PID=$!

# Start Electron + Vite
echo "Starting Electron..."
cd .. && npm run dev:electron &
ELECTRON_PID=$!

trap "kill $ENGINE_PID $ELECTRON_PID 2>/dev/null" EXIT
wait

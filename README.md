# God's Assistant

A voice-controlled desktop AI assistant with a claymorphic Midnight Emerald UI. Speak or type commands — it pipes to Claude Code, streams every action live, and speaks the results.

## What it does

- **Voice input** — hold SPACE to speak, release to process
- **Text input** — type and Enter
- **Activity Stream** — see every Claude action live (thinking, reading files, running commands, writing code)
- **Smart routing** — simple questions go through Groq (238ms), complex tasks through Claude Code
- **Effort selector** — Auto / Fast / Balanced / Max
- **Voice responses** — TTS speaks results for voice commands
- **Session continuity** — Claude remembers context across commands

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 35 |
| UI | React 19, TypeScript, Zustand |
| Theme | Midnight Emerald claymorphic (Bricolage Grotesque + Geist Mono) |
| STT | faster-whisper (local, large-v3-turbo) |
| TTS | Kokoro (local, CPU) |
| LLM routing | Groq 8B (intent classification) |
| LLM fast | Groq 70B (chat responses, 238ms) |
| LLM brain | Claude Code CLI (`claude -p --output-format stream-json`) |

## Setup

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/gods-assistant.git
cd gods-assistant

# 2. Install Node deps
npm install

# 3. Install Python engine
cd engine
python3 -m venv .venv
source .venv/bin/activate
pip install faster-whisper kokoro soundfile groq websockets numpy

# 4. Set your Groq API key
echo "GROQ_API_KEY=your_key_here" > ../.env

# 5. Build Electron
cd ..
npx tsc -p tsconfig.electron.json
```

## Run

```bash
# Terminal 1: Python engine
cd engine && source .venv/bin/activate && python main.py

# Terminal 2: Vite dev server
npx vite --port 5173

# Terminal 3: Electron
NODE_ENV=development npx electron dist-electron/main.js
```

Or use the dev script: `bash scripts/dev.sh`

## Usage

| Action | Shortcut |
|---|---|
| Summon overlay | `Cmd+Shift+G` |
| Push-to-talk | Hold `SPACE` |
| Dismiss | `ESC` or `O` then `G` |
| Type command | Click input, type, `Enter` |
| Change effort | Click Auto/Fast/Balanced/Max pills |

## Effort Levels

| Level | Routing | Speed |
|---|---|---|
| Auto | Groq classifies, routes smart | Variable |
| Fast | Groq only, never Claude | ~200ms |
| Balanced | Groq for chat, Claude for tools | Variable |
| Max | Claude Code always | 5-15s |

## Activity Stream Events

The overlay shows every Claude Code action in real-time:

| Icon | Event | What it shows |
|---|---|---|
| 🧠 | Thinking | Claude's reasoning |
| 📖 | Read | File being read |
| ✍️ | Write | New file created |
| ✏️ | Edit | File modified |
| $_ | Bash | Command + output |
| 🔎 | Glob | File search |
| ⊕ | Grep | Content search |
| 🔍 | WebSearch | Web search |
| 🌐 | WebFetch | URL fetch |
| 🤖 | Agent | Subagent spawned |
| ⚡ | Skill | Skill invoked |
| 🔌 | MCP | External tool |
| ✓ | Done | Complete |
| ✗ | Error | Failed |

## License

MIT

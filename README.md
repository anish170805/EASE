# Eera — Cinematic Intelligence & Voice Sales OS

Eera is a state-of-the-art AI Voice Sales Assistant designed to capture, qualify, and manage leads with futuristic precision. Built by **Zenx AI**, Eera combines low-latency voice interaction with intelligent reasoning to provide a premium, human-like sales experience.

![Eera OS](https://img.shields.io/badge/Eera_OS-Active-00F5FF?style=for-the-badge&logo=livekit&logoColor=white)
![Stack](https://img.shields.io/badge/Stack-Python_|_Next.js_|_LangGraph-black?style=for-the-badge)

## 🌌 Overview

Eera isn't just a voice bot; it's a "Cinematic Intelligence" experience. It uses a high-end, glassmorphic interface to engage users in real-time conversations, extract project requirements, and instantly compute lead scores using advanced LLM reasoning.

### Key Capabilities:
- **🎙️ Real-time Voice Interaction**: Powered by LiveKit and Deepgram for sub-second latency.
- **🧠 LangGraph Reasoning**: Orchestrates complex conversation flows, ensuring all necessary lead data is captured naturally.
- **📊 Lead Intelligence Dashboard**: A sophisticated frontend for viewing captured leads, their priority levels, and AI-generated scores.
- **🔍 Deep Lead Insights**: Dedicated detail screens for each lead, providing a read-only look into their requirements and contact details.
- **💾 Hybrid Persistence**: Real-time syncing with **Supabase** with a resilient local JSON fallback.

---

## 🛠️ Technology Stack

### Backend (The Brain)
- **Python 3.11+**: Core logic.
- **LiveKit Agents SDK**: Real-time audio orchestration.
- **LangGraph**: Stateful, multi-turn conversation logic.
- **Groq (Llama 3)**: High-speed LLM for natural conversation and extraction.
- **Deepgram**: Fast, accurate STT (Speech-to-Text).
- **FastAPI**: Serving the leads intelligence and token endpoints.
- **Supabase**: Cloud database for lead persistence.

### Frontend (The Interface)
- **Next.js 16**: Modern, high-performance web framework.
- **LiveKit Components**: Real-time audio hooks and participants management.
- **Vanilla CSS (Glassmorphism)**: Custom-built, futuristic UI without bloated frameworks.
- **Framer Motion & CSS Animations**: Fluid, cinematic transitions.

---

## 📂 Project Structure

```bash
voice-agent/
├── backend/
│   ├── nodes/              # LangGraph conversation nodes
│   ├── services/           # Supabase & Local storage logic
│   ├── utils/              # Lead schemas & scoring utilities
│   ├── agent.py            # LiveKit Voice Agent entry point
│   └── token_server.py     # FastAPI Server for Frontend API
└── frontend/
    ├── src/app/
    │   ├── leads/          # Intelligence Dashboard
    │   │   └── [id]/       # Lead Detail View (Read-Only)
    │   └── page.tsx        # Voice Assistant Interface
    └── src/components/     # Futuristic UI Components (VoiceOrb, NavRail, etc.)
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

**Run the Backend Services:**
- **Terminal 1 (Voice Agent):** `python agent.py dev`
- **Terminal 2 (API Server):** `python token_server.py`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:3000` to interact with Eera.

---

## ⚙️ Configuration

### Backend `.env`
| Variable | Description |
| :--- | :--- |
| `LIVEKIT_URL` | Your LiveKit Project URL |
| `LIVEKIT_API_KEY` | LiveKit API Key |
| `LIVEKIT_API_SECRET` | LiveKit API Secret |
| `GROQ_API_KEY` | Groq Cloud API Key |
| `DEEPGRAM_API_KEY` | Deepgram API Key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_KEY` | Supabase Service Role/Anon Key |

### Frontend `.env.local`
- `NEXT_PUBLIC_BACKEND_URL`: `http://localhost:8000` (pointing to FastAPI)

---

## 📈 Lead Intelligence System

The Lead Intelligence system is accessible at `/leads`. It provides:
1. **Real-time Sync**: Automatically fetches data from Supabase.
2. **Priority Pip**: Visual indicator of lead urgency (High/Med/Low).
3. **Score Gauge**: Circular indicator of the lead's quality (0-100).
4. **Detail View**: Click any row to view the full extracted requirements in a cinematic read-only layout.

---

© 2026 Zenx AI — Built for the future of sales.

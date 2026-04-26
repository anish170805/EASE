# Eera — AI Voice Sales Agent by Zenx

## Structure
```
voice-agent/
├── backend/    # Python: LiveKit agent, LangGraph, Supabase, FastAPI
└── frontend/   # Next.js: voice UI
```

## Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Copy and fill in your keys
cp .env.example .env

# Terminal 1 — LiveKit agent
python agent.py dev

# Terminal 2 — Token + leads API (port 8000)
python token_server.py
```

## Frontend setup
```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

## Environment variables

### backend/.env
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GROQ_API_KEY=...
DEEPGRAM_API_KEY=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=...
```

### frontend/.env.local
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

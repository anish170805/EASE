# Eera - AI Voice Lead Qualification System

Eera is a real-time voice sales assistant that captures, qualifies, and stores leads through natural conversation.

It combines LiveKit audio streaming, Deepgram STT/TTS, LangGraph state orchestration, Groq LLM reasoning, and a Next.js dashboard.

## What It Does
- Runs a live voice conversation with a prospect
- Extracts structured lead fields turn-by-turn
- Handles FAQs and follow-up questions naturally
- Scores priority from budget/service/timeline/contact completeness
- Persists leads to local JSON and Supabase
- Shows all captured leads in a dashboard with detail pages

## Tech Stack
- Backend: Python, LiveKit Agents, LangGraph, LangChain Groq, FastAPI, Supabase SDK
- Frontend: Next.js (App Router), React, livekit-client
- Realtime: Deepgram STT + TTS, Silero VAD
- LLM: Groq `llama-3.3-70b-versatile` (extraction + response generation)

## High-Level Architecture
```mermaid
flowchart LR
    U["User (Voice/Text)"] --> F["Frontend (Next.js)"]
    F -->|GET /token| API["FastAPI token_server"]
    API --> LK["LiveKit Cloud Room"]
    U -->|Voice| LK
    LK --> A["GraphAgent (backend/agent.py)"]
    A --> STT["Deepgram STT"]
    A --> TTS["Deepgram TTS"]
    A --> G["LangGraph Workflow"]
    G --> LLM["Groq LLM"]
    G --> SAVE["Lead Storage Service"]
    SAVE --> JSON["backend/leads.json"]
    SAVE --> SB["Supabase leads table"]
    API -->|GET /leads, /leads/:id| F

    classDef user fill:#1f2937,stroke:#94a3b8,color:#ffffff,stroke-width:2px;
    classDef frontend fill:#0f172a,stroke:#22d3ee,color:#e6fffb,stroke-width:2px;
    classDef backend fill:#3f1d66,stroke:#c084fc,color:#ffffff,stroke-width:2px;
    classDef ai fill:#064e3b,stroke:#34d399,color:#ecfeff,stroke-width:2px;
    classDef data fill:#5b2c06,stroke:#fbbf24,color:#fff7ed,stroke-width:2px;

    class U user;
    class F frontend;
    class API,LK,A,G backend;
    class STT,TTS,LLM ai;
    class SAVE,JSON,SB data;
```

## Agent Working (LangGraph Runtime)
```mermaid
flowchart TD
    START(["START"]) --> UT["unified_turn"]
    UT -->|"next_node = done"| UH["update_history"]
    UT -->|"next_node = closing"| CL["closing"]
    CL -->|"next_node = done"| UH
    UH --> END(["END"])

    subgraph UTX["Inside unified_turn"]
      U1["Rule check: contact refusal phrases"] --> U2["LLM Call 1: field extraction JSON"]
      U2 --> U3["Validation: name/budget/timeline/contact"]
      U3 --> U4["Merge into lead_data"]
      U4 --> U5{"All required fields collected?"}
      U5 -->|Yes| U6["Route to closing (no response yet)"]
      U5 -->|No| U7["LLM Call 2: natural response + next question"]
    end

    subgraph CLX["Inside closing"]
      C1["If first entry: calculate priority + save lead"] --> C2["LLM summary confirmation"]
      C2 --> C3{"User confirms?"}
      C3 -->|No| C4["Reset closing_stage and resume collection"]
      C3 -->|Yes| C5["Ask: anything else?"]
      C5 --> C6{"User says no?"}
      C6 -->|Yes| C7["Final goodbye + mark done"]
      C6 -->|No| C8["LLM follow-up answer and keep asking_else"]
    end

    classDef phase fill:#0b1020,stroke:#38bdf8,color:#e2e8f0,stroke-width:2px;
    classDef llm fill:#134e4a,stroke:#2dd4bf,color:#ecfeff,stroke-width:2px;
    classDef persist fill:#4c1d95,stroke:#c4b5fd,color:#f5f3ff,stroke-width:2px;
    classDef decision fill:#713f12,stroke:#f59e0b,color:#fffbeb,stroke-width:2px;
    classDef terminal fill:#7f1d1d,stroke:#fb7185,color:#fff1f2,stroke-width:2px;

    class START,END terminal;
    class UT,CL,UH,U1,U3,U4,C4,C5,C7 phase;
    class U2,U7,C2,C8 llm;
    class C1 persist;
    class U5,C3,C6 decision;
```

## Voice Call Sequence (Realtime)
```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend
    participant API as token_server
    participant LK as LiveKit Room
    participant Agent as GraphAgent
    participant Graph as LangGraph

    User->>FE: Click Connect
    FE->>API: GET /token
    API-->>FE: JWT + LiveKit URL
    FE->>LK: connect(url, token)
    Agent->>User: Greeting via TTS
    User->>LK: Speech
    LK->>Agent: Final transcript event
    Agent->>Graph: ainvoke(state)
    Graph-->>Agent: agent_response + next state
    Agent->>LK: Assistant audio/text
    LK-->>FE: Remote audio playback
    Note over Agent,Graph: repeats until closing_stage == done
```

## Lead Scoring Model
- `budget` up to 40 points
- `service` up to 30 points
- `timeline` up to 20 points
- `contact present` 10 points

```mermaid
flowchart LR
    B["Budget (0-40)"] --> T["Total Score (0-100)"]
    S["Service (0-30)"] --> T
    TL["Timeline (0-20)"] --> T
    C["Contact (0/10)"] --> T
    T --> P{"Priority"}
    P --> H["High: >= 65"]
    P --> M["Medium: 35-64"]
    P --> L["Low: < 35"]

    classDef metric fill:#082f49,stroke:#38bdf8,color:#f0f9ff,stroke-width:2px;
    classDef total fill:#14532d,stroke:#4ade80,color:#ecfdf5,stroke-width:2px;
    classDef out fill:#4a044e,stroke:#e879f9,color:#fdf4ff,stroke-width:2px;
    classDef split fill:#7c2d12,stroke:#fb923c,color:#fff7ed,stroke-width:2px;
    class B,S,TL,C metric;
    class T total;
    class P split;
    class H,M,L out;
```

## API Endpoints
- `GET /token`: returns LiveKit access token + room data
- `GET /leads`: fetches leads (Supabase first, JSON fallback)
- `GET /leads/{lead_id}`: fetches single lead by ID
- `POST /chat`: text-based session chat using same LangGraph flow
- `DELETE /chat/{session_id}`: clears in-memory text session

## Project Structure
```text
voice-agent/
|-- backend/
|   |-- agent.py                     # Live voice GraphAgent worker
|   |-- token_server.py              # FastAPI API for token/leads/chat
|   |-- graph.py                     # LangGraph wiring
|   |-- state.py                     # Agent state TypedDict
|   |-- nodes/
|   |   |-- unified_turn.py          # Main conversational brain
|   |   |-- closing.py               # Confirmation + closure loop
|   |   |-- finalize_lead.py         # Scoring + priority logic
|   |   `-- ...
|   |-- services/
|   |   |-- llm.py                   # Groq model client
|   |   |-- lead_storage.py          # JSON + Supabase dual-write
|   |   `-- supabase_storage.py
|   `-- utils/lead_schema.py         # Lead schema + missing-field logic
|
`-- frontend/
    |-- src/app/page.tsx             # Voice call UI
    |-- src/app/leads/page.tsx       # Leads dashboard
    |-- src/app/leads/[id]/page.tsx  # Lead detail page
    `-- src/components/              # TopBar, VoiceOrb, EndCallButton, etc.
```

## Setup
### 1) Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Start services:
```bash
python token_server.py
python agent.py dev
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables
Backend `.env`:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GROQ_API_KEY`
- `DEEPGRAM_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

Frontend `.env.local`:
- `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8000`)

## Notes
- Current LangGraph uses `unified_turn -> (closing|update_history)` as active path.
- Lead storage is fault-tolerant: JSON saves even if Supabase fails.

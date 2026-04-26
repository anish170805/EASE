"""
token_server.py
---------------
1. Issues LiveKit JWT tokens for the React frontend
2. Serves leads data (Supabase → leads.json fallback)
3. /chat endpoint for text-based agent interaction
"""

import json
import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit.api import AccessToken, VideoGrants
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Make backend root importable
sys.path.insert(0, os.path.dirname(__file__))

LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL        = os.getenv("LIVEKIT_URL")
LEADS_FILE         = os.path.join(os.path.dirname(__file__), "leads.json")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory session store for text chat ──────────────────────────────────
# { session_id: agent_state_dict }
_text_sessions: dict = {}

def _new_state() -> dict:
    return {
        "user_text":            "",
        "lead_data":            {},
        "extracted_fields":     {},
        "conversation_history": [],
        "agent_response":       "",
        "next_node":            "done",
        "closing_stage":        "",
        "stt_buffer":           "",
        "contact_refused":      False,
    }

# Lazy-load graph so token_server starts even if graph has import issues
_graph = None
def _get_graph():
    global _graph
    if _graph is None:
        from graph import build_graph
        _graph = build_graph()
    return _graph


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/token")
def get_token(room: str = "sales-room", identity: str = "user"):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit credentials not set")
    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(VideoGrants(room_join=True, room=room))
        .to_jwt()
    )
    return {"token": token, "url": LIVEKIT_URL, "room": room}


@app.get("/leads")
def get_leads():
    try:
        from services.supabase_storage import get_all_leads_supabase
        leads = get_all_leads_supabase()
        if leads:
            return leads
    except Exception:
        pass
    if not os.path.exists(LEADS_FILE):
        return []
    try:
        with open(LEADS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    response: str
    done: bool        # True when closing_stage == "done"
    session_id: str


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Text-based agent endpoint. Maintains session state in memory."""
    sid = req.session_id

    # Init session if new
    if sid not in _text_sessions:
        _text_sessions[sid] = _new_state()
        # Return greeting immediately without invoking graph
        greeting = "Hi, I'm Eera from Zenx. How can I help you today?"
        _text_sessions[sid]["conversation_history"].append({
            "user": "", "agent": greeting
        })
        return ChatResponse(response=greeting, done=False, session_id=sid)

    state = _text_sessions[sid]

    # If already done, ignore further messages
    if state.get("closing_stage") == "done":
        return ChatResponse(
            response="The session has ended. Please start a new chat.",
            done=True,
            session_id=sid,
        )

    state["user_text"] = req.message.strip()

    try:
        graph = _get_graph()
        result = await graph.ainvoke(state)
        state.update(result)
    except Exception as e:
        return ChatResponse(
            response="Sorry, something went wrong. Could you repeat that?",
            done=False,
            session_id=sid,
        )

    response = state.get("agent_response", "").strip()
    state["agent_response"] = ""
    done = state.get("closing_stage") == "done"

    return ChatResponse(response=response, done=done, session_id=sid)


@app.delete("/chat/{session_id}")
def clear_session(session_id: str):
    """Clear a text chat session."""
    _text_sessions.pop(session_id, None)
    return {"cleared": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("token_server:app", host="0.0.0.0", port=8000, reload=True)

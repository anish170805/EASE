"""
token_server.py
---------------
Lightweight FastAPI server that:
  1. Issues LiveKit JWT tokens for the React frontend
  2. Serves leads data for the dashboard (from Supabase, falls back to leads.json)
  3. Handles CORS so the React dev server can talk to it

Run with:
    pip install fastapi uvicorn livekit
    python token_server.py
"""

import json
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit.api import AccessToken, VideoGrants
from dotenv import load_dotenv

load_dotenv()

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


@app.get("/token")
def get_token(room: str = "sales-room", identity: str = "user"):
    """Return a short-lived LiveKit token for the given room + identity."""
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
    """Return all captured leads — Supabase first, fallback to leads.json."""
    try:
        from services.supabase_storage import get_all_leads_supabase
        leads = get_all_leads_supabase()
        if leads:
            return leads
    except Exception:
        pass

    # Fallback: local JSON
    if not os.path.exists(LEADS_FILE):
        return []
    try:
        with open(LEADS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("token_server:app", host="0.0.0.0", port=8000, reload=True)

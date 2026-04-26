import os
from typing import Dict, Any

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(url, key)
    return _client


def save_lead_supabase(record: Dict[str, Any]) -> None:
    """
    Insert a lead record into the Supabase `leads` table.
    `record` is the same dict returned by lead_storage.save_lead().
    Errors are logged but NOT re-raised — JSON fallback still works.
    """
    try:
        client = _get_client()
        resp = client.table("leads").insert(record).execute()
        print(f"[Supabase] Lead inserted, id={resp.data[0].get('id') if resp.data else '?'}")
    except Exception as e:
        print(f"[Supabase] ERROR saving lead: {e}")


def get_all_leads_supabase() -> list:
    """Fetch all leads from Supabase ordered by captured_at desc."""
    try:
        client = _get_client()
        resp = client.table("leads").select("*").order("captured_at", desc=True).execute()
        return resp.data or []
    except Exception as e:
        print(f"[Supabase] ERROR fetching leads: {e}")
        return []


def get_lead_by_id_supabase(lead_id: str) -> Dict[str, Any] | None:
    """Fetch a single lead from Supabase by ID."""
    try:
        client = _get_client()
        resp = client.table("leads").select("*").eq("id", lead_id).single().execute()
        return resp.data
    except Exception as e:
        print(f"[Supabase] ERROR fetching lead {lead_id}: {e}")
        return None
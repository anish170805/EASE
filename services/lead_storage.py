"""
lead_storage.py
---------------
Handles persisting captured lead data to a local JSON file (leads.json).

Each lead is stored as a JSON object with all LeadSchema fields plus a
computed `lead_score` (0–100) and a `captured_at` ISO timestamp.

Lead Score Breakdown (100 pts total):
  - name present         : 10 pts
  - company present      : 10 pts
  - service present      : 15 pts
  - budget present       : 20 pts
  - timeline present     : 15 pts
  - contact present      : 20 pts
  - priority = high      : 10 pts  (or medium = 5, low = 0)
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, Any

from utils.lead_schema import LeadSchema, LeadPriority


# Path to the JSON file that stores all leads
LEADS_FILE = os.path.join(os.path.dirname(__file__), "..", "leads.json")


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_lead_score(lead: LeadSchema) -> int:
    """
    Returns an integer score from 0 to 100 reflecting lead completeness
    and priority.
    """
    score = 0

    if lead.name:
        score += 10
    if lead.company:
        score += 10
    if lead.service:
        score += 15
    if lead.budget:
        score += 20
    if lead.timeline:
        score += 15
    if lead.contact:
        score += 20

    if lead.priority == LeadPriority.HIGH:
        score += 10
    elif lead.priority == LeadPriority.MEDIUM:
        score += 5
    # LOW adds 0

    return score


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def _load_leads() -> list:
    """Load existing leads from the JSON file, returning an empty list if the
    file doesn't exist or is corrupted."""
    if not os.path.exists(LEADS_FILE):
        return []
    try:
        with open(LEADS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_leads(leads: list) -> None:
    """Write the full leads list back to the JSON file."""
    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_lead(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a complete lead record from `lead_data`, compute its score,
    append it to leads.json, and return the saved record.

    Parameters
    ----------
    lead_data : dict
        The raw lead dict from AgentState (mirrors LeadSchema fields).

    Returns
    -------
    dict
        The full lead record that was persisted, including `lead_score`
        and `captured_at`.
    """
    # Parse through LeadSchema so defaults / validation are applied
    lead = LeadSchema(**lead_data)

    score = compute_lead_score(lead)

    record = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "lead_score": score,
        # Core fields — use .value for enums so JSON is plain strings
        "name": lead.name,
        "company": lead.company,
        "service": lead.service,
        "budget": lead.budget,
        "timeline": lead.timeline,
        "contact": lead.contact,
        "priority": lead.priority.value if lead.priority else None,
    }

    leads = _load_leads()
    leads.append(record)
    _save_leads(leads)

    print(f"\n--- LEAD SAVED (score: {score}/100) ---")
    print(json.dumps(record, indent=2))
    print("---------------------------------------\n")

    return record


def get_all_leads() -> list:
    """Return all stored leads as a list of dicts."""
    return _load_leads()

"""
lead_storage.py
---------------
Persists lead data to leads.json.

lead_score breakdown (100 pts) — completeness + priority signal:
  budget present + tier   : 0-40 pts  (mirrors finalize_lead weight)
  service present + tier  : 0-30 pts
  timeline present + tier : 0-20 pts
  contact present         : 10 pts
  ─────────────────────────────────
  Total                   : 100 pts max
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, Any

from utils.lead_schema import LeadSchema, LeadPriority
from nodes.finalize_lead import _budget_score, _service_score, _timeline_score

LEADS_FILE = os.path.join(os.path.dirname(__file__), "..", "leads.json")


def compute_lead_score(lead: LeadSchema) -> int:
    """
    Weighted completeness + quality score out of 100.
    Uses the same scoring functions as calculate_priority() for consistency.
    """
    return (
        _budget_score(lead.budget or "")
        + _service_score(lead.service or "")
        + _timeline_score(lead.timeline or "")
        + (10 if lead.contact else 0)
    )


def _load_leads() -> list:
    if not os.path.exists(LEADS_FILE):
        return []
    try:
        with open(LEADS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_leads(leads: list) -> None:
    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)


def save_lead(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    lead  = LeadSchema(**lead_data)
    score = compute_lead_score(lead)

    record = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "lead_score":  score,
        "priority":    lead.priority.value if lead.priority else None,
        "name":        lead.name,
        "company":     lead.company,
        "service":     lead.service,
        "budget":      lead.budget,
        "timeline":    lead.timeline,
        "contact":     lead.contact,
    }

    leads = _load_leads()
    leads.append(record)
    _save_leads(leads)

    print(f"\n--- LEAD SAVED (score: {score}/100, priority: {record['priority']}) ---")
    print(json.dumps(record, indent=2))
    print("-------------------------------------------------------------\n")

    return record


def get_all_leads() -> list:
    return _load_leads()

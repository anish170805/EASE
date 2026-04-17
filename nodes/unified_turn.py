"""
unified_turn.py
---------------
Single LLM call per user turn: extracts fields, generates response, determines next step.

Fixes applied
-------------
Bug 4: extraction is scoped to the LATEST USER MESSAGE only — history is
       used as read-only context but the LLM is explicitly told not to
       re-extract from it.
Bug 5: merge loop guards `if value` (falsy check) not just `if value is not None`,
       so empty strings from a hallucinating LLM can't overwrite valid data.
Bug 7: COLLECTED fields are injected as a machine-readable FORBIDDEN list so
       even a small LLM can't accidentally ask for them.
"""

import json
import re
from state import AgentState
from services.llm import llm
from utils.lead_schema import LeadSchema, get_missing_fields


CONTACT_INTENT_PHRASES = [
    "you can email me", "email me", "you can reach me", "reach me at",
    "contact me", "my email", "my phone", "call me", "send me",
    "you can call", "here is my", "here's my",
]

# Human-readable question hints for each missing field
FIELD_QUESTIONS = {
    "name":     "their first name",
    "company":  "the company or organisation they represent",
    "service":  "what they want built (website, e-commerce, CRM/ERP, AI automation, or mobile app)",
    "budget":   "their approximate budget range for the project",
    "timeline": "when they need the project delivered",
    "contact":  "their email address or phone number for follow-up",
}

SYSTEM = """\
You are Eera, a professional sales assistant from Zenx on a real-time voice call.
Your only job is to collect the information listed in STILL MISSING and qualify the lead.

━━━ STRICT RULES ━━━
1. ALWAYS acknowledge what the user just said in 1 short sentence before asking anything.
2. Your next question MUST be about the first item in STILL MISSING — nothing else.
   Do NOT ask about role, department, team size, industry, or anything not in STILL MISSING.
3. NEVER ask for a field that appears in COLLECTED or FORBIDDEN QUESTIONS.
4. Ask ONE question only. Keep the total reply to 2 short sentences maximum.
5. Sound natural and warm — not like a form.
6. If the user signals contact intent ("you can email me") without giving the address,
   ask specifically: "Sure, what's the best email or number to reach you?"

━━━ EXTRACTION RULES ━━━
- Extract ONLY from LATEST USER MESSAGE — do NOT re-extract from CONVERSATION HISTORY.
- Set a field to null unless the user EXPLICITLY states it in the LATEST message.
- Never guess or infer. Never extract from previous turns.

━━━ ABOUT ZENX ━━━
Zenx builds: websites, e-commerce stores, CRM/ERP software, AI automation, mobile apps.
Pricing depends on scope — quotes given after a full discussion.

━━━ OUTPUT FORMAT ━━━
Respond with ONLY this JSON object — no markdown, no extra text:
{
  "extracted": {
    "name": null,
    "company": null,
    "service": null,
    "budget": null,
    "timeline": null,
    "contact": null
  },
  "intent": "collecting",
  "response": "Eera's spoken reply here"
}

Field rules:
- "extracted": set ONLY fields explicitly stated in LATEST USER MESSAGE (null for everything else)
- "intent": "collecting" always unless user asks a general question about Zenx/pricing ("answering")
- "response": acknowledge first, then ask about the FIRST item in STILL MISSING
"""


def _parse_json_response(raw: str) -> dict:
    """Robustly extract the JSON block from LLM output."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def unified_turn(state: AgentState) -> dict:
    user_text     = state.get("user_text", "").strip()
    lead_data     = dict(state.get("lead_data", {}))
    history       = state.get("conversation_history", [])
    closing_stage = state.get("closing_stage", "")

    # Already in closing flow — hand off immediately
    if closing_stage in ("confirming", "asking_else", "done"):
        return {"next_node": "closing"}

    # ── Conversation history (last 4 turns — read-only context, NOT for extraction) ─
    recent = history[-4:] if len(history) > 4 else history
    history_text = "\n".join(
        f"User: {h['user']}\nEera: {h['agent']}" for h in recent
    ) if recent else "None"

    # ── Determine what's missing ──────────────────────────────────────────────
    lead    = LeadSchema(**lead_data)
    missing = get_missing_fields(lead)

    if not missing:
        # All fields collected — go straight to closing
        return {
            "lead_data":        lead_data,
            "extracted_fields": {},
            "agent_response":   "",
            "next_node":        "closing",
        }

    # Build a clear, ordered list of what still needs to be collected
    missing_lines = "\n".join(
        f"  {i+1}. {f} — {FIELD_QUESTIONS[f]}"
        for i, f in enumerate(missing)
    )

    # FIX Bug 7: machine-readable FORBIDDEN list derived from already-collected keys
    collected_keys = [k for k, v in lead_data.items() if v]
    if collected_keys:
        forbidden_block = (
            "FORBIDDEN QUESTIONS — you already have these, NEVER ask for them again:\n"
            + "\n".join(f"  - {k} = {lead_data[k]}" for k in collected_keys)
        )
    else:
        forbidden_block = "FORBIDDEN QUESTIONS: none yet"

    # Contact intent hint
    lower = user_text.lower()
    contact_hint = ""
    if any(p in lower for p in CONTACT_INTENT_PHRASES) and "contact" in missing:
        contact_hint = (
            "\n⚠ IMPORTANT: User signalled they want to share contact info "
            "but gave no address yet. Ask for their email or phone number NOW."
        )

    # ── Single LLM call ───────────────────────────────────────────────────────
    prompt = f"""{SYSTEM}

---
CONVERSATION HISTORY (context only — do NOT extract from this):
{history_text}

LATEST USER MESSAGE (extract from THIS only):
{user_text}

COLLECTED (do NOT ask for these again):
{lead_data if lead_data else "Nothing yet"}

{forbidden_block}

STILL MISSING (ask about #1 first):
{missing_lines}
{contact_hint}
Respond with the JSON only."""

    raw    = llm.invoke(prompt).content.strip()
    parsed = _parse_json_response(raw)

    # ── Merge extracted fields ────────────────────────────────────────────────
    # FIX Bug 5: guard `if value` (not just `if value is not None`) to
    # prevent empty strings from overwriting valid data.
    extracted = parsed.get("extracted", {}) or {}
    for key, value in extracted.items():
        if value and key in FIELD_QUESTIONS:   # <-- was: `if value is not None`
            lead_data[key] = value

    agent_response = (parsed.get("response") or "").strip()
    if not agent_response:
        agent_response = "Sorry, could you say that again?"

    # ── Re-check completeness after extraction ────────────────────────────────
    still_missing = get_missing_fields(LeadSchema(**lead_data))
    next_node = "closing" if not still_missing else "done"

    return {
        "lead_data":        lead_data,
        "extracted_fields": {},
        "agent_response":   agent_response,
        "next_node":        next_node,
    }

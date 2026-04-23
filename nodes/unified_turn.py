import json
import re

from state import AgentState
from services.llm import llm
from utils.lead_schema import LeadSchema, get_missing_fields


CONTACT_INTENT_PHRASES = [
    "you can email me", "email me", "you can reach me", "reach me at",
    "contact me", "my email", "my phone", "call me", "send me",
    "you can call", "here is my", "here's my", "my mail", "my number",
]

CONTACT_REFUSAL_PHRASES = [
    "don't want to share", "dont want to share", "not comfortable",
    "prefer not", "rather not", "no email", "no phone", "no contact",
    "won't share", "wont share", "don't want to give", "dont want to give",
    "keep it private", "not sharing", "skip that", "skip it",
    "i'd rather not", "id rather not", "no thanks", "don't have",
    "dont have", "not interested in sharing",
]

FIELD_QUESTIONS = {
    "name":     "their first name",
    "company":  "the company or organisation they represent",
    "service":  "what they want built (website, e-commerce, CRM/ERP, AI automation, or mobile app)",
    "budget":   "their approximate budget range for the project",
    "timeline": "when they need the project delivered",
    "contact":  "their email address or phone number for follow-up",
}

BUDGET_KEYWORDS = [
    "lakh", "lakhs", "k", "thousand", "million", "crore", "usd", "inr",
    "dollar", "rupee", "rupees", "rs", "$", "£", "€", "budget", "around",
    "approximately", "roughly", "week", "month", "year",
]

# ── Extraction prompt ─────────────────────────────────────────────────────────

EXTRACTION_PROMPT = """\
Extract lead fields from the user message. Return ONLY a JSON object, nothing else.

RULES:
- Extract ONLY from USER MESSAGE — not from history.
- Set field to null if not clearly stated. Never guess.
- budget: extract amount + unit ("1 lakh", "50k"). If STT garbled (e.g. "one leg"), return null.
- contact: only if full email or phone given. "my email"/"my phone" without value → null.
- name: person's name only, not the word "name".
- service: normalise to one of: website, ecommerce, CRM/ERP, AI automation, mobile app.

EXAMPLES:
"My name is Anish, I work at Zenix" → {{"name":"Anish","company":"Zenix","service":null,"budget":null,"timeline":null,"contact":null}}
"budget around one lakh a month" → {{"name":null,"company":null,"service":null,"budget":"1 lakh/month","timeline":null,"contact":null}}
"one leg" → {{"name":null,"company":null,"service":null,"budget":null,"timeline":null,"contact":null}}
"my mail" → {{"name":null,"company":null,"service":null,"budget":null,"timeline":null,"contact":null}}
"anish@acme.com" → {{"name":null,"company":null,"service":null,"budget":null,"timeline":null,"contact":"anish@acme.com"}}
"I need a website in 2 months" → {{"name":null,"company":null,"service":"website","budget":null,"timeline":"2 months","contact":null}}

HISTORY (context only):
{history}

USER MESSAGE:
{user_text}

JSON:"""

# ── Response prompt ───────────────────────────────────────────────────────────

RESPONSE_PROMPT = """\
You are Eera, a warm and natural sales assistant from Zenx on a real-time voice call.
Talk like a real human — not a form-filler, not a robot.

ABOUT ZENX: builds websites, e-commerce, CRM/ERP, AI automation, mobile apps. Pricing by scope.

RULES:
- Respond to whatever the user said naturally first, THEN ask the next missing field.
- Ask only ONE field at a time — always the first item in STILL MISSING.
- NEVER ask for anything in FORBIDDEN LIST.
- Max 2 short sentences total.
- Do NOT start with the user's name every time. Use it at most once in the whole conversation.
- Do NOT re-introduce yourself after the first message.
- If user asks about private info (owner details, salaries, revenue, client data) → decline warmly and redirect.
- If user asks about Zenx services or pricing → answer briefly and move forward.
- If user seems hesitant → acknowledge, don't push hard.
- If clarification hint given → use it, don't ask from scratch.

CONVERSATION HISTORY:
{history}

USER JUST SAID:
{user_text}

COLLECTED:
{collected}

FORBIDDEN (never ask):
{forbidden}

STILL MISSING (ask #1 next):
{missing}

{clarification_hint}
Eera:"""


# ── Validators ────────────────────────────────────────────────────────────────

def _validate_extracted(extracted: dict) -> tuple[dict, list]:
    clean, failed = {}, []

    for key, value in extracted.items():
        if value is None:
            clean[key] = None
            continue

        val = str(value).strip()

        if key == "name":
            if len(val) < 2 or val.lower() in {"i", "me", "my", "name", "the"}:
                clean[key] = None
                failed.append(key)
                continue

        elif key == "budget":
            has_digit   = any(c.isdigit() for c in val)
            has_keyword = any(kw in val.lower() for kw in BUDGET_KEYWORDS)
            if not has_digit and not has_keyword:
                clean[key] = None
                failed.append(key)
                continue

        elif key == "contact":
            is_email = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", val)
            is_phone = re.search(r"[\d\s\-\+\(\)]{7,}", val)
            if not is_email and not is_phone:
                clean[key] = None
                failed.append(key)
                continue

        elif key == "timeline":
            time_words = [
                "day", "week", "month", "year", "asap", "soon", "quarter",
                "sprint", "immediately", "urgent", "flexible", "later",
            ]
            if not any(w in val.lower() for w in time_words) and not any(c.isdigit() for c in val):
                clean[key] = None
                failed.append(key)
                continue

        clean[key] = val

    return clean, failed


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def _is_contact_refusal(text: str) -> bool:
    return any(phrase in text.lower() for phrase in CONTACT_REFUSAL_PHRASES)


def _build_clarification_hint(user_text: str, missing: list, failed_fields: list) -> str:
    lower = user_text.lower()
    hints = []

    if "contact" in missing and any(p in lower for p in CONTACT_INTENT_PHRASES):
        hints.append(
            'CLARIFICATION: User wants to share contact but didn\'t give the value. '
            'Ask: "Sure, go ahead — what\'s the email or number?"'
        )
    if "budget" in failed_fields:
        hints.append(
            'CLARIFICATION: Budget was unclear (possible voice error). '
            'Ask: "Sorry, could you repeat the budget amount?"'
        )
    if "company" in failed_fields:
        hints.append(
            'CLARIFICATION: Company name was unclear. '
            'Ask: "Just to confirm — what\'s the company name?"'
        )

    return "\n".join(hints) if hints else ""


# ── Main node ─────────────────────────────────────────────────────────────────

def unified_turn(state: AgentState) -> dict:
    user_text       = state.get("user_text", "").strip()
    lead_data       = dict(state.get("lead_data", {}))
    history         = state.get("conversation_history", [])
    closing_stage   = state.get("closing_stage", "")
    contact_refused = state.get("contact_refused", False)

    # Already in closing flow
    if closing_stage in ("confirming", "asking_else", "done"):
        return {"next_node": "closing", "contact_refused": contact_refused}

    # Contact refusal — rule-based, no LLM needed
    if not contact_refused and _is_contact_refusal(user_text):
        lead = LeadSchema(**lead_data)
        if "contact" in get_missing_fields(lead):
            return {
                "lead_data":       lead_data,
                "extracted_fields": {},
                "contact_refused": True,
                "agent_response":  "No worries at all — we'll proceed without it and be in touch.",
                "next_node":       "closing",
                "closing_stage":   closing_stage,
            }

    # History context
    recent = history[-6:] if len(history) > 6 else history
    history_text = (
        "\n".join(f"User: {h['user']}\nEera: {h['agent']}" for h in recent)
        if recent else "None"
    )

    # ── Call 1: Extraction ────────────────────────────────────────────────────
    raw_extraction = llm.invoke(
        EXTRACTION_PROMPT.format(history=history_text, user_text=user_text)
    ).content.strip()

    extracted_clean, failed_fields = _validate_extracted(_parse_json(raw_extraction))

    for key, value in extracted_clean.items():
        if value and key in FIELD_QUESTIONS:
            lead_data[key] = value

    # Compute missing
    lead    = LeadSchema(**lead_data)
    missing = get_missing_fields(lead)
    if contact_refused:
        missing = [f for f in missing if f != "contact"]

    # All done → closing
    if not missing:
        return {
            "lead_data":       lead_data,
            "extracted_fields": {},
            "agent_response":  "",
            "next_node":       "closing",
            "closing_stage":   closing_stage,
            "contact_refused": contact_refused,
        }

    # Build forbidden + missing strings
    collected_keys = [k for k, v in lead_data.items() if v]
    if contact_refused and "contact" not in collected_keys:
        collected_keys.append("contact")

    forbidden_str = (
        "\n".join(f"- {k}: {lead_data.get(k, 'skipped')}" for k in collected_keys)
        if collected_keys else "none"
    )
    missing_str = "\n".join(
        f"  {i+1}. {f} — {FIELD_QUESTIONS[f]}" for i, f in enumerate(missing)
    )
    clarification_hint = _build_clarification_hint(user_text, missing, failed_fields)

    # ── Call 2: Response ──────────────────────────────────────────────────────
    agent_response = llm.invoke(
        RESPONSE_PROMPT.format(
            history=history_text,
            user_text=user_text,
            collected=lead_data if lead_data else "Nothing yet",
            forbidden=forbidden_str,
            missing=missing_str,
            clarification_hint=clarification_hint,
        )
    ).content.strip()

    if not agent_response:
        agent_response = "Sorry, I didn't catch that — could you say it again?"

    still_missing = get_missing_fields(LeadSchema(**lead_data))
    if contact_refused:
        still_missing = [f for f in still_missing if f != "contact"]

    return {
        "lead_data":       lead_data,
        "extracted_fields": {},
        "agent_response":  agent_response,
        "next_node":       "closing" if not still_missing else "done",
        "closing_stage":   closing_stage,
        "contact_refused": contact_refused,
    }

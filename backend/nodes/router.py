from state import AgentState
from services.llm import llm
from utils.lead_schema import LeadSchema, get_missing_fields


ALLOWED_ROUTES = ["ask_question", "answer_query", "finalize_lead", "closing"]

FAQ_KEYWORDS = [
    "price", "cost", "services", "what do you do", "how much",
    "do you build", "what does zenx", "can you", "do you offer",
    "what is", "tell me about",
]

# Phrases that signal the user *intends* to provide contact info
# but hasn't given the actual value yet — route to ask_question
# so the agent asks for the specific email/phone.
CONTACT_INTENT_PHRASES = [
    "you can email me", "email me", "you can reach me", "reach me at",
    "contact me", "my email", "my phone", "call me", "send me",
    "you can call", "here is my", "here's my",
]


def router(state: AgentState):
    user_text     = state.get("user_text", "").strip()
    lead_data     = state.get("lead_data", {})
    closing_stage = state.get("closing_stage", "")

    # ── CLOSING FLOW ─────────────────────────────────────────────────────────
    # Once we enter the closing sequence, stay in it regardless of content.
    if closing_stage in ("confirming", "asking_else", "done"):
        return {"next_node": "closing"}

    lead = LeadSchema(**lead_data)
    missing_fields = get_missing_fields(lead)

    # ── RULE 1: all fields collected → start closing flow ────────────────────
    if len(missing_fields) == 0:
        return {"next_node": "closing"}

    lower = user_text.lower()

    # ── RULE 2: user signals intent to share contact info ────────────────────
    # e.g. "you can email me" — no actual email yet, but we should ask for it
    if any(phrase in lower for phrase in CONTACT_INTENT_PHRASES):
        return {"next_node": "ask_question"}

    # ── RULE 3: FAQ / general question ──────────────────────────────────────
    if any(k in lower for k in FAQ_KEYWORDS):
        return {"next_node": "answer_query"}

    # ── RULE 4: very short utterances (≤2 words) → keep conversation going ──
    if len(user_text.split()) <= 2:
        return {"next_node": "ask_question"}

    # ── RULE 5: LLM intent classifier ────────────────────────────────────────
    history = state.get("conversation_history", [])
    recent  = history[-3:] if len(history) > 3 else history
    history_text = "\n".join(
        f"User: {h['user']}\nAgent: {h['agent']}" for h in recent
    ) if recent else "None"

    prompt = f"""You are classifying the intent of a user message in a sales conversation.

Recent conversation:
{history_text}

Latest user message:
{user_text}

Collected so far: {lead_data}
Still missing: {missing_fields}

Choose ONLY one:

ask_question  → user is providing information, answering a question, or continuing the lead collection
answer_query  → user is asking a general question about services, pricing, or the company
finalize_lead → this option is DISABLED, do not choose it

Respond with ONLY the option name, nothing else.
"""

    decision = llm.invoke(prompt).content.strip().lower()
    decision = decision.replace(".", "").replace(",", "").strip()

    # Prevent LLM from bypassing the proper closing flow
    if decision == "finalize_lead":
        decision = "ask_question"

    if decision not in ["ask_question", "answer_query"]:
        decision = "ask_question"

    return {"next_node": decision}

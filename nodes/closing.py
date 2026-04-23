from state import AgentState
from utils.lead_schema import LeadSchema
from services.lead_storage import save_lead
from nodes.finalize_lead import calculate_priority
from services.llm import llm


AFFIRMATIVE = {
    "yes", "yeah", "yep", "yup", "sure", "correct", "right",
    "that's right", "exactly", "confirmed", "absolutely", "ok", "okay",
}
NEGATIVE = {
    "no", "nope", "nah", "not really", "nothing", "that's all",
    "no thanks", "i'm good", "all good", "nothing else",
}


def _is_yes(text: str) -> bool:
    t = text.lower().strip().rstrip(".")
    return t in AFFIRMATIVE or any(t.startswith(a) for a in AFFIRMATIVE)


def _is_no(text: str) -> bool:
    t = text.lower().strip().rstrip(".")
    return t in NEGATIVE or any(t.startswith(n) for n in NEGATIVE)


def _build_summary(lead_data: dict) -> str:
    """LLM-generated natural summary — no more robotic string concatenation."""
    name     = lead_data.get("name", "")
    company  = lead_data.get("company", "")
    service  = lead_data.get("service", "")
    budget   = lead_data.get("budget", "")
    timeline = lead_data.get("timeline", "")
    contact  = lead_data.get("contact", "")

    prompt = f"""You are Eera, a sales assistant from Zenx wrapping up a voice call.
Generate a SHORT, natural confirmation summary of what was discussed, then ask if it's correct.

Rules:
- Sound like a real human, not a form readback
- One or two sentences max
- End with "Does that sound right?" or "Is that correct?"
- Do NOT say "I'm Eera from Zenx"
- Do NOT list fields mechanically — weave them naturally
- Use the person's name once at the start if available

Lead details:
- Name: {name or "not provided"}
- Company: {company or "not provided"}
- Service needed: {service or "not provided"}
- Budget: {budget or "not provided"}
- Timeline: {timeline or "not provided"}
- Contact: {contact or "not provided"}

Confirmation message:"""

    return llm.invoke(prompt).content.strip()


def closing(state: AgentState) -> dict:
    user_text       = state.get("user_text", "").strip()
    lead_data       = dict(state.get("lead_data", {}))
    closing_stage   = state.get("closing_stage", "")
    contact_refused = state.get("contact_refused", False)

    # ── ENTRY ─────────────────────────────────────────────────────────────────
    if closing_stage == "":
        lead = LeadSchema(**lead_data)
        lead_data["priority"] = calculate_priority(lead)
        save_lead(lead_data)
        return {
            "lead_data":       lead_data,
            "closing_stage":   "confirming",
            "agent_response":  _build_summary(lead_data),
            "next_node":       "done",
            "contact_refused": contact_refused,
        }

    # ── CONFIRMING ────────────────────────────────────────────────────────────
    if closing_stage == "confirming":
        if _is_no(user_text):
            return {
                "closing_stage":   "",
                "agent_response":  "No problem, let's fix that. What would you like to change?",
                "next_node":       "done",
                "contact_refused": contact_refused,
            }
        return {
            "closing_stage":   "asking_else",
            "agent_response":  "Great! Is there anything else I can help you with?",
            "next_node":       "done",
            "contact_refused": contact_refused,
        }

    # ── ASKING ELSE ───────────────────────────────────────────────────────────
    if closing_stage == "asking_else":
        if _is_no(user_text):
            return {
                "closing_stage":   "done",
                "agent_response":  (
                    "Perfect, thanks so much for your time! "
                    "Our team will be in touch with you soon. Have a great day!"
                ),
                "next_node":       "done",
                "contact_refused": contact_refused,
            }

        history = state.get("conversation_history", [])
        recent  = history[-4:] if len(history) > 4 else history
        history_text = (
            "\n".join(f"User: {h['user']}\nEera: {h['agent']}" for h in recent)
            if recent else "None"
        )
        prompt = (
            "You are Eera, a friendly sales assistant from Zenx on a voice call.\n"
            "The lead is collected. User has a follow-up before hanging up.\n\n"
            f"Recent conversation:\n{history_text}\n\n"
            f"User said: {user_text}\n\n"
            "Reply helpfully in 1-2 short sentences, then ask if there's anything else."
        )
        return {
            "closing_stage":   "asking_else",
            "agent_response":  llm.invoke(prompt).content.strip(),
            "next_node":       "done",
            "contact_refused": contact_refused,
        }

    # ── DONE ──────────────────────────────────────────────────────────────────
    return {
        "closing_stage":   "done",
        "agent_response":  "Have a great day!",
        "next_node":       "done",
        "contact_refused": contact_refused,
    }

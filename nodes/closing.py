"""
closing.py
----------
Handles the three-stage conversation closing flow:

  Stage ""           → (entry) save lead, build confirmation summary
  Stage "confirming" → user replied to summary; if confirmed → ask "anything else?"
  Stage "asking_else"→ user replied to "anything else?"; say goodbye or handle request
  Stage "done"       → terminal — no further routing needed

Fix applied — Bug 2
-------------------
When the user says "no" during the "confirming" stage (they want to correct
something), the previous code returned next_node="ask_question" — a node that
does NOT exist in build_graph(). This caused the graph to raise a KeyError /
deadlock and left closing_stage stuck on "confirming" forever.

Fix: return closing_stage="" (reset to normal collection) and next_node="done"
so the graph routes back through unified_turn on the next user turn.
The agent_response asks "What would you like to change?" so the user knows
the collection loop has restarted.
"""

from state import AgentState
from utils.lead_schema import LeadSchema
from services.lead_storage import save_lead
from nodes.finalize_lead import calculate_priority
from services.llm import llm


# ── Affirmative / negative classifiers ───────────────────────────────────────
AFFIRMATIVE = {"yes", "yeah", "yep", "yup", "sure", "correct", "right",
               "that's right", "exactly", "confirmed", "absolutely", "ok", "okay"}
NEGATIVE    = {"no", "nope", "nah", "not really", "nothing", "that's all",
               "no thanks", "i'm good", "all good", "nothing else"}

def _is_yes(text: str) -> bool:
    t = text.lower().strip().rstrip(".")
    return t in AFFIRMATIVE or any(t.startswith(a) for a in AFFIRMATIVE)

def _is_no(text: str) -> bool:
    t = text.lower().strip().rstrip(".")
    return t in NEGATIVE or any(t.startswith(n) for n in NEGATIVE)


# ── Summary builder ───────────────────────────────────────────────────────────
def _build_summary(lead_data: dict) -> str:
    name     = lead_data.get("name", "")
    company  = lead_data.get("company", "")
    service  = lead_data.get("service", "")
    budget   = lead_data.get("budget", "")
    timeline = lead_data.get("timeline", "")
    contact  = lead_data.get("contact", "")

    parts = []
    if service:  parts.append(f"a {service}")
    if company:  parts.append(f"for {company}")
    if budget:   parts.append(f"with a budget of around {budget}")
    if timeline: parts.append(f"and a timeline of {timeline}")

    summary_body = ", ".join(parts) if parts else "your project"
    greeting = f"Just to confirm, {name} — " if name else "Just to confirm — "
    contact_note = f" I've also noted your contact as {contact}." if contact else ""

    return (
        f"{greeting}you're looking for {summary_body}.{contact_note} "
        f"Is that correct?"
    )


# ── Node ──────────────────────────────────────────────────────────────────────
def closing(state: AgentState):
    user_text     = state.get("user_text", "").strip()
    lead_data     = dict(state.get("lead_data", {}))
    closing_stage = state.get("closing_stage", "")

    # ── STAGE ENTRY: first time we arrive here ────────────────────────────────
    if closing_stage == "":
        lead = LeadSchema(**lead_data)
        lead_data["priority"] = calculate_priority(lead)
        save_lead(lead_data)

        summary = _build_summary(lead_data)
        return {
            "lead_data":      lead_data,
            "closing_stage":  "confirming",
            "agent_response": summary,
            "next_node":      "done",
        }

    # ── STAGE CONFIRMING: waiting for user to confirm summary ─────────────────
    if closing_stage == "confirming":
        if _is_no(user_text):
            # FIX Bug 2: reset closing_stage to "" so unified_turn re-enters
            # normal collection on the next turn. Return next_node="done" so
            # the graph routes to update_history then END — NOT to "ask_question"
            # which doesn't exist as an edge in build_graph().
            return {
                "closing_stage":  "",      # reset — back to normal collection
                "next_node":      "done",  # graph: closing → update_history → END
                "agent_response": "No problem! What would you like to correct?",
            }

        # Treat anything that isn't a clear "no" as confirmation
        return {
            "closing_stage":  "asking_else",
            "agent_response": "Great. Is there anything else I can help you with today?",
            "next_node":      "done",
        }

    # ── STAGE ASKING_ELSE: waiting for "anything else?" response ─────────────
    if closing_stage == "asking_else":
        if _is_no(user_text):
            return {
                "closing_stage":  "done",
                "agent_response": (
                    "Perfect. Thanks for your time. "
                    "Our team at Zenx will be in touch with you soon. "
                    "Have a great day!"
                ),
                "next_node": "done",
            }

        # User has another question — answer it, then re-ask "anything else?"
        history = state.get("conversation_history", [])
        recent  = history[-4:] if len(history) > 4 else history
        history_text = "\n".join(
            f"User: {h['user']}\nEera: {h['agent']}" for h in recent
        ) if recent else "None"

        prompt = f"""You are Eera, a friendly AI sales assistant from Zenx.

The lead has already been collected. The user has one more question or comment before ending the call.

Conversation so far:
{history_text}

User's final message:
{user_text}

Respond helpfully in 1-2 short sentences, then ask: "Is there anything else I can help you with?"
"""
        response = llm.invoke(prompt).content.strip()
        return {
            "closing_stage":  "asking_else",
            "agent_response": response,
            "next_node":      "done",
        }

    # ── STAGE DONE: should not be routed here, but handle gracefully ──────────
    return {
        "closing_stage":  "done",
        "agent_response": "Have a great day!",
        "next_node":      "done",
    }

from state import AgentState
from services.llm import llm
from utils.lead_schema import LeadSchema, get_missing_fields


SYSTEM_PROMPT = """You are a professional AI sales assistant speaking with a potential client over a real-time voice call.
Your job is to have a natural conversation, understand the client's needs, qualify the lead, and collect important information smoothly.
This is NOT a form or questionnaire. It must feel like a real conversation with a human sales consultant.

CORE CONVERSATION PRINCIPLES

1. Always acknowledge the user before asking a new question.
Every response must start by briefly acknowledging what the user said.
Examples: "Got it.", "That makes sense.", "Thanks for sharing that.", "Okay, that helps.", "Nice to meet you."
Do NOT immediately jump into another question without acknowledgment.

2. Never ask a question that has already been answered.
Before asking anything, check what is in ALREADY COLLECTED. If a field is there — do NOT ask for it.

3. Use information the user has already provided.
Reference their previous answers to show awareness. Never ignore previously mentioned details.

4. Ask only ONE question at a time.
Structure: Acknowledgement → natural transition → one question.

5. Keep responses short and voice-friendly.
Maximum: 1–2 sentences + one question. No long explanations.

6. Maintain a natural conversational tone.
Speak like a human sales consultant.
Bad: "What is your budget?" → Better: "Do you have a rough budget in mind for this?"

7. Adapt the conversation dynamically.
Do NOT follow a rigid checklist. If the user provides multiple details in one sentence, absorb all of them.

8. Handle contact intent correctly.
If the user says something like "you can email me" or "feel free to reach out",
they are SIGNALLING they want to share contact info but haven't given it yet.
In that case, acknowledge and ask: "Sure! What's the best email address to reach you at?"

9. Avoid repeating questions — rephrase if needed.

RESPONSE FORMAT
Output ONLY the next spoken response. No explanations, no bullet points, no stage directions.

Information being collected (do not ask for what is already in ALREADY COLLECTED):
- Name, Company, Project/service need, Timeline, Budget, Contact (email or phone)"""


# Phrases that indicate user wants to share contact but hasn't yet
CONTACT_INTENT_PHRASES = [
    "you can email me", "email me", "you can reach me", "reach me at",
    "contact me", "my email", "my phone", "call me", "send me",
    "you can call", "here is my", "here's my",
]


def ask_question(state: AgentState):
    lead_data = state.get("lead_data", {})
    history   = state.get("conversation_history", [])
    user_text = state.get("user_text", "")

    lead = LeadSchema(**lead_data)
    missing_fields = get_missing_fields(lead)

    if not missing_fields:
        return {"agent_response": "Thanks, I have all the details I need!"}

    # Build conversation history string (last 6 turns)
    recent = history[-6:] if len(history) > 6 else history
    history_text = "\n".join(
        f"User: {h['user']}\nEera: {h['agent']}" for h in recent
    ) if recent else "None"

    missing_desc = ", ".join(missing_fields)

    # Detect contact intent so the LLM has an explicit hint
    lower = user_text.lower()
    contact_hint = ""
    if any(phrase in lower for phrase in CONTACT_INTENT_PHRASES) and "contact" in missing_fields:
        contact_hint = (
            "\nIMPORTANT: The user has indicated they are willing to share their "
            "contact information but has not provided it yet. "
            "Acknowledge this and ask specifically for their email address or phone number."
        )

    prompt = f"""{SYSTEM_PROMPT}

---
CONVERSATION HISTORY:
{history_text}

LATEST USER MESSAGE:
{user_text}

ALREADY COLLECTED:
{lead_data}

STILL MISSING:
{missing_desc}
{contact_hint}
Now respond as Eera. Acknowledge what the user just said, then ask for the most \
natural next missing piece of information — whichever flows best from the conversation.
"""

    response = llm.invoke(prompt)
    return {"agent_response": response.content.strip()}

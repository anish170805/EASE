from services.llm import llm
from utils.lead_schema import LeadSchema
from state import AgentState

# Structured output model
structured_llm = llm.with_structured_output(LeadSchema)


def extract_lead(state: AgentState):
    user_text = state["user_text"]
    history   = state.get("conversation_history", [])

    # Build a short context window so multi-turn extractions aren't missed
    # (e.g. name mentioned 2 turns ago, company mentioned now)
    recent = history[-4:] if len(history) > 4 else history
    context_lines = "\n".join(
        f"User: {h['user']}" for h in recent
    )
    if context_lines:
        context_lines += f"\nUser: {user_text}"
    else:
        context_lines = f"User: {user_text}"

    prompt = f"""
You are an AI system that extracts lead information from a sales conversation.

Extract the following fields if they are clearly mentioned anywhere in the messages below:
- name       : full name of the person speaking
- company    : the company or organization they represent
- service    : the service they want (website, ecommerce, CRM/ERP, AI automation, mobile app)
- budget     : any budget or price range they mention
- timeline   : any timeline, deadline, or launch date they mention
- contact    : their email address or phone number

Rules:
- Only extract information explicitly stated. Do NOT guess or infer.
- If a field is not mentioned, return null.
- Focus extraction on the most recent user message, but use earlier messages as context.

Conversation (most recent at bottom):
{context_lines}
"""

    result = structured_llm.invoke(prompt)
    return {"extracted_fields": result.model_dump()}

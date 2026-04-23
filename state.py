from typing import TypedDict, List, Dict, Any


class AgentState(TypedDict):
    user_text: str
    conversation_history: List[Dict[str, str]]
    extracted_fields: Dict[str, Any]
    lead_data: Dict[str, Any]
    agent_response: str
    next_node: str          # "done" | "closing"
    closing_stage: str      # "" | "confirming" | "asking_else" | "done"
    stt_buffer: str
    contact_refused: bool   # True if user explicitly declined to share contact

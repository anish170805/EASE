from typing import TypedDict, List, Optional, Dict


class LeadData(TypedDict, total=False):
    name: Optional[str]
    company: Optional[str]
    service: Optional[str]
    budget: Optional[str]
    timeline: Optional[str]
    contact: Optional[str]


class AgentState(TypedDict):
    user_text:            str
    conversation_history: List[Dict[str, str]]
    extracted_fields:     LeadData
    lead_data:            LeadData
    agent_response:       str
    next_node:            str   # "done" | "closing"

    # Closing flow stage:
    #   ""             → normal collection
    #   "confirming"   → waiting for user to confirm summary
    #   "asking_else"  → waiting for "anything else?" answer
    #   "done"         → conversation fully closed
    closing_stage: str

    # STT buffer (managed in agent.py, not used by graph nodes)
    stt_buffer: str

from state import AgentState


def update_lead(state: AgentState):
    """Merge newly extracted fields into lead_data, then clear extracted_fields."""

    lead_data = dict(state.get("lead_data", {}))
    extracted = state.get("extracted_fields", {})

    for key, value in extracted.items():
        if value is not None:
            lead_data[key] = value

    return {
        "lead_data": lead_data,
        "extracted_fields": {},   # clear so stale fields don't bleed into next turn
    }

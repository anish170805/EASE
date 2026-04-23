from state import AgentState


def update_history(state: AgentState) -> dict:
    user_text  = state.get("user_text", "")
    agent_resp = state.get("agent_response", "")
    old_history = list(state.get("conversation_history", []))

    if old_history and old_history[-1].get("user") == user_text:
        return {"conversation_history": old_history}

    return {"conversation_history": old_history + [{"user": user_text, "agent": agent_resp}]}

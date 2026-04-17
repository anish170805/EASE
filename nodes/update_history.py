from state import AgentState


def update_history(state: AgentState):
    """
    Append the current turn to conversation_history.

    CRITICAL: always build a NEW list — never mutate the existing one.
    Mutating in-place causes the same entry to appear twice because
    LangGraph merges the returned dict on top of the shared agent_state
    reference, effectively doubling the append.
    """
    user_text  = state.get("user_text", "")
    agent_resp = state.get("agent_response", "")

    # Build a fresh list so LangGraph state merge is clean
    old_history = list(state.get("conversation_history", []))

    # Deduplicate: don't append if the last entry is identical
    # (guards against any edge-case double-invoke)
    if old_history and old_history[-1].get("user") == user_text:
        return {"conversation_history": old_history}

    new_history = old_history + [{"user": user_text, "agent": agent_resp}]

    return {"conversation_history": new_history}

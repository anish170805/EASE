from langgraph.graph import StateGraph, END, START

from state import AgentState
from nodes.unified_turn import unified_turn
from nodes.closing import closing
from nodes.update_history import update_history


def build_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("unified_turn",   unified_turn)
    workflow.add_node("closing",        closing)
    workflow.add_node("update_history", update_history)

    workflow.add_edge(START, "unified_turn")

    workflow.add_conditional_edges(
        "unified_turn",
        lambda state: state["next_node"],
        {"closing": "closing", "done": "update_history"},
    )

    workflow.add_conditional_edges(
        "closing",
        lambda state: state["next_node"],
        {"done": "update_history"},
    )

    workflow.add_edge("update_history", END)

    return workflow.compile()

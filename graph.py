from langgraph.graph import StateGraph, END, START

from state import AgentState
from nodes.unified_turn  import unified_turn
from nodes.closing       import closing
from nodes.update_history import update_history


def build_graph():
    workflow = StateGraph(AgentState)

    # ── Nodes ────────────────────────────────────────────────────────────────
    workflow.add_node("unified_turn",   unified_turn)
    workflow.add_node("closing",        closing)
    workflow.add_node("update_history", update_history)

    # ── Entry ────────────────────────────────────────────────────────────────
    workflow.add_edge(START, "unified_turn")

    # ── Conditional: unified_turn decides next step ──────────────────────────
    workflow.add_conditional_edges(
        "unified_turn",
        lambda state: state["next_node"],
        {
            "closing": "closing",
            "done":    "update_history",
        },
    )

    # ── Closing uses the same conditional so it can also route to update_history
    # regardless of which sub-stage it was in. "next_node" is always "done"
    # from closing.py — which maps to update_history — then END.
    # Bug 2 fix: closing no longer emits "ask_question" as a next_node.
    workflow.add_conditional_edges(
        "closing",
        lambda state: state["next_node"],
        {
            "done": "update_history",
        },
    )

    workflow.add_edge("update_history", END)

    return workflow.compile()

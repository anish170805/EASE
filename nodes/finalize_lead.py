"""
finalize_lead.py
----------------
This module is now a UTILITY only.
The actual lead saving and closing conversation flow has moved to closing.py.

calculate_priority() is imported by closing.py.
"""

from utils.lead_schema import LeadSchema


def calculate_priority(lead: LeadSchema) -> str:
    score = 0

    if lead.budget:
        score += 2
    if lead.timeline:
        score += 1
    if lead.service in ["AI Automation", "CRM / ERP Software", "AI automation", "CRM/ERP"]:
        score += 2

    if score >= 4:
        return "high"
    elif score >= 2:
        return "medium"
    else:
        return "low"

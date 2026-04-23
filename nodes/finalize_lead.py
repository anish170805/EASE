from utils.lead_schema import LeadSchema


def calculate_priority(lead: LeadSchema) -> str:
    score = 0
    if lead.budget:   score += 2
    if lead.timeline: score += 1
    if lead.service and lead.service.lower() in [
        "ai automation", "crm/erp", "crm / erp software",
    ]:
        score += 2

    if score >= 4:   return "high"
    elif score >= 2: return "medium"
    else:            return "low"

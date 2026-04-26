import re
from utils.lead_schema import LeadSchema


# ── Service weights ───────────────────────────────────────────────────────────
# Higher weight = harder/higher-value requirement
SERVICE_WEIGHTS = {
    # High complexity
    "ai automation":          30,
    "ai agents":              30,
    "automation":             28,
    "crm/erp":                25,
    "crm / erp software":     25,
    "crm":                    22,
    "erp":                    22,
    # Medium complexity
    "mobile app":             18,
    "mobile application":     18,
    "ecommerce":              15,
    "e-commerce":             15,
    "e commerce":             15,
    # Lower complexity
    "website":                8,
    "landing page":           6,
}

# ── Budget extraction ─────────────────────────────────────────────────────────
# Parse the budget string into a rupee amount for comparison
LAKH  = 100_000
CRORE = 10_000_000

def _parse_budget_inr(budget_str: str) -> float:
    """
    Parse a budget string like "1 lakh", "50k", "2 crore", "10000 rupees"
    into a float (INR). Returns 0.0 if unparseable.
    """
    s = budget_str.lower().strip()

    # Extract leading number (int or float)
    num_match = re.search(r"[\d,]+\.?\d*", s)
    if not num_match:
        return 0.0
    num = float(num_match.group().replace(",", ""))

    if "crore" in s:   return num * CRORE
    if "lakh" in s:    return num * LAKH
    if "lac" in s:     return num * LAKH
    if "million" in s: return num * 1_000_000
    if "k" in s:       return num * 1_000
    return num


def _budget_score(budget_str: str) -> int:
    """
    Weighted budget score out of 40.
    Highest weight in the system — reflects how serious the lead is.

    Tiers (INR):
      ≥ 10 lakh   → 40
      ≥ 5 lakh    → 34
      ≥ 1 lakh    → 26
      ≥ 50k       → 18
      ≥ 10k       → 10
      any budget  →  5  (present but too vague to parse)
    """
    if not budget_str:
        return 0
    amount = _parse_budget_inr(budget_str)
    if amount == 0.0:
        return 5   # budget mentioned but not parseable — still a signal
    if amount >= 10 * LAKH:  return 40
    if amount >= 5  * LAKH:  return 34
    if amount >= 1  * LAKH:  return 26
    if amount >= 50_000:     return 18
    if amount >= 10_000:     return 10
    return 5


def _timeline_score(timeline_str: str) -> int:
    """
    Weighted timeline score out of 20.
    Urgency drives priority — nearer deadline = higher score.

    Tiers:
      within a week / asap / urgent  → 20
      within a month                 → 15
      1-3 months                     → 10
      3-6 months                     → 5
      flexible / no rush             → 2
      present but unparseable        → 3
    """
    if not timeline_str:
        return 0
    s = timeline_str.lower()

    urgent_words = ["asap", "urgent", "immediately", "right away", "today", "this week"]
    if any(w in s for w in urgent_words):
        return 20

    # Look for digit + unit
    num_match = re.search(r"(\d+)\s*(day|week|month|year)", s)
    if num_match:
        num  = int(num_match.group(1))
        unit = num_match.group(2)
        days = num * {"day": 1, "week": 7, "month": 30, "year": 365}[unit]
        if days <= 7:   return 20
        if days <= 30:  return 15
        if days <= 90:  return 10
        if days <= 180: return 5
        return 2

    # Relative words
    if any(w in s for w in ["next week", "this month"]):        return 15
    if any(w in s for w in ["next month", "couple of month"]):  return 10
    if any(w in s for w in ["few month", "quarter"]):           return 7
    if any(w in s for w in ["flexible", "no rush", "later"]):   return 2

    return 3  # present but unparseable


def _service_score(service_str: str) -> int:
    """
    Weighted service score out of 30.
    Complex/high-value services score higher.
    """
    if not service_str:
        return 0
    s = service_str.lower().strip()
    for key, weight in SERVICE_WEIGHTS.items():
        if key in s:
            return weight
    return 5  # service mentioned but not matched


def calculate_priority(lead: LeadSchema) -> str:
    """
    Compute weighted score (0–100) and map to priority.

    Weight distribution:
      Budget   → 40 pts  (most important signal)
      Service  → 30 pts  (complexity/value of requirement)
      Timeline → 20 pts  (urgency)
      Contact  → 10 pts  (completeness / reachability)

    Priority bands:
      HIGH  → score >= 65
      MEDIUM→ score >= 35
      LOW   → score <  35
    """
    budget_pts   = _budget_score(lead.budget or "")
    service_pts  = _service_score(lead.service or "")
    timeline_pts = _timeline_score(lead.timeline or "")
    contact_pts  = 10 if lead.contact else 0

    total = budget_pts + service_pts + timeline_pts + contact_pts

    print(
        f">>> PRIORITY SCORE: budget={budget_pts} service={service_pts} "
        f"timeline={timeline_pts} contact={contact_pts} TOTAL={total}"
    )

    if total >= 65:  return "high"
    if total >= 35:  return "medium"
    return "low"

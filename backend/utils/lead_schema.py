from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class LeadPriority(str, Enum):
    LOW    = "low"
    MEDIUM = "medium"
    HIGH   = "high"


class LeadSchema(BaseModel):
    name: Optional[str] = Field(default=None, description="Full name of the customer")
    company: Optional[str] = Field(default=None, description="Company or organization name")
    service: Optional[str] = Field(
        default=None,
        description="Service requested (website, ecommerce, CRM/ERP, AI automation, mobile app)",
    )
    budget: Optional[str] = Field(default=None, description="Approximate budget range")
    timeline: Optional[str] = Field(default=None, description="Expected project timeline")
    contact: Optional[str] = Field(default=None, description="Email or phone number")
    priority: Optional[LeadPriority] = Field(
        default=LeadPriority.MEDIUM,
        description="Lead priority based on urgency, budget, and seriousness",
    )

    class Config:
        extra = "ignore"


def get_missing_fields(lead: LeadSchema) -> list:
    missing = []
    if not lead.name:     missing.append("name")
    if not lead.company:  missing.append("company")
    if not lead.service:  missing.append("service")
    if not lead.budget:   missing.append("budget")
    if not lead.timeline: missing.append("timeline")
    if not lead.contact:  missing.append("contact")
    return missing

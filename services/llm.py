from langchain_groq import ChatGroq
from config import config

# llama-3.1-8b-instant: 131k context, 500k TPD on free tier.
# Temperature 0.1 for extraction calls (lower = more deterministic JSON,
# fewer hallucinated field values that could overwrite valid lead data).
llm = ChatGroq(
    groq_api_key=config.GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.1,   # FIX Bug 7: was 0.3 — lower temp reduces hallucinated extractions
    max_tokens=256,
)

print("ChatGroq LLM initialised: llama-3.1-8b-instant (temp=0.1)")

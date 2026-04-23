from langchain_groq import ChatGroq
from config import config

# llama-3.3-70b-versatile: much stronger instruction following than 8b-instant.
# Still free tier on Groq. Handles natural conversation, extraction, and JSON
# reliably in a single pass without the compounding errors of the smaller model.
llm = ChatGroq(
    groq_api_key=config.GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile",
    temperature=0.15,
    max_tokens=350,
)

print("ChatGroq LLM initialised: llama-3.3-70b-versatile (temp=0.15, max_tokens=350)")

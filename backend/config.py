import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    LIVEKIT_URL = os.getenv("LIVEKIT_URL")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")


config = Config()

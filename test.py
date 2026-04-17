from services.stt import transcribe_audio

text = transcribe_audio("D:\\Langgraph\\voice-agent\\Recording.m4a")

print(text)
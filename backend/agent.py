import uuid
import asyncio
import hashlib
import os
from typing import AsyncIterable

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    JobExecutorType,
    cli,
    llm,
    ModelSettings,
)
from livekit.plugins import deepgram, silero, openai as livekit_openai

from graph import build_graph
from config import config


GREETING = "Hi, I'm Eera from Zenx. How can I help you today?"
STT_COMMIT_DELAY = 0.8  # seconds to wait for STT to settle before processing


def _text_hash(text: str) -> str:
    return hashlib.md5(" ".join(text.lower().split()).encode()).hexdigest()


class GraphAgent(Agent):
    def __init__(self, graph, agent_state: dict, room=None, **kwargs):
        super().__init__(**kwargs)
        self.graph       = graph
        self.agent_state = agent_state
        self._room       = room

        self._response_queue: asyncio.Queue = asyncio.Queue()
        self._stt_buffer      = ""
        self._stt_commit_task = None
        self._stt_lock        = asyncio.Lock()
        self._processing      = False
        self._last_committed_hash: str = ""

    async def _handle_stt_final(self, text: str) -> None:
        async with self._stt_lock:
            self._stt_buffer = (
                self._stt_buffer.rstrip() + " " + text.strip()
                if self._stt_buffer else text.strip()
            )
            if self._stt_commit_task and not self._stt_commit_task.done():
                self._stt_commit_task.cancel()
            self._stt_commit_task = asyncio.create_task(self._delayed_commit())

    async def _delayed_commit(self) -> None:
        try:
            await asyncio.sleep(STT_COMMIT_DELAY)
        except asyncio.CancelledError:
            return
        async with self._stt_lock:
            text = self._stt_buffer.strip()
            self._stt_buffer = ""
        if text:
            await self._process_user_turn(text)

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        user_text = new_message.text_content
        if not user_text or not user_text.strip():
            return
        print(f">>> STT FINAL (raw): '{user_text}'")
        await self._handle_stt_final(user_text)

    async def _process_user_turn(self, user_text: str) -> None:
        turn_hash = _text_hash(user_text)
        if turn_hash == self._last_committed_hash:
            print(f">>> DROPPING turn (duplicate): '{user_text}'")
            return
        if self._processing:
            print(f">>> DROPPING turn (busy): '{user_text}'")
            return

        self._last_committed_hash = turn_hash
        self._processing = True
        print(f">>> USER TURN COMMITTED: '{user_text}'")
        self.agent_state["user_text"] = user_text

        try:
            result = await self.graph.ainvoke(self.agent_state)
            self.agent_state.update(result)
            response = self.agent_state.get("agent_response", "").strip()
            print(f">>> AGENT RESPONSE: '{response}'")

            if response:
                await self._response_queue.put(response)
                self.agent_state["agent_response"] = ""
                # Broadcast response text to frontend for subtitle display
                if self._room:
                    try:
                        import json as _json
                        payload = _json.dumps({"type": "agent_text", "text": response}).encode("utf-8")
                        await self._room.local_participant.publish_data(payload, reliable=True)
                    except Exception as exc:
                        print(f">>> data publish error: {exc}")
            else:
                print(">>> WARNING: empty agent_response — skipping enqueue")

            if self.agent_state.get("closing_stage") == "done":
                asyncio.create_task(self._graceful_disconnect())

        except Exception:
            import traceback
            traceback.print_exc()
            await self._response_queue.put(
                "Sorry, something went wrong. Could you repeat that?"
            )
        finally:
            self._processing = False

    async def _graceful_disconnect(self) -> None:
        # Wait long enough for closing TTS to fully play out
        await asyncio.sleep(12.0)
        if self._room:
            try:
                print(">>> DISCONNECTING room after graceful close.")
                await self._room.disconnect()
            except Exception as exc:
                print(f">>> Disconnect error (ignored): {exc}")

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools,
        model_settings: ModelSettings,
    ) -> AsyncIterable[llm.ChatChunk]:
        print(">>> LLM NODE — waiting for response...")
        response = await self._response_queue.get()
        print(f">>> LLM NODE — yielding: '{response}'")
        if not response.strip():
            return
        yield llm.ChatChunk(
            id=str(uuid.uuid4()),
            delta=llm.ChoiceDelta(role="assistant", content=response),
        )


async def entrypoint(ctx: JobContext) -> None:
    graph = build_graph()

    agent_state = {
        "user_text":            "",
        "lead_data":            {},
        "extracted_fields":     {},
        "conversation_history": [],
        "agent_response":       "",
        "next_node":            "done",
        "closing_stage":        "",
        "stt_buffer":           "",
        "contact_refused":      False,
    }

    await ctx.connect()

    agent = GraphAgent(
        graph=graph,
        agent_state=agent_state,
        room=ctx.room,
        instructions="You are Eera from Zenx, a helpful sales assistant.",
    )

    groq_llm = livekit_openai.LLM(
        model="llama-3.1-8b-instant",
        api_key=config.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )

    session = AgentSession(
        llm=groq_llm,
        stt=deepgram.STT(
            model="nova-3",
            language="en",
            api_key=config.DEEPGRAM_API_KEY,
            endpointing_ms=600,
        ),
        tts=deepgram.TTS(
            model="aura-2-iris-en",
            api_key=config.DEEPGRAM_API_KEY,
        ),
        vad=silero.VAD.load(min_silence_duration=0.6),
    )

    @session.on("user_input_transcribed")
    def on_transcribed(event):
        print(f">>> STT: '{event.transcript}' (final={event.is_final})")

    @session.on("agent_state_changed")
    def on_state_changed(event):
        print(f">>> AGENT STATE: {event.old_state} -> {event.new_state}")

    @session.on("user_state_changed")
    def on_user_state(event):
        print(f">>> USER STATE: {event.old_state} -> {event.new_state}")

    @session.on("error")
    def on_error(event):
        print(f">>> SESSION ERROR: {event.error}")

    await session.start(room=ctx.room, agent=agent)
    agent._session = session  # store ref for graceful disconnect polling

    # ── Listen for text messages from frontend data channel ──────────
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            import json as _json
            payload = _json.loads(data_packet.data.decode("utf-8"))
            if payload.get("type") == "user_text":
                text = payload.get("text", "").strip()
                if text:
                    print(f">>> DATA CHANNEL TEXT: '{text}'")
                    asyncio.create_task(agent._process_user_turn(text))
        except Exception as exc:
            print(f">>> data_received parse error: {exc}")

    await asyncio.sleep(0.3)
    await session.say(GREETING, allow_interruptions=True)
    print("GREETING DONE — speak now!")

    disconnect_event = asyncio.Event()

    @ctx.room.on("disconnected")
    def _on_disconnected(*args):
        disconnect_event.set()

    @session.on("close")
    def _on_close(event):
        disconnect_event.set()

    await disconnect_event.wait()


if __name__ == "__main__":
    # When an agent_name is set, LiveKit can explicitly dispatch this worker into rooms.
    # Keep it stable across deploys so the token-server can request dispatch by name.
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "eera")
    # Use THREAD executor to avoid process-spawn issues on some PaaS containers.
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=agent_name,
            job_executor_type=JobExecutorType.THREAD,
            num_idle_processes=0,
        )
    )

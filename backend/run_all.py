import atexit
import os
import signal
import subprocess
import sys


def _start_agent_subprocess() -> subprocess.Popen:
    # Run the LiveKit agent as a separate process so it can block / manage its own event loop.
    # Use "start" for production (no hot reload).
    cmd = [sys.executable, "agent.py", "start"]
    return subprocess.Popen(cmd, cwd=os.path.dirname(__file__))


def main() -> None:
    agent_proc = _start_agent_subprocess()

    def _shutdown(*_args) -> None:
        try:
            if agent_proc.poll() is None:
                agent_proc.terminate()
        except Exception:
            pass

    atexit.register(_shutdown)
    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    # Start FastAPI without reload (prod-safe). Render injects PORT.
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("token_server:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()

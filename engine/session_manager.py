import logging
import os
import tempfile
import shutil
from typing import Dict, Optional

log = logging.getLogger(__name__)


class Session:
    def __init__(self, session_id: str, name: str):
        self.id = session_id
        self.name = name
        self.status = "idle"
        self.cwd = tempfile.mkdtemp(prefix=f"gods-session-{session_id}-")
        self.has_continuation = False
        self.last_prompt = ""
        self.last_response = ""
        self.context_summary = ""
        self.history = []  # list of {"role": "user"|"assistant", "text": "..."}

    def add_exchange(self, prompt: str, response: str):
        self.last_prompt = prompt
        self.last_response = response
        self.context_summary = response[:60]
        self.history.append({"role": "user", "text": prompt[:200]})
        self.history.append({"role": "assistant", "text": response[:200]})
        # Keep last 20 entries
        if len(self.history) > 20:
            self.history = self.history[-20:]

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "status": self.status,
            "context_summary": self.context_summary,
            "last_prompt": self.last_prompt, "last_response": self.last_response,
        }


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}
        self.active_id: Optional[str] = None
        self._counter = 0

    def create_session(self, name: str = "") -> Session:
        self._counter += 1
        sid = f"session_{self._counter}"
        if not name:
            name = f"Session {self._counter}"
        session = Session(sid, name)
        self.sessions[sid] = session
        if self.active_id is None:
            self.active_id = sid
        return session

    def get_active(self) -> Optional[Session]:
        if self.active_id:
            return self.sessions.get(self.active_id)
        return None

    def switch(self, sid: str) -> Optional[Session]:
        if sid in self.sessions:
            self.active_id = sid
            return self.sessions[sid]
        return None

    def close_session(self, sid: str) -> Optional[str]:
        if sid in self.sessions:
            session = self.sessions.pop(sid)
            try:
                shutil.rmtree(session.cwd, ignore_errors=True)
            except Exception:
                pass
            if self.active_id == sid:
                self.active_id = next(iter(self.sessions), None)
        return self.active_id

    def list_sessions(self):
        return [s.to_dict() for s in self.sessions.values()]

    def get_context_summary(self) -> str:
        parts = []
        for s in self.sessions.values():
            status = "working" if s.status == "running" else s.status
            parts.append(f"[{s.name}] ({status}): {s.context_summary or 'no activity yet'}")
        return " | ".join(parts) if parts else "No active sessions"


manager = SessionManager()

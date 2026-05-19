import base64
import logging
import tempfile
import os
from faster_whisper import WhisperModel

log = logging.getLogger(__name__)

from typing import Optional
_model: Optional[WhisperModel] = None


def get_model(model_size: str = "large-v3-turbo") -> WhisperModel:
    global _model
    if _model is None:
        log.info(f"Loading Whisper model: {model_size}")
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        log.info("Whisper model loaded")
    return _model


def transcribe_audio(audio_base64: str, model_size: str = "large-v3-turbo") -> str:
    audio_bytes = base64.b64decode(audio_base64)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        model = get_model(model_size)
        segments, info = model.transcribe(temp_path, language="en", beam_size=5)
        text = " ".join(seg.text.strip() for seg in segments).strip()
        log.info(f"Transcribed: '{text}' ({info.duration:.1f}s audio)")
        return text
    finally:
        os.unlink(temp_path)

import base64
import io
import logging
import numpy as np

log = logging.getLogger(__name__)

_pipeline = None


def get_pipeline(voice: str = "af_heart"):
    global _pipeline
    if _pipeline is None:
        log.info("Loading Kokoro TTS...")
        from kokoro import KPipeline
        _pipeline = KPipeline(lang_code="a")
        log.info("Kokoro TTS loaded")
    return _pipeline


def synthesize(text: str, voice: str = "af_heart") -> str:
    pipeline = get_pipeline(voice)

    samples = []
    for result in pipeline(text, voice=voice):
        samples.append(result.audio)

    if not samples:
        return ""

    audio = np.concatenate(samples)

    import soundfile as sf
    buffer = io.BytesIO()
    sf.write(buffer, audio, 24000, format="WAV")
    buffer.seek(0)

    audio_b64 = base64.b64encode(buffer.read()).decode("utf-8")
    log.info(f"Synthesized {len(text)} chars -> {len(audio)/24000:.1f}s audio")
    return audio_b64

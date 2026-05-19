import { useRef, useCallback } from 'react';
import { useAssistantStore } from '../stores/assistantStore';

export function useAudio() {
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const { setWaveformData } = useAssistantStore();

  const startRecording = useCallback(
    async (onAudioData: (base64: string) => void) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        analyser.getFloatTimeDomainData(dataArray);
        setWaveformData(new Float32Array(dataArray));
        rafRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        onAudioData(base64);
      };

      recorderRef.current = recorder;
      recorder.start(250);
    },
    [setWaveformData],
  );

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setWaveformData(new Float32Array(128));
  }, [setWaveformData]);

  return { startRecording, stopRecording };
}

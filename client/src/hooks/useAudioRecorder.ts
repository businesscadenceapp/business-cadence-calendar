/**
 * useAudioRecorder — platform-aware audio recording.
 *
 * On native (iOS/Android via Capacitor), uses capacitor-voice-recorder which
 * records with the OS-level recorder (AVAudioRecorder / MediaRecorder) and
 * returns base64 audio (aac/m4a on iOS, aac on Android).
 *
 * On web, uses the browser MediaRecorder API (webm/opus preferred).
 *
 * Both paths resolve to the same result shape: { base64, mimeType }.
 */
import { useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

export interface RecordingResult {
  base64: string;
  mimeType: string;
  /** Size in bytes (approximate for base64) */
  size: number;
}

const MAX_BYTES = 16 * 1024 * 1024; // 16MB limit shared with the server

export function useAudioRecorder() {
  const isNative = Capacitor.isNativePlatform();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopResolverRef = useRef<((r: RecordingResult) => void) | null>(null);
  const stopRejecterRef = useRef<((e: Error) => void) | null>(null);

  /** Start recording. Throws on permission denial or unsupported platform. */
  const start = useCallback(async () => {
    if (isNative) {
      const { VoiceRecorder } = await import("capacitor-voice-recorder");
      const perm = await VoiceRecorder.requestAudioRecordingPermission();
      if (!perm.value) {
        throw new Error("Microphone access denied. Please allow microphone access in your device settings.");
      }
      const started = await VoiceRecorder.startRecording();
      if (!started.value) {
        throw new Error("Could not start recording on this device.");
      }
      return;
    }

    // Web path
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
      if (blob.size > MAX_BYTES) {
        stopRejecterRef.current?.(new Error("Recording is too large (max 16 MB). Please record a shorter meeting."));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        stopResolverRef.current?.({ base64, mimeType: mimeType || "audio/webm", size: blob.size });
      };
      reader.readAsDataURL(blob);
    };
    recorder.start(1000);
  }, [isNative]);

  /** Stop recording and resolve with the captured audio. */
  const stop = useCallback(async (): Promise<RecordingResult> => {
    if (isNative) {
      const { VoiceRecorder } = await import("capacitor-voice-recorder");
      const result = await VoiceRecorder.stopRecording();
      const base64 = result.value.recordDataBase64;
      if (!base64) {
        throw new Error("Recording failed — no audio was captured.");
      }
      const mimeType = result.value.mimeType || "audio/aac";
      const size = Math.floor((base64.length * 3) / 4);
      if (size > MAX_BYTES) {
        throw new Error("Recording is too large (max 16 MB). Please record a shorter meeting.");
      }
      return { base64, mimeType, size };
    }

    return new Promise<RecordingResult>((resolve, reject) => {
      stopResolverRef.current = resolve;
      stopRejecterRef.current = reject;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        reject(new Error("No active recording."));
      }
    });
  }, [isNative]);

  /** Abort any in-flight recording without resolving. */
  const cancel = useCallback(async () => {
    if (isNative) {
      try {
        const { VoiceRecorder } = await import("capacitor-voice-recorder");
        await VoiceRecorder.stopRecording();
      } catch { /* not recording */ }
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, [isNative]);

  return { start, stop, cancel, isNative };
}

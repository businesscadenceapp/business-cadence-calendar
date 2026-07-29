/**
 * RecordMeeting — Voice recording page for meeting notes
 * Uses capacitor-voice-recorder on native iOS/Android
 * Falls back to browser MediaRecorder on web
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

// Lazy-load the Capacitor voice recorder only on native to avoid web build errors
async function getNativeRecorder() {
  const { VoiceRecorder } = await import("capacitor-voice-recorder");
  return VoiceRecorder;
}

type RecordingState = "idle" | "requesting" | "recording" | "paused" | "processing" | "done" | "error";

const MEETING_LABELS: Record<string, string> = {
  daily: "Daily Huddle",
  weekly: "Weekly Meeting",
  monthly: "Monthly Review",
  quarterly: "Quarterly Review",
};

export default function RecordMeeting() {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const isNative = Capacitor.isNativePlatform();

  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<string>("weekly");
  const [noteTitle, setNoteTitle] = useState("");

  // Web refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transcribeMutation = trpc.meeting.transcribeRecording.useMutation({
    onSuccess: (data) => {
      setTranscript(data.transcript);
      setState("done");
    },
    onError: () => {
      toast.error("Transcription failed. You can still save the recording.");
      setState("done");
    },
  });

  const saveMutation = trpc.meeting.saveNote.useMutation({
    onSuccess: () => {
      toast.success("Meeting note saved.");
      navigate("/app/board");
    },
    onError: () => toast.error("Failed to save note."),
  });

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ─── Native recording (Capacitor) ────────────────────────────────────────
  const startNative = async () => {
    setState("requesting");
    try {
      const VoiceRecorder = await getNativeRecorder();
      const perm = await VoiceRecorder.requestAudioRecordingPermission();
      if (!perm.value) {
        toast.error("Microphone permission denied.");
        setState("idle");
        return;
      }
      await VoiceRecorder.startRecording();
      setState("recording");
      startTimer();
    } catch (e) {
      console.error(e);
      toast.error("Could not start recording.");
      setState("idle");
    }
  };

  const stopNative = async () => {
    stopTimer();
    setState("processing");
    try {
      const VoiceRecorder = await getNativeRecorder();
      const result = await VoiceRecorder.stopRecording();
      // result.value.recordDataBase64 is the base64 audio
      const base64 = result.value.recordDataBase64;
      const mimeType = result.value.mimeType ?? "audio/aac";
      // Convert base64 to blob and upload via tRPC
      const byteChars = atob(base64 ?? "");
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      await uploadAndTranscribe(blob, mimeType);
    } catch (e) {
      console.error(e);
      toast.error("Failed to stop recording.");
      setState("error");
    }
  };

  // ─── Web recording (MediaRecorder) ───────────────────────────────────────
  const startWeb = async () => {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await uploadAndTranscribe(blob, mimeType);
      };
      recorder.start(1000);
      setState("recording");
      startTimer();
    } catch (e) {
      console.error(e);
      toast.error("Microphone access denied or not available.");
      setState("idle");
    }
  };

  const stopWeb = () => {
    stopTimer();
    setState("processing");
    mediaRecorderRef.current?.stop();
  };

  // ─── Shared upload + transcribe ───────────────────────────────────────────
  const uploadAndTranscribe = async (blob: Blob, mimeType: string) => {
    try {
      // Convert blob to base64 for tRPC transport
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        transcribeMutation.mutate({
          audioUrl: `data:${mimeType};base64,${base64}`,
          meetingType: meetingType as "daily" | "weekly" | "monthly" | "quarterly",
        });
      };
    } catch (e) {
      console.error(e);
      setState("error");
    }
  };

  const handleStart = () => (isNative ? startNative() : startWeb());
  const handleStop = () => (isNative ? stopNative() : stopWeb());

  const handleSave = () => {
    if (!transcript && !noteTitle) {
      toast.error("Add a title or wait for transcription.");
      return;
    }
    saveMutation.mutate({
      accountId: person?.accountId ?? 0,
      personId: String(person?.id ?? ""),
      meetingType: meetingType as "daily" | "weekly" | "monthly" | "quarterly",
      title: noteTitle || `${MEETING_LABELS[meetingType] ?? "Meeting"} Notes`,
      transcript: transcript ?? "",
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F2440" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => navigate(-1 as unknown as string)}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Record Meeting
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8">
        {/* Meeting type selector */}
        {state === "idle" && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Meeting Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MEETING_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMeetingType(key)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: meetingType === key ? "rgba(94,234,212,0.15)" : "rgba(255,255,255,0.04)",
                    border: meetingType === key ? "1.5px solid #5EEAD4" : "1.5px solid rgba(255,255,255,0.1)",
                    color: meetingType === key ? "#5EEAD4" : "rgba(255,255,255,0.6)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recording indicator */}
        <div className="flex flex-col items-center gap-4">
          {state === "recording" && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#F87171" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#F87171", fontFamily: "'JetBrains Mono', monospace" }}>
                Recording
              </span>
            </div>
          )}

          {(state === "recording" || state === "paused") && (
            <p className="text-4xl font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatTime(elapsed)}
            </p>
          )}

          {state === "processing" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#5EEAD4", borderTopColor: "transparent" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                Transcribing…
              </p>
            </div>
          )}
        </div>

        {/* Main action button */}
        {(state === "idle" || state === "requesting") && (
          <button
            onClick={handleStart}
            disabled={state === "requesting"}
            className="w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #F87171, #EF4444)",
              boxShadow: "0 0 40px rgba(248,113,113,0.4)",
              opacity: state === "requesting" ? 0.6 : 1,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="11" y="6" width="10" height="18" rx="5" fill="white"/>
              <path d="M6 16a10 10 0 0020 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="26" x2="16" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={handleStop}
            className="w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: "rgba(248,113,113,0.15)",
              border: "2.5px solid #F87171",
              boxShadow: "0 0 30px rgba(248,113,113,0.2)",
            }}
          >
            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: "#F87171" }} />
          </button>
        )}

        {/* Transcript + save */}
        {state === "done" && (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
                Transcript
              </p>
              {transcript ? (
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}>
                  {transcript}
                </p>
              ) : (
                <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                  No transcript available.
                </p>
              )}
            </div>

            <input
              type="text"
              placeholder="Note title (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "'Inter', sans-serif",
              }}
            />

            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #0EA5E9)",
                color: "#0F2440",
                fontFamily: "'Space Grotesk', sans-serif",
                opacity: saveMutation.isPending ? 0.6 : 1,
              }}
            >
              {saveMutation.isPending ? "Saving…" : "Save to Board"}
            </button>

            <button
              onClick={() => { setState("idle"); setTranscript(null); setElapsed(0); }}
              className="w-full py-2.5 rounded-xl text-sm transition-all"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Record again
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm" style={{ color: "#F87171" }}>Recording failed. Please try again.</p>
            <button
              onClick={() => setState("idle")}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(248,113,113,0.15)", border: "1px solid #F87171", color: "#F87171" }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Platform indicator */}
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          {isNative ? "Native microphone" : "Browser microphone"}
        </p>
      </div>
    </div>
  );
}

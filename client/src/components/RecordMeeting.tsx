import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Mic, Square, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface RecordMeetingProps {
  dateKey: string;
  meetingType: "daily" | "weekly" | "monthly" | "quarterly";
  agendaItems?: string[];
}

type RecordingState = "idle" | "recording" | "uploading" | "done" | "error";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _recordingStateCheck: RecordingState = "recording"; // ensure type is complete

interface ParsedNotes {
  summary: string;
  actionItems: string[];
  resolvedItems: string[];
  keyDecisions: string[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordMeeting({ dateKey, meetingType, agendaItems }: RecordMeetingProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsedNotes, setParsedNotes] = useState<ParsedNotes | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useAudioRecorder();

  // Fetch existing recording for this meeting
  const { data: existingData, refetch: refetchRecording } = trpc.recording.get.useQuery(
    { dateKey, meetingType },
    { retry: false }
  );

  const processMutation = trpc.recording.process.useMutation({
    onSuccess: (data) => {
      setState("done");
      setTranscript(data.transcript);
      const parsed = (() => {
        try { return JSON.parse(data.aiNotes) as ParsedNotes; } catch { return null; }
      })();
      setParsedNotes(parsed);
      refetchRecording();
    },
    onError: (err) => {
      setState("error");
      setErrorMsg(err.message || "Processing failed. Please try again.");
    },
  });

  // Load existing recording on mount
  useEffect(() => {
    if (existingData?.recording && existingData.recording.processingStatus === "done") {
      const rec = existingData.recording;
      if (rec.transcript) setTranscript(rec.transcript);
      if (rec.aiNotes) {
        const parsed = (() => {
          try { return JSON.parse(rec.aiNotes) as ParsedNotes; } catch { return null; }
        })();
        setParsedNotes(parsed);
        setState("done");
      }
    }
  }, [existingData]);

  // Timer
  useEffect(() => {
    if ((state as string) === "recording") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state !== "recording") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const startRecording = useCallback(async () => {
    setErrorMsg("");
    setParsedNotes(null);
    setTranscript("");

    try {
      await recorder.start();
      setState("recording");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setErrorMsg("Microphone access denied. Please allow microphone access in your settings.");
      } else {
        setErrorMsg(`Could not start recording: ${msg}`);
      }
      setState("error");
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    setState("uploading");
    try {
      const result = await recorder.stop();
      processMutation.mutate({
        dateKey,
        meetingType,
        audioBase64: result.base64,
        mimeType: result.mimeType,
        agendaItems,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState("error");
      setErrorMsg(msg);
    }
  }, [recorder, dateKey, meetingType, agendaItems, processMutation]);

  const resetRecording = useCallback(() => {
    setState("idle");
    setErrorMsg("");
    setParsedNotes(null);
    setTranscript("");
    setElapsed(0);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="mt-4 rounded-xl border border-[#E8E4DC] bg-[#FDFCFA] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#1E3A5F]" />
          <span className="text-sm font-semibold text-[#1E3A5F]">Meeting Recording</span>
        </div>
        {(state === "done" || parsedNotes) && (
          <button
            onClick={() => setNotesExpanded(e => !e)}
            className="text-xs text-[#0D9488] flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            {notesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {notesExpanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Idle state */}
        {state === "idle" && !parsedNotes && (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-[#6B7280] text-center">
              Record your meeting to auto-generate notes, action items, and key decisions.
            </p>
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E3A5F] text-white text-sm font-medium
                         hover:bg-[#162D4A] active:scale-[0.97] transition-all duration-150"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>
          </div>
        )}

        {/* Recording state */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-mono text-[#1A1F2E] font-semibold">{formatDuration(elapsed)}</span>
              <span className="text-xs text-[#6B7280]">Recording…</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 text-white text-sm font-medium
                         hover:bg-red-600 active:scale-[0.97] transition-all duration-150"
            >
              <Square className="w-4 h-4 fill-white" />
              Stop Recording
            </button>
          </div>
        )}

        {/* Uploading / processing state */}
        {state === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" />
            <p className="text-sm text-[#1A1F2E] font-medium">Processing your recording…</p>
            <p className="text-xs text-[#6B7280] text-center">
              Transcribing audio and extracting meeting notes. This may take 30–60 seconds.
            </p>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Recording Failed</span>
            </div>
            <p className="text-xs text-red-500 text-center max-w-xs">{errorMsg}</p>
            <button
              onClick={resetRecording}
              className="text-xs text-[#0D9488] underline hover:opacity-80 transition-opacity"
            >
              Try again
            </button>
          </div>
        )}

        {/* Done state — show AI notes */}
        {(state === "done" || parsedNotes) && notesExpanded && (
          <div className="space-y-3">
            {/* Re-record button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#0D9488]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">AI Notes Generated</span>
              </div>
              <button
                onClick={resetRecording}
                className="text-xs transition-colors flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <Mic className="w-3 h-3" />
                Re-record
              </button>
            </div>

            {parsedNotes ? (
              <div className="space-y-3">
                {/* Summary */}
                {parsedNotes.summary && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.2)" }}>
                    <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#5EEAD4" }}>Summary</p>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{parsedNotes.summary}</p>
                  </div>
                )}

                {/* Action Items */}
                {parsedNotes.actionItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Action Items</p>
                    <ul className="space-y-1">
                      {parsedNotes.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                          <span className="mt-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 font-bold" style={{ backgroundColor: "rgba(94,234,212,0.2)", color: "#5EEAD4" }}>
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Decisions */}
                {parsedNotes.keyDecisions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Key Decisions</p>
                    <ul className="space-y-1">
                      {parsedNotes.keyDecisions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                          <span className="mt-0.5 text-[#0D9488]">◆</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resolved Items */}
                {parsedNotes.resolvedItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Resolved</p>
                    <ul className="space-y-1">
                      {parsedNotes.resolvedItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm line-through" style={{ color: "rgba(255,255,255,0.3)" }}>
                          <CheckCircle2 className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5 no-underline" style={{ textDecoration: "none" }} />
                          <span className="no-underline" style={{ textDecoration: "none" }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.35)" }}>Notes could not be parsed. See transcript below.</p>
            )}

            {/* Transcript toggle */}
            {transcript && (
              <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setShowTranscript(t => !t)}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <Clock className="w-3 h-3" />
                  {showTranscript ? "Hide" : "Show"} full transcript
                  {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showTranscript && (
                  <div className="mt-2 rounded-lg p-3 max-h-48 overflow-y-auto" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.45)" }}>{transcript}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

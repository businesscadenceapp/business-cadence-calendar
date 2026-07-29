import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface MeetingNotesProps {
  accountId: number;
  personId: string;
  businessId: number;
  meetingType: "daily" | "weekly" | "monthly" | "quarterly";
  meetingDate: string; // YYYY-MM-DD
}

/**
 * MeetingNotes — a simple typed-notes panel for a specific meeting.
 * Owners can type notes during or after a meeting. Notes auto-save after 800ms.
 * Both owners share the same note per meeting (last write wins).
 */
export default function MeetingNotes({
  accountId,
  personId,
  businessId,
  meetingType,
  meetingDate,
}: MeetingNotesProps) {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = trpc.meetingNotes.get.useQuery(
    { accountId, businessId, meetingType, meetingDate },
    { enabled: accountId > 0, staleTime: 30_000 }
  );

  const saveMutation = trpc.meetingNotes.save.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  // Load existing note once
  useEffect(() => {
    if (data !== undefined && !loaded) {
      setBody(data.note?.body ?? "");
      setLoaded(true);
    }
  }, [data, loaded]);

  const handleChange = useCallback(
    (val: string) => {
      setBody(val);
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate({ accountId, personId, businessId, meetingType, meetingDate, body: val });
      }, 800);
    },
    [accountId, personId, businessId, meetingType, meetingDate]
  );

  const handleSaveNow = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveMutation.mutate({ accountId, personId, businessId, meetingType, meetingDate, body });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Meeting Notes
        </span>
        {saveStatus === "saving" && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Saving…
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-[10px]" style={{ color: "#0D9488" }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={body}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleSaveNow}
        placeholder="Type your meeting notes here…"
        rows={5}
        className="w-full resize-none rounded-lg px-3 py-2.5 text-sm leading-relaxed transition-colors focus:outline-none"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.85)",
          fontFamily: "'Inter', sans-serif",
          caretColor: "#0D9488",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(13,148,136,0.5)";
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
        }}
      />

      {/* Character count hint */}
      {body.length > 0 && (
        <p className="text-[10px] text-right" style={{ color: "rgba(255,255,255,0.2)" }}>
          {body.length.toLocaleString()} chars
        </p>
      )}
    </div>
  );
}

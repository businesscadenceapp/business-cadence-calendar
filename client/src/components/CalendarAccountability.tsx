import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";

type Props = {
  accountId?: number;
  showCorner?: boolean;
  showCheckIn?: boolean;
};

const MEETING_LABELS = {
  daily: "Daily Huddle",
  weekly: "Weekly Review",
  monthly: "Monthly Finance Review",
  quarterly: "Quarterly Offsite",
} as const;

function formatTime(time: string) {
  const [hourString, minute = "00"] = time.split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function prettyDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Command Center reminder surface. The small corner notification introduces the
 * next meeting; the accountability card intentionally lives above the circles
 * because a broken cadence belongs in "Needs Attention," not in a hidden tab.
 */
export function CalendarAccountability({ accountId, showCorner = true, showCheckIn = true }: Props) {
  const [, navigate] = useLocation();
  const { data } = trpc.calendarAccountability.getDashboard.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 60_000, refetchOnWindowFocus: true },
  );
  const [nextOpen, setNextOpen] = useState(false);
  const [checkInVisible, setCheckInVisible] = useState(false);

  useEffect(() => {
    if (!data?.showCheckIn || !accountId) {
      setCheckInVisible(false);
      return;
    }
    const snoozedUntil = Number(localStorage.getItem(`bcc_cadence_snooze_${accountId}`) ?? "0");
    setCheckInVisible(snoozedUntil <= Date.now());
  }, [accountId, data?.showCheckIn]);

  if (!accountId || !data) return null;
  const next = data.nextMeeting;

  const openCalendar = (dateKey?: string) => {
    navigate(dateKey ? `/app/calendar?date=${dateKey}` : "/app/calendar");
  };

  const snooze = () => {
    localStorage.setItem(`bcc_cadence_snooze_${accountId}`, String(Date.now() + 1000 * 60 * 60 * 24));
    setCheckInVisible(false);
  };

  return (
    <>
      {showCorner && next && (
        <div style={{ position: "absolute", top: 16, right: 20, zIndex: 30 }}>
          <button
            type="button"
            onClick={() => setNextOpen((open) => !open)}
            aria-label={`Your next meeting is ${MEETING_LABELS[next.meetingType]} at ${formatTime(next.time)}`}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(51,162,219,0.32), rgba(51,162,219,0.16))",
              border: "1px solid rgba(86,195,247,0.55)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.24)",
            }}
          >
            <span aria-hidden="true" className="text-lg">📅</span>
          </button>
          <span
            aria-hidden="true"
            style={{
              position: "absolute", top: -4, right: -4, minWidth: 18, height: 18,
              padding: "0 4px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: "#38BDF8", color: "#08213A", fontSize: 10, fontWeight: 900,
              border: "2px solid #0D2035",
            }}
          >1</span>

          {nextOpen && (
            <div
              role="dialog"
              aria-label="Next meeting"
              className="mt-2 rounded-2xl p-4"
              style={{
                width: 276, background: "#12314F", border: "1px solid rgba(86,195,247,0.45)",
                boxShadow: "0 16px 36px rgba(0,0,0,0.42)",
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#75D1FB" }}>Next on your cadence</p>
              <p className="mt-1 text-[15px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Your next meeting is a {MEETING_LABELS[next.meetingType]} at {formatTime(next.time)}.
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.58)" }}>{prettyDate(next.date)}</p>
              <button
                type="button"
                onClick={() => openCalendar(next.date)}
                className="mt-4 w-full min-h-11 rounded-xl text-[13px] font-black transition-transform active:scale-[0.98]"
                style={{ background: "#38BDF8", color: "#08213A", position: "relative", zIndex: 100 }}
              >
                Confirm & open Calendar →
              </button>
            </div>
          )}
        </div>
      )}

      {showCheckIn && checkInVisible && (
        <section
          aria-label="Cadence Check-in"
          className="mb-4 rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(217,70,239,0.08))",
            border: "1px solid rgba(251,191,36,0.45)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.32)" }}>🗓️</div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cadence Check-in</p>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                {data.missedMeetings.length} scheduled meetings have not been logged. Is your current rhythm still realistic?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => openCalendar()} className="min-h-9 px-3 rounded-lg text-[12px] font-bold active:scale-[0.97]" style={{ background: "#FBBF24", color: "#382500", position: "relative", zIndex: 100 }}>Open Calendar</button>
                <button type="button" onClick={() => navigate("/app/manage-schedule")} className="min-h-9 px-3 rounded-lg text-[12px] font-bold active:scale-[0.97]" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "white", position: "relative", zIndex: 100 }}>Adjust Cadence</button>
                <button type="button" onClick={snooze} className="min-h-9 px-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.58)", position: "relative", zIndex: 100 }}>Not now</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

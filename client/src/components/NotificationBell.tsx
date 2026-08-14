/**
 * NotificationBell — in-app notification centre
 * Shows a bell icon with an unread badge. Clicking opens a dropdown panel
 * listing the most recent 50 notifications for the current person.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// ─── Type icons & colours ────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; accent: string; label: string }> = {
  task_assigned:    { icon: "📋", accent: "#7C3AED", label: "Task assigned" },
  task_done_pending:{ icon: "⏳", accent: "#D97706", label: "Awaiting confirmation" },
  task_confirmed:   { icon: "✅", accent: "#16A34A", label: "Task confirmed" },
  new_update:       { icon: "📣", accent: "#0369A1", label: "New update" },
  new_issue:        { icon: "⚠️", accent: "#DC2626", label: "New issue" },
  overdue_task:     { icon: "⚠️", accent: "#F59E0B", label: "Overdue task" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  accountId: number | undefined;
  personId: string | undefined;
}

export function NotificationBell({ accountId, personId }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const enabled = !!accountId && !!personId;
  const { data: personalStatus } = trpc.personHours.checkStatus.useQuery(
    { accountId: accountId ?? 0, personId: personId ?? "" },
    { enabled, refetchInterval: 15_000, staleTime: 10_000 }
  );
  const sleepMode = personalStatus?.dndActive ?? false;
  const notificationsHeld = personalStatus?.notificationsHeld ?? false;
  const notificationHoldMessage = sleepMode
    ? "Sleep Mode is on — notifications are held until Work Mode"
    : "Notifications are held until your work hours resume";
  const presentationEnabled = enabled && !notificationsHeld;

  useEffect(() => {
    if (notificationsHeld) setOpen(false);
  }, [notificationsHeld]);

  // Unread count — polled every 30 s for the badge
  const { data: countData, refetch: refetchCount } = trpc.notification.unreadCount.useQuery(
    { accountId: accountId ?? 0, personId: personId ?? "" },
    { enabled: presentationEnabled, refetchInterval: presentationEnabled ? 30_000 : false, staleTime: 15_000 }
  );
  const unreadCount = notificationsHeld ? 0 : (countData?.count ?? 0);

  // Full list — fetched when panel opens.
  const { data: listData, refetch: refetchList } = trpc.notification.list.useQuery(
    { accountId: accountId ?? 0, personId: personId ?? "" },
    { enabled: presentationEnabled && open, staleTime: 5_000 }
  );
  const notifications = listData?.items ?? [];

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchList();
    },
  });

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => refetchCount(),
  });

  // When panel opens, mark all as read after a short delay
  useEffect(() => {
    if (open && enabled && unreadCount > 0) {
      const t = setTimeout(() => {
        markAllRead.mutate({ accountId: accountId!, personId: personId! });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotifClick = useCallback((notif: { id: number; isRead: boolean; linkTo: string }) => {
    if (!notif.isRead) markRead.mutate({ id: notif.id });
    setOpen(false);
    navigate(notif.linkTo);
  }, [navigate, markRead]);

  return (
    <div ref={panelRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button */}
      <button
        onClick={() => { if (!notificationsHeld) setOpen(v => !v); }}
        aria-label={notificationsHeld ? notificationHoldMessage : `Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        title={notificationsHeld ? notificationHoldMessage : "Notifications"}
        style={{
          position: "relative",
          background: open ? "rgba(124,58,237,0.12)" : "transparent",
          border: "none",
          borderRadius: "10px",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 160ms cubic-bezier(0.23,1,0.32,1)",
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {notificationsHeld ? (
          <span aria-hidden="true" style={{ fontSize: "17px", lineHeight: 1 }}>🌙</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? "#7C3AED" : "#64748B"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
          backgroundColor: "#DC2626",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
              boxShadow: "0 0 0 2px #fff",
              animation: "notif-pulse 2s ease-in-out infinite",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 58px)",
            right: "12px",
            width: "min(320px, calc(100vw - 24px))",
            maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 80px)",
            background: "#fff",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(30,58,95,0.18), 0 2px 8px rgba(30,58,95,0.08)",
            border: "1.5px solid #E2E8F0",
            zIndex: 9999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "notif-panel-in 180ms cubic-bezier(0.23,1,0.32,1)",
            transformOrigin: "top right",
          }}
        >
          {/* Header */}
          <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E3A5F", fontFamily: "'Space Grotesk', sans-serif" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => enabled && markAllRead.mutate({ accountId: accountId!, personId: personId! })}
                style={{ fontSize: "11px", color: "#7C3AED", background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, padding: "2px 6px", borderRadius: "6px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔔</div>
                <p style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              notifications.map(notif => {
                const meta = TYPE_META[notif.type] ?? { icon: "🔔", accent: "#64748B", label: notif.type };
                const isUnread = !notif.isRead;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isUnread ? "rgba(124,58,237,0.04)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid #F8FAFC",
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      transition: "background 120ms ease-out",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.07)")}
                    onMouseLeave={e => (e.currentTarget.style.background = isUnread ? "rgba(124,58,237,0.04)" : "transparent")}
                  >
                    {/* Icon bubble */}
                    <span style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: `${meta.accent}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      flexShrink: 0,
                    }}>
                      {meta.icon}
                    </span>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span style={{
                          fontSize: "12px",
                          fontWeight: isUnread ? 700 : 600,
                          color: "#1E3A5F",
                          fontFamily: "'Space Grotesk', sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}>
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7C3AED", flexShrink: 0 }} />
                        )}
                      </div>
                      <p style={{
                        fontSize: "11px",
                        color: "#64748B",
                        fontFamily: "'Inter', sans-serif",
                        margin: 0,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: "1.4",
                      }}>
                        {notif.body}
                      </p>
                      <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", marginTop: "3px", display: "block" }}>
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "8px 14px", borderTop: "1px solid #F1F5F9", textAlign: "center" }}>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}>
                Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes notif-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes notif-panel-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

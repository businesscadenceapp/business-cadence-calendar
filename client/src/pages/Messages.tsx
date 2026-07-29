import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, MessageSquare, Megaphone, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerMessage {
  id: number;
  accountId: number;
  fromPersonId: string;
  toPersonId: string;
  body: string;
  createdAt: Date;
}

interface Announcement {
  id: number;
  accountId: number;
  fromPersonId: string;
  toPersonId: string | null;
  body: string;
  createdAt: Date;
}

// ─── Partner Chat Tab ─────────────────────────────────────────────────────────

function PartnerChat({ accountId, personId, partnerId, partnerName, myName }: {
  accountId: number;
  personId: string;
  partnerId: string;
  partnerName: string;
  myName: string;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.ownerMessages.list.useQuery(
    { accountId },
    { refetchInterval: 8000 }
  );

  const sendMsg = trpc.ownerMessages.send.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.ownerMessages.list.invalidate({ accountId });
    },
    onError: () => toast.error("Failed to send"),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !partnerId) return;
    sendMsg.mutate({ accountId, fromPersonId: personId, toPersonId: partnerId, body });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No messages yet.</p>
            <p className="text-muted-foreground/60 text-xs">Send a message to {partnerName} to get started.</p>
          </div>
        )}
        {messages.map((msg: OwnerMessage) => {
          const isMe = msg.fromPersonId === personId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isMe
                  ? "bg-teal-500/20 text-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                {!isMe && (
                  <p className="text-xs font-semibold text-teal-400 mb-1">{partnerName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${partnerName}...`}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sendMsg.isPending}
          className="h-11 w-11 bg-teal-500 hover:bg-teal-600 text-white shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab({ accountId, personId, isOwner }: {
  accountId: number;
  personId: string;
  isOwner: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [recipientId, setRecipientId] = useState<string>("all");
  const utils = trpc.useUtils();

  // Owner sees all; employee sees only their own
  const { data: allData } = trpc.announcements.listAll.useQuery(
    { accountId },
    { enabled: isOwner, refetchInterval: 10000 }
  );
  const { data: myData } = trpc.announcements.list.useQuery(
    { accountId, personId },
    { enabled: !isOwner, refetchInterval: 10000 }
  );

  const { data: personsData } = trpc.person.list.useQuery(
    { accountId },
    { enabled: isOwner }
  );

  const employees = (personsData ?? []).filter((p: { role: string }) => p.role === "employee");

  const sendAnnouncement = trpc.announcements.send.useMutation({
    onSuccess: () => {
      setDraft("");
      setRecipientId("all");
      utils.announcements.listAll.invalidate({ accountId });
      toast.success("Announcement sent");
    },
    onError: () => toast.error("Failed to send"),
  });

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    sendAnnouncement.mutate({
      accountId,
      fromPersonId: personId,
      toPersonId: recipientId === "all" ? null : recipientId,
      body,
    });
  };

  const items: Announcement[] = isOwner ? (allData?.items ?? []) : (myData?.items ?? []);

  return (
    <div className="flex flex-col h-full">
      {/* Announcements list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Megaphone className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No announcements yet.</p>
            {isOwner && <p className="text-muted-foreground/60 text-xs">Post a message to your team below.</p>}
          </div>
        )}
        {items.map((item: Announcement) => (
          <div key={item.id} className="bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Announcement</span>
              </div>
              <div className="flex items-center gap-2">
                {item.toPersonId === null ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-400">
                    <Users className="w-2.5 h-2.5 mr-1" />All Employees
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-400">
                    Direct
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      {/* Owner composer */}
      {isOwner && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {employees.length > 0 && (
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Send to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp: { id: string; name: string }) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Write an announcement..."
              className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!draft.trim() || sendAnnouncement.isPending}
              className="h-11 w-11 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Messages Page ───────────────────────────────────────────────────────

export default function Messages() {
  const { person } = usePerson();
  const [activeTab, setActiveTab] = useState<"chat" | "announcements">("chat");

  const isOwner = person?.role === "owner";

  // Find the co-owner (partner) for the chat tab
  const { data: personsData } = trpc.person.list.useQuery(
    { accountId: person?.accountId ?? 0 },
    { enabled: !!person }
  );

  const partner = (personsData ?? []).find(
    (p: { id: string; role: string }) => p.id !== person?.id && p.role === "owner"
  );

  if (!person) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page header */}
      <div className="px-4 pt-4 pb-0 shrink-0">
        <h1 className="text-xl font-bold text-foreground mb-3">Messages</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {isOwner && (
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Partner Chat
            </button>
          )}
          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === "announcements"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            {isOwner ? "Announcements" : "From Owners"}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 mt-1">
        {activeTab === "chat" && isOwner && (
          partner ? (
            <PartnerChat
              accountId={person.accountId}
              personId={person.id}
              partnerId={partner.id}
              partnerName={partner.name}
              myName={person.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No partner found.</p>
              <p className="text-muted-foreground/60 text-xs">
                Invite your co-owner from Settings to enable the partner chat.
              </p>
            </div>
          )
        )}
        {activeTab === "announcements" && (
          <AnnouncementsTab
            accountId={person.accountId}
            personId={person.id}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}

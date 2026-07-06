import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
// ─── Logo ─────────────────────────────────────────────────────────────────
function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <img
      src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
      alt="BusinessCadence"
      style={{ height, width: "auto", objectFit: "contain", display: "block" }}
      className={className}
    />
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────
function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F8F7F4]/95 backdrop-blur-sm border-b border-[#E2E0DB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <div style={{ filter: "drop-shadow(0 2px 0px rgba(30,58,95,0.30)) drop-shadow(0 5px 10px rgba(30,58,95,0.18)) saturate(1.4) brightness(0.92)" }}>
            <Logo height={80} />
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo("problem")} className="text-sm text-[#64748B] hover:text-[#1E3A5F] transition-colors">
              The Problem
            </button>
            <button onClick={() => scrollTo("features")} className="text-sm text-[#64748B] hover:text-[#1E3A5F] transition-colors">
              Features
            </button>
            <button onClick={() => scrollTo("story")} className="text-sm text-[#64748B] hover:text-[#1E3A5F] transition-colors">
              Our Story
            </button>
            <a
              href="/login"
              className="text-sm text-[#0D9488] font-medium hover:text-[#0a7a70] transition-colors border border-[#0D9488]/30 px-4 py-2 rounded-lg hover:border-[#0D9488]/60 hover:bg-[#CCFBF1]/40"
            >
              Client Login
            </a>
            <button
              onClick={() => scrollTo("waitlist")}
              className="bg-[#1E3A5F] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#162d4a] transition-colors active:scale-[0.97]"
            >
              Join the Waitlist
            </button>
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-[#64748B] hover:text-[#1E3A5F]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
          {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#E2E0DB] py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo("problem")} className="text-sm text-[#64748B] text-left px-2">The Problem</button>
            <button onClick={() => scrollTo("features")} className="text-sm text-[#64748B] text-left px-2">Features</button>
            <button onClick={() => scrollTo("story")} className="text-sm text-[#64748B] text-left px-2">Our Story</button>
            <a href="/login" className="text-sm text-[#0D9488] font-medium px-2">Client Login</a>
            <button
              onClick={() => scrollTo("waitlist")}
              className="bg-[#1E3A5F] text-white text-sm font-medium px-5 py-2 rounded-lg mx-2"
            >
              Join the Waitlist
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Waitlist form (reusable) ──────────────────────────────────────────────
function WaitlistForm({ variant = "default" }: { variant?: "default" | "hero" | "footer" }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const join = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info("You're already on the list!", {
          description: "We'll reach out when BusinessCadence launches.",
        });
      } else {
        setSubmitted(true);
        toast.success("You're on the list!", {
          description: "We'll notify you the moment BusinessCadence launches.",
        });
      }
      setEmail("");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    join.mutate({ email: email.trim() });
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-3 ${variant === "hero" ? "justify-center" : ""}`}>
        <div className="w-10 h-10 rounded-full bg-[#CCFBF1] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#0D9488]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className={`font-medium ${variant === "footer" ? "text-white" : "text-[#1E3A5F]"}`}>
          You're on the list — we'll be in touch!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-3 ${variant === "hero" ? "flex-col sm:flex-row justify-center max-w-md mx-auto" : "flex-col sm:flex-row max-w-md"}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        className={`flex-1 px-4 py-3 rounded-lg border text-sm outline-none transition-all
          ${variant === "footer"
            ? "bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50"
            : "bg-white border-[#E2E0DB] text-[#1A1A2E] placeholder:text-[#94A3B8] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
          }`}
      />
      <button
        type="submit"
        disabled={join.isPending}
        className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] whitespace-nowrap
          ${variant === "footer"
            ? "bg-white text-[#1E3A5F] hover:bg-[#F1F0ED]"
            : "bg-[#1E3A5F] text-white hover:bg-[#162d4a]"
          } disabled:opacity-60`}
      >
        {join.isPending ? "Joining..." : "Join the Waitlist"}
      </button>
    </form>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  const { data } = trpc.waitlist.count.useQuery();

  return (
    <section className="pt-32 pb-20 px-4 bg-[#F8F7F4]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#CCFBF1] text-[#0D9488] text-xs font-semibold px-4 py-1.5 rounded-full mb-8 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
              Coming Soon — Join the Waitlist
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-[#1E3A5F] leading-tight mb-6 animate-fade-up">
              Stop Texting Your Partner{" "}
              <span className="text-[#0D9488]">Business at 1am.</span>
            </h1>

            <p className="text-lg text-[#64748B] mb-4 leading-relaxed animate-fade-up animation-delay-100">
              You have an idea at midnight. You text your partner. They read it at 7am — during breakfast, during their workout, during what was supposed to be their time. Now they're thinking about work again.
            </p>
            <p className="text-lg text-[#64748B] mb-10 leading-relaxed animate-fade-up animation-delay-100">
              <strong className="text-[#1E3A5F]">BusinessCadence is the place that idea goes instead.</strong> Capture it now. It waits. Your partner sees it when they're ready — at the right time, with the right headspace, in a structured meeting that actually resolves things.
            </p>

            <div className="animate-fade-up animation-delay-200">
              <WaitlistForm variant="hero" />
            </div>

            {data && data.count > 0 && (
              <p className="mt-5 text-sm text-[#94A3B8] animate-fade-in animation-delay-300">
                Join <span className="font-semibold text-[#64748B]">{data.count}</span> business owners already on the waitlist.
              </p>
            )}
          </div>

          {/* Right: mock Command Board preview */}
          <div className="hidden lg:block animate-fade-in animation-delay-200">
            <div className="rounded-2xl border border-[#E2E0DB] bg-white shadow-xl overflow-hidden">
              {/* Mock board header */}
              <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
                <span className="text-white/70 text-xs font-medium ml-2">Command Board</span>
              </div>
              {/* Quick capture bar */}
              <div className="px-5 py-4 border-b border-[#F1F0ED]">
                <div className="flex items-center gap-3 bg-[#F8F7F4] rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-[#94A3B8] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-[#94A3B8]">Capture a thought, task, or update…</span>
                </div>
              </div>
              {/* Mock cards */}
              <div className="p-5 flex flex-col gap-3">
                {[
                  { type: "Task", typeColor: "#8B5CF6", typeBg: "rgba(139,92,246,0.08)", text: "Call insurance rep about the new patient billing issue", from: "Matt", time: "1:14 AM", tag: "For Lynn" },
                  { type: "Update", typeColor: "#0D9488", typeBg: "rgba(13,148,136,0.08)", text: "Finished the Q3 financial summary — numbers look strong", from: "Lynn", time: "8:02 AM", tag: "" },
                  { type: "Issue", typeColor: "#F43F5E", typeBg: "rgba(244,63,94,0.08)", text: "Front desk scheduling is creating gaps on Tuesdays — discuss at huddle", from: "Matt", time: "Yesterday", tag: "Agenda" },
                ].map((card, i) => (
                  <div key={i} className="rounded-xl p-4 border border-[#E2E0DB] bg-[#FAFAF9]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: card.typeBg, color: card.typeColor }}
                      >
                        {card.type}
                      </span>
                      {card.tag && (
                        <span className="text-[11px] font-medium text-[#94A3B8] bg-[#F1F0ED] px-2 py-0.5 rounded-full">{card.tag}</span>
                      )}
                    </div>
                    <p className="text-sm text-[#1E3A5F] leading-snug mb-2">{card.text}</p>
                    <p className="text-xs text-[#94A3B8]">{card.from} · {card.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problem section ───────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: "📱",
    title: "The 1am text",
    body: "You have an idea. You text your partner. They read it during breakfast, during their workout, during what was supposed to be their time off. You didn't mean to interrupt — but you did.",
  },
  {
    icon: "🧠",
    title: "Three texts, one response",
    body: "You send three things. They respond to one. The other two get lost in the thread. A week later you're wondering why nothing happened — they're wondering why you're upset.",
  },
  {
    icon: "😤",
    title: "The same conversation, again",
    body: "You discuss a problem at dinner. You agree on something. Two weeks later you're having the exact same conversation. Nothing sticks because there's no system to hold it.",
  },
  {
    icon: "📉",
    title: "\"How are we doing?\" — nobody knows",
    body: "One partner is in the weeds, the other is guessing. You wait for the monthly meeting to find out the numbers — by which point it's too late to course-correct.",
  },
  {
    icon: "🏠",
    title: "Work never turns off",
    body: "When you co-own a business with your spouse, the line between home and work disappears. Dinner becomes a meeting. Vacation becomes a strategy session. Your relationship pays the price.",
  },
];

function ProblemSection() {
  return (
    <section id="problem" className="py-20 px-4 bg-[#F1F0ED]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#0D9488] text-sm font-semibold uppercase tracking-widest mb-3">Sound Familiar?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">
            The Text Message Is Destroying Your Partnership
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            Not your relationship — your working relationship. The way ideas, tasks, and updates flow between co-owners is broken. And it's not your fault. There's just never been a better option.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROBLEMS.map((p, i) => (
            <div
              key={i}
              className="bg-[#F8F7F4] rounded-2xl p-6 border border-[#E2E0DB] hover:border-[#0D9488]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2 text-lg">{p.title}</h3>
              <p className="text-[#64748B] text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
          {/* CTA card */}
          <div className="bg-[#1E3A5F] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-4">✅</div>
              <h3 className="font-semibold text-white mb-2 text-lg">There's a better place for it</h3>
              <p className="text-[#93C5FD] text-sm leading-relaxed">
                BusinessCadence gives every idea, task, and update a proper home — so nothing gets lost, no one gets interrupted, and both partners always know exactly how the business is doing.
              </p>
            </div>
            <button
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 bg-white text-[#1E3A5F] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#F1F0ED] transition-colors active:scale-[0.97]"
            >
              Get Early Access →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features section ──────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Command Board",
    body: "The place your 1am idea goes instead of your partner's phone. Post tasks, updates, and issues any time. They wait until your next structured meeting — no interruptions, nothing lost.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Meeting Cadence Calendar",
    body: "The guarantee that nothing on the Board gets forgotten. A full-year rhythm of daily huddles, weekly reviews, monthly financials, and quarterly strategy sessions — so every captured idea has a scheduled moment to be resolved.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "Live KPI Dashboard",
    body: "Running monthly totals for every metric that matters — adjustments, new patients, collections, whatever you track. Both partners see the same live numbers. No more \"how are we doing?\" conversations.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Goals → Numbers, Side by Side",
    body: "Set a goal (36 new patients this month), and see the actual number next to it in real time. Your team reports their weekly numbers; the running total builds automatically. You always know where you stand.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Built for Multiple Businesses",
    body: "Running a chiropractic practice, a CrossFit gym, and a rental property? BusinessCadence handles all of them in one place — separate KPIs, separate goals, separate agendas, one shared operating system.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Private & Secure",
    body: "Your business conversations are private. BusinessCadence is password-protected and built for your team only — not a social platform, not a public tool. Just you and your people.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 bg-[#F8F7F4]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#0D9488] text-sm font-semibold uppercase tracking-widest mb-3">What's Inside</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">
            One System. Two Partners. Zero Interruptions.
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            BusinessCadence is a shared operating system for co-owners — built around the Command Board, backed by a live business heartbeat, and held together by a meeting rhythm that actually works.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-[#F1F0ED] rounded-2xl p-6 border border-[#E2E0DB] hover:border-[#0D9488]/40 hover:shadow-md transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center mb-4 group-hover:bg-[#0D9488] transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2 text-lg">{f.title}</h3>
              <p className="text-[#64748B] text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────
const CADENCE = [
  { freq: "Daily", time: "10–15 min", color: "#8B5CF6", desc: "A quick morning check-in to align on the day's priorities and flag anything urgent before it becomes a fire." },
  { freq: "Weekly", time: "90 min", color: "#0EA5E9", desc: "A structured Weekly Review to review scorecard, discuss issues, and make decisions. Every week, same time, same agenda." },
  { freq: "Monthly", time: "60 min", color: "#14B8A6", desc: "A financial review to go over the numbers, check progress against goals, and course-correct before the quarter ends." },
  { freq: "Quarterly", time: "Half day", color: "#F43F5E", desc: "A strategic offsite to review the past quarter, set 90-day priorities, and reconnect as business partners — not just co-workers." },
];

function HowItWorksSection() {
  return (
    <section className="py-20 px-4 bg-[#1E3A5F]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#93C5FD] text-sm font-semibold uppercase tracking-widest mb-3">The Cadence</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Nothing on the Board Gets Forgotten.
          </h2>
          <p className="text-[#93C5FD] max-w-xl mx-auto">
            The meeting cadence is the guarantee. Every idea captured on the Board has a scheduled moment to be addressed — at the right time, with both partners present and ready.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CADENCE.map((c, i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-3 h-3 rounded-full mb-4" style={{ backgroundColor: c.color }} />
              <div className="text-white font-bold text-xl mb-1">{c.freq}</div>
              <div className="text-[#93C5FD] text-sm font-medium mb-3">{c.time}</div>
              <p className="text-[#CBD5E1] text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Founder story ─────────────────────────────────────────────────────────
function StorySection() {
  return (
    <section id="story" className="py-20 px-4 bg-[#F1F0ED]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#0D9488] text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
            Built at 1am Because We Needed It
          </h2>
        </div>

        <div className="bg-[#F8F7F4] rounded-2xl p-8 sm:p-10 border border-[#E2E0DB] relative">
          {/* Quote mark */}
          <div className="text-[#0D9488] text-6xl font-serif leading-none mb-4 opacity-30 select-none">"</div>

          <div className="space-y-5 text-[#374151] leading-relaxed">
            <p>
              We own three completely different businesses together — all running simultaneously, with the same two people at the helm. For years, we were that couple: talking about business at dinner, in the car, before bed, and first thing in the morning. Business was everywhere, all the time.
            </p>
            <p>
              The same issues kept coming up in every conversation. Nothing ever felt fully resolved. And our personal time — the time we were supposed to be <em>us</em>, not business partners — kept getting hijacked by whatever fire was burning that day.
            </p>
            <p>
              We tried calendars, shared notes apps, project management tools. Nothing was built for what we actually needed: a structured meeting cadence that kept business conversations in their lane, with a real agenda, a real record, and a real off switch.
            </p>
            <p>
              So one night at 1am, we built it ourselves. BusinessCadence is the tool we wished existed — and now we're making it available to every small business owner who's been having the same conversations we were.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E2E0DB] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              BC
            </div>
            <div>
              <p className="font-semibold text-[#1E3A5F]">The Founders</p>
              <p className="text-sm text-[#64748B]">Co-owners of three businesses, married 20+ years</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Waitlist CTA section ──────────────────────────────────────────────────
function WaitlistSection() {
  const { data } = trpc.waitlist.count.useQuery();

  return (
    <section id="waitlist" className="py-24 px-4 bg-[#1E3A5F]">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-[#93C5FD] text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
          Free During Early Access
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
          Send the Last 1am Business Text You'll Ever Send.
        </h2>
        <p className="text-[#93C5FD] text-lg mb-10 leading-relaxed">
          Join the waitlist and be among the first co-owners to use BusinessCadence. Early access is free, and you'll have a direct line to shape the product.
        </p>

        <WaitlistForm variant="footer" />

        {data && data.count > 0 && (
          <p className="mt-6 text-sm text-[#64748B]">
            <span className="text-[#93C5FD] font-semibold">{data.count} business owners</span> are already waiting.
          </p>
        )}

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { label: "No credit card required", icon: "✓" },
            { label: "Free during early access", icon: "✓" },
            { label: "Cancel anytime", icon: "✓" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0D9488]/20 flex items-center justify-center text-[#0D9488] text-xs font-bold flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-[#93C5FD] text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#F1F0ED] border-t border-[#E2E0DB] py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Logo height={36} />
          <p className="text-xs text-[#94A3B8] mt-2">Structure your business. Protect your life.</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-[#94A3B8]">
          <button
            onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-[#1E3A5F] transition-colors"
          >
            The Problem
          </button>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-[#1E3A5F] transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-[#1E3A5F] transition-colors"
          >
            Our Story
          </button>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-[#94A3B8]">© {new Date().getFullYear()} BusinessCadence. All rights reserved.</p>
          <a href="/login" className="text-xs text-[#94A3B8] hover:text-[#1E3A5F] transition-colors">Client Login</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing page ─────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <Nav />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StorySection />
      <WaitlistSection />
      <Footer />
    </div>
  );
}

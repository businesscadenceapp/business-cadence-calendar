import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Logo ─────────────────────────────────────────────────────────────────
import BrandLogo from "@/components/BrandLogo";

function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  // Map pixel height to BrandLogo size prop
  const size = height >= 160 ? "xl" : height >= 80 ? "lg" : height >= 50 ? "md" : "sm";
  return (
    <BrandLogo size={size} theme="dark" showTagline={height >= 80} className={className} />
  );
}

// ─── App Store Buttons ─────────────────────────────────────────────────────
function AppStoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3 ${className}`}>
      {/* App Store */}
      <a
        href="https://apps.apple.com/app/businesscadence/id6748498898"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download BusinessCadence on the App Store"
        className="flex items-center gap-3 bg-black border border-white/20 text-white px-5 py-3 rounded-xl hover:bg-white/10 transition-all active:scale-[0.97] w-full sm:w-auto justify-center"
        style={{ minWidth: "160px" }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <div className="text-left">
          <div className="text-[10px] text-white/60 leading-none">Download on the</div>
          <div className="text-[15px] font-semibold leading-tight">App Store</div>
        </div>
      </a>

      {/* Google Play */}
      <a
        href="https://play.google.com/store/apps/details?id=com.businesscadence.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get BusinessCadence on Google Play"
        className="flex items-center gap-3 bg-black border border-white/20 text-white px-5 py-3 rounded-xl hover:bg-white/10 transition-all active:scale-[0.97] w-full sm:w-auto justify-center"
        style={{ minWidth: "160px" }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="currentColor">
          <path d="M3.18 23.76c.3.17.65.19.97.07L14.76 12 3.18.17C2.86.05 2.51.07 2.21.24 1.6.6 1.2 1.27 1.2 2v20c0 .73.4 1.4 1.01 1.76zm17.55-10.67l-2.9-1.67-3.28 3.28 3.28 3.28 2.92-1.68c.83-.48.83-1.73-.02-2.21zM4.17 1.03L14.05 10.9l-2.9 2.9L2.2 4.87c.24-.98.9-1.78 1.97-1.84zm0 21.94c-1.07-.06-1.73-.86-1.97-1.84l8.95-8.93 2.9 2.9L4.17 22.97z"/>
        </svg>
        <div className="text-left">
          <div className="text-[10px] text-white/60 leading-none">Get it on</div>
          <div className="text-[15px] font-semibold leading-tight">Google Play</div>
        </div>
      </a>
    </div>
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F2440]/95 backdrop-blur-sm border-b border-white/10" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <div style={{ filter: "drop-shadow(0 2px 0px rgba(255,255,255,0.15)) drop-shadow(0 5px 10px rgba(0,0,0,0.40)) saturate(1.2) brightness(1.05)" }}>
            <Logo height={80} />
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo("problem")} className="text-sm text-white/60 hover:text-white transition-colors">
              The Problem
            </button>
            <button onClick={() => scrollTo("features")} className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-white/60 hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollTo("story")} className="text-sm text-white/60 hover:text-white transition-colors">
              Our Story
            </button>
            <button
              onClick={() => scrollTo("download")}
              className="bg-[#3B9EE8] text-[#0F2440] text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#2980c9] transition-colors active:scale-[0.97]"
            >
              Download Free
            </button>
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-white/60 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo("problem")} className="text-sm text-white/60 text-left px-2">The Problem</button>
            <button onClick={() => scrollTo("features")} className="text-sm text-white/60 text-left px-2">Features</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-white/60 text-left px-2">Pricing</button>
            <button onClick={() => scrollTo("story")} className="text-sm text-white/60 text-left px-2">Our Story</button>
            <button
              onClick={() => scrollTo("download")}
              className="bg-[#3B9EE8] text-[#0F2440] text-sm font-semibold px-5 py-2 rounded-lg mx-2"
            >
              Download Free
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
        <div className="w-10 h-10 rounded-full bg-[#3B9EE8]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#3B9EE8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-medium text-white">
          You're on the list — we'll be in touch!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-3 ${variant === "hero" ? "flex-col sm:flex-row justify-center w-full max-w-md mx-auto" : "flex-col sm:flex-row max-w-md"}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        aria-label="Email address for waitlist"
        className="flex-1 px-4 py-3 rounded-lg border bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#3B9EE8]/60 focus:ring-2 focus:ring-[#3B9EE8]/20 outline-none transition-all text-sm"
      />
      <button
        type="submit"
        disabled={join.isPending}
        className="px-6 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] whitespace-nowrap bg-[#3B9EE8] text-[#0F2440] hover:bg-[#2980c9] disabled:opacity-60"
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
    <section className="pt-32 pb-28 px-4" style={{ background: "linear-gradient(160deg, #0F2440 0%, #1E3A5F 60%, #0D2D4A 100%)" }} aria-labelledby="hero-heading">
      <div className="max-w-4xl mx-auto">
        {/* Hero brand block: large heart centered, stacked wordmark below */}
        <div className="flex flex-col items-center mb-12 animate-fade-in">
          <img
            src="/manus-storage/heart-transparent-clean_14235c91.png"
            alt="BusinessCadence"
            style={{
              width: 180,
              height: 180,
              objectFit: "contain",
              filter: "drop-shadow(0 12px 40px rgba(59,158,232,0.40)) drop-shadow(0 4px 12px rgba(0,0,0,0.50))",
            }}
          />
          <div className="mt-6 text-center">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline" }}>
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "clamp(32px, 6vw, 52px)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                lineHeight: 1.1,
              }}>Business</span>
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "clamp(32px, 6vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#3B9EE8",
                lineHeight: 1.1,
              }}>Cadence</span>
            </div>
            <p style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: "clamp(13px, 1.5vw, 16px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.52)",
              letterSpacing: "0.02em",
              marginTop: 8,
            }}>
              Run your business while protecting your relationship.
            </p>
          </div>
        </div>

        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-white/10 text-[#3B9EE8] text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B9EE8] animate-pulse" aria-hidden="true" />
            Now Available on iOS &amp; Android
          </div>

          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Stop Bringing the Boardroom{" "}
            <span className="text-[#3B9EE8]">to the Dinner Table.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            BusinessCadence is the app built for couples who own a business together. Structured meeting rhythms, a shared owner board, and goal tracking — so every business conversation happens at the right time, in the right place. Your business stays in the boardroom. Your life stays yours.
          </p>

          {/* Download buttons */}
          <div id="download" className="flex justify-center mb-8 animate-fade-up animation-delay-100">
            <AppStoreButtons />
          </div>

          <p className="text-sm text-white/40 mb-8">Free to download · No credit card required</p>

          <div className="border-t border-white/10 pt-8 animate-fade-up animation-delay-200">
            <p className="text-sm text-white/50 mb-4">Not ready to download? Join the waitlist for updates.</p>
            <div className="flex justify-center">
              <WaitlistForm variant="hero" />
            </div>
          </div>

          {data && data.count > 0 && (
            <p className="mt-5 text-sm text-white/40 animate-fade-in animation-delay-300">
              Join <span className="font-semibold text-white/60">{data.count}</span> business owners already on the waitlist.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Problem section ───────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: "🔄",
    title: "You're always in reactive mode",
    body: "Business conversations happen randomly — at dinner, in bed, during the kids' game. There's no structure, no agenda, and nothing ever fully gets resolved.",
  },
  {
    icon: "🧠",
    title: "Cognitive switching is draining you",
    body: "Every time you shift from 'parent' to 'business partner' mid-conversation, your brain pays a tax. Research shows context-switching costs up to 40% of productive time.",
  },
  {
    icon: "😤",
    title: "The same issues come up over and over",
    body: "You discuss a problem, agree on something, and two weeks later you're having the exact same conversation again. Nothing sticks because there's no system.",
  },
  {
    icon: "🏠",
    title: "Personal time doesn't feel personal",
    body: "When you co-own a business with your spouse or partner, the line between home and work disappears. Your relationship suffers when business never has a proper 'off switch.'",
  },
  {
    icon: "😰",
    title: "Decision fatigue hits at the worst times",
    body: "Making business decisions at 10pm after a full day is a recipe for bad choices. Without a dedicated time and structure, decisions happen whenever — not when you're at your best.",
  },
];

function ProblemSection() {
  return (
    <section id="problem" className="py-20 px-4" style={{ background: "linear-gradient(180deg, #0D2D4A 0%, #0F2440 100%)" }} aria-labelledby="problem-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#3B9EE8] text-sm font-semibold uppercase tracking-widest mb-3">Sound Familiar?</p>
          <h2 id="problem-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The 5 Mistakes Most Co-Owner Couples Make
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            If you own a business with your spouse or partner, you're probably making at least three of these right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROBLEMS.map((p, i) => (
            <div
              key={i}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#3B9EE8]/30 hover:bg-white/8 transition-all duration-200"
            >
              <div className="text-3xl mb-4" aria-hidden="true">{p.icon}</div>
              <h3 className="font-semibold text-white mb-2 text-lg">{p.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
          {/* CTA card */}
          <div className="bg-[#3B9EE8]/10 rounded-2xl p-6 border border-[#3B9EE8]/20 flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-4" aria-hidden="true">✅</div>
              <h3 className="font-semibold text-white mb-2 text-lg">There's a better way</h3>
              <p className="text-[#3B9EE8]/80 text-sm leading-relaxed">
                BusinessCadence gives you a proven meeting rhythm that keeps business conversations structured, productive, and out of your personal time.
              </p>
            </div>
            <button
              onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 bg-[#3B9EE8] text-[#0F2440] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2980c9] transition-colors active:scale-[0.97]"
            >
              Download the App →
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
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Meeting Cadence Command Center",
    body: "A full-year visual schedule showing exactly when each meeting type happens — daily check-ins, weekly reviews, monthly financials, and quarterly strategy sessions. No guesswork, no missed meetings.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "Shared Owner Board",
    body: "A private digital board where co-owners post updates, issues, and tasks before each meeting. Everyone arrives prepared, nothing gets forgotten, and the meeting stays focused.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Goals &amp; KPI Tracking",
    body: "Set shared goals and track key performance indicators together. See your business health at a glance and stay aligned on what matters most each quarter.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Off the Clock Mode",
    body: "Toggle 'Off the Clock' to pause business notifications when you're in personal time. Your partner knows not to expect a business response — boundaries enforced automatically.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Weekly Reports",
    body: "Automatically generated weekly summaries of what was completed, what is in progress, and what needs attention. Your business story, written for you.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Multiple Businesses",
    body: "Own more than one business together? Add each one as a separate workspace. Switch between them instantly — same rhythm, same structure, different door.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Tone Check",
    body: "Before you post, AI reads your message and suggests a calmer, more professional version if it detects frustration or emotional charge. Because how you say it matters as much as what you say.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 bg-[#0F2440]" aria-labelledby="features-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#3B9EE8] text-sm font-semibold uppercase tracking-widest mb-3">What's Inside</p>
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything a Co-Owner Couple Needs
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Built specifically for couples who run a business together — not a generic project management tool adapted for two.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#3B9EE8]/30 hover:bg-white/8 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1E3A5F] text-[#3B9EE8] flex items-center justify-center mb-4 group-hover:bg-[#3B9EE8]/20 transition-colors border border-white/10">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2 text-lg">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.body}</p>
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
  { freq: "Monthly", time: "60 min", color: "#3B9EE8", desc: "A financial review to go over the numbers, check progress against goals, and course-correct before the quarter ends." },
  { freq: "Quarterly", time: "Half day", color: "#F43F5E", desc: "A strategic offsite to review the past quarter, set 90-day priorities, and reconnect as business partners — not just co-workers." },
];

function HowItWorksSection() {
  return (
    <section className="py-20 px-4" style={{ background: "linear-gradient(180deg, #1E3A5F 0%, #162d4a 100%)" }} aria-labelledby="cadence-heading">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#3B9EE8] text-sm font-semibold uppercase tracking-widest mb-3">The Cadence</p>
          <h2 id="cadence-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Four Meeting Types. One Proven Rhythm.
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            BusinessCadence is built around a time-tested meeting structure used by the world's most effective small business teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CADENCE.map((c, i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-3 h-3 rounded-full mb-4" style={{ backgroundColor: c.color }} aria-hidden="true" />
              <div className="text-white font-bold text-xl mb-1">{c.freq}</div>
              <div className="text-[#3B9EE8]/80 text-sm font-medium mb-3">{c.time}</div>
              <p className="text-white/60 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing section ───────────────────────────────────────────────────────
function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const foundingSpots = trpc.subscription.getFoundingSpots.useQuery(undefined, { staleTime: 60_000 });
  const spotsRemaining = foundingSpots.data?.remaining ?? 100;
  const spotsTaken = foundingSpots.data?.taken ?? 0;
  const foundingFull = spotsRemaining <= 0;

  const plans = [
    {
      id: "founding",
      badge: { text: foundingFull ? "Sold Out" : `${spotsRemaining} of 100 spots left`, color: "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0A1628]" },
      name: "Founding Member",
      tagline: "Early adopter rate — locked in forever",
      monthly: "$39",
      annual: "$29",
      annualBilled: "$348",
      features: [
        "Both co-owners included",
        "Owner Board (tasks, updates, issues)",
        "Meeting Cadence Command Center",
        "Goals & KPI tracking",
        "Weekly reports",
        "AI Tone Check",
        "Off the Clock mode",
        "iOS & Android apps",
        "Rate locked in — never increases",
      ],
      cta: "Claim Founding Rate →",
      cardClass: "bg-[#F59E0B]/8 border border-[#F59E0B]/30",
      ctaClass: "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0A1628] hover:opacity-90",
      popular: false,
    },
    {
      id: "co_owner",
      badge: null,
      name: "Co-Owner",
      tagline: "For couples running one business",
      monthly: "$69",
      annual: "$52",
      annualBilled: "$624",
      features: [
        "Both co-owners included",
        "Owner Board (tasks, updates, issues)",
        "Meeting Cadence Command Center",
        "Goals & KPI tracking",
        "Weekly reports",
        "AI Tone Check",
        "Off the Clock mode",
        "iOS & Android apps",
      ],
      cta: "Start 14-Day Free Trial →",
      cardClass: "bg-white/5 border border-white/10",
      ctaClass: "bg-[#3B9EE8] text-[#0F2440] hover:bg-[#2980c9]",
      popular: false,
    },
    {
      id: "co_owner_team",
      badge: { text: "Most Popular", color: "bg-gradient-to-r from-[#3B9EE8] to-[#0D9488] text-[#0A1628]" },
      name: "Co-Owner + Team",
      tagline: "For couples running multiple businesses with a team",
      monthly: "$79",
      annual: "$59",
      annualBilled: "$708",
      features: [
        "Everything in Co-Owner",
        "Unlimited business workspaces",
        "Unlimited team employees",
        "Separate boards & KPIs per business",
        "Team calendar & scheduling",
        "Unified notification center",
        "Priority support",
      ],
      cta: "Start 14-Day Free Trial →",
      cardClass: "bg-[#3B9EE8]/8 border border-[#3B9EE8]/30",
      ctaClass: "bg-[#3B9EE8] text-[#0F2440] hover:bg-[#2980c9]",
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-[#0F2440]" aria-labelledby="pricing-heading">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[#3B9EE8] text-sm font-bold uppercase tracking-widest mb-3">Pricing</p>
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
            One flat rate. Both owners included.
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-6">
            Most apps charge per seat — two people means two subscriptions. BusinessCadence is built for two. One price covers both co-owners, forever.
          </p>

          {/* Trial banner */}
          <div className="inline-flex items-center gap-3 bg-[#3B9EE8]/10 border border-[#3B9EE8]/25 rounded-2xl px-6 py-3 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-[#3B9EE8] animate-pulse flex-shrink-0" aria-hidden="true" />
            <span className="text-[#3B9EE8] font-semibold">14-day free trial on all plans</span>
            <span className="text-white/30 hidden sm:inline">·</span>
            <span className="text-white/50 hidden sm:inline">No credit card required</span>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/6 border border-white/10 max-w-xs mx-auto">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={[
                  "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                  billing === b
                    ? "bg-[#3B9EE8] text-[#0F2440]"
                    : "text-white/50 hover:text-white/80",
                ].join(" ")}
              >
                {b === "monthly" ? "Monthly" : "Annual · Save 25%"}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${plan.cardClass} rounded-2xl p-8 flex flex-col relative overflow-visible`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${plan.badge.color} text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide whitespace-nowrap`}>
                  {plan.badge.text}
                </div>
              )}
              {plan.id === "founding" && spotsTaken > 0 && (
                <div className="mt-2 mb-1">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,158,11,0.2)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (spotsTaken / 100) * 100)}%`, background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
                  </div>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: "rgba(245,158,11,0.7)" }}>
                    {spotsTaken} of 100 founding spots claimed
                  </p>
                </div>
              )}

              <div className="mb-5 mt-2">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-white/50 text-sm">{plan.tagline}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    {billing === "annual" ? plan.annual : plan.monthly}
                  </span>
                  <span className="text-white/50 text-sm">/ mo per couple</span>
                </div>
                {billing === "annual" ? (
                  <p className="text-white/40 text-xs mt-1">Billed {plan.annualBilled}/year</p>
                ) : (
                  <p className="text-[#3B9EE8]/60 text-xs mt-1 font-medium">
                    Switch to annual and save {plan.id === "founding" ? "$120" : plan.id === "co_owner" ? "$204" : "$240"}/yr
                  </p>
                )}
                <p className="text-[#3B9EE8]/70 text-xs mt-0.5 font-medium">Both owners included — no per-seat fees</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className={`mt-0.5 flex-shrink-0 font-bold ${plan.id === "founding" ? "text-[#F59E0B]" : "text-[#3B9EE8]"}`}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
                className={`w-full ${plan.ctaClass} font-semibold py-3 rounded-xl transition-all active:scale-[0.97]`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer notes */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-white/40 text-sm">14-day free trial · No credit card required · Cancel anytime</p>
          <p className="text-white/30 text-xs">Less than one therapy session. For a tool that keeps both from becoming necessary.</p>
          <div className="mt-4 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm">
            <span className="text-white/40 line-through">Other tools: $30–$40/mo per person</span>
            <span className="text-white/30">vs</span>
            <span className="text-[#3B9EE8] font-bold">BusinessCadence: one price for both</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Founder story ─────────────────────────────────────────────────────────
function StorySection() {
  return (
    <section id="story" className="py-20 px-4 bg-[#0F2440]" aria-labelledby="story-heading">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#3B9EE8] text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
          <h2 id="story-heading" className="text-3xl sm:text-4xl font-bold text-white">
            We built this because we needed it.
          </h2>
        </div>

        <div className="bg-white/5 rounded-2xl p-8 sm:p-10 border border-white/10">
          <div className="text-[#3B9EE8] text-6xl font-serif leading-none mb-4 opacity-30 select-none" aria-hidden="true">"</div>

          <div className="space-y-5 text-white/70 leading-relaxed">
            <p>
              We built Business Cadence because our communication had no rhythm.
            </p>
            <p>
              When an idea hit us it didn't matter what day — we could be on vacation — or what time — we could be lying in bed trying to fall asleep. We would discuss it. And most of the time the idea would be forgotten anyway, and all that bringing it up did was stress us out more.
            </p>
            <p>
              We realized we were <strong className="text-white">adding more stress to our relationship and partnership</strong> when the goal was to take it away.
            </p>
            <p>
              Business Cadence aims to be that pressure release valve your partnership — and for some of you, your relationship — has been waiting for. No more ill-timed business questions that stress your partnership out. No more late-night texts that make it feel like boundaries have been crossed.
            </p>
            <p>
              Business Cadence gives you the tools you need to keep your business and relationship separate and distinct. It will keep you on task and create a rhythm that allows for strong business habits.
            </p>
            <p className="text-white font-medium">
              Business Cadence gives your ideas a place to land, your conversations a time and place to happen, and your relationship permission to be something other than a business meeting.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3A5F] border border-white/20 flex items-center justify-center text-[#3B9EE8] font-bold text-lg flex-shrink-0" aria-hidden="true">BC</div>
            <div>
              <p className="font-semibold text-white">The Founders</p>
              <p className="text-sm text-white/50">Co-owners of three businesses, married 20+ years</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Download CTA section ──────────────────────────────────────────────────
function DownloadSection() {
  const { data } = trpc.waitlist.count.useQuery();

  return (
    <section className="py-24 px-4" style={{ background: "linear-gradient(180deg, #162d4a 0%, #0F2440 100%)" }} aria-labelledby="download-heading">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-[#3B9EE8] text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B9EE8] animate-pulse" aria-hidden="true" />
          Available Now on iOS &amp; Android
        </div>

        <h2 id="download-heading" className="text-3xl sm:text-4xl font-bold text-white mb-5">
          Stop being out of sync.<br />
          <span className="text-[#3B9EE8]">Start building a rhythm.</span>
        </h2>
        <p className="text-white/60 text-lg mb-10 leading-relaxed">
          Download BusinessCadence free today. Start your trial, invite your co-owner, and have your first structured meeting this week.
        </p>

        <AppStoreButtons className="justify-center mb-8" />

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { label: "Free to download", icon: "✓" },
            { label: "No credit card required", icon: "✓" },
            { label: "Cancel anytime", icon: "✓" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#3B9EE8]/20 flex items-center justify-center text-[#3B9EE8] text-xs font-bold flex-shrink-0" aria-hidden="true">
                {item.icon}
              </div>
              <span className="text-white/60 text-sm">{item.label}</span>
            </div>
          ))}
        </div>

        {data && data.count > 0 && (
          <p className="mt-8 text-sm text-white/40">
            <span className="text-[#3B9EE8] font-semibold">{data.count} business owners</span> are already on the waitlist.
          </p>
        )}

        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-sm text-white/40 mb-4">Not ready to download? Get notified about updates.</p>
          <WaitlistForm variant="footer" />
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0A1929] border-t border-white/10 py-10 px-4" role="contentinfo">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4)) brightness(1.05)" }}>
            <Logo height={36} />
          </div>
          <p className="text-xs text-white/30 mt-2">Structure your business. Protect your life.</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/40">
          <button
            onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-white transition-colors"
          >
            The Problem
          </button>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-white transition-colors"
          >
            Pricing
          </button>
          <button
            onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-white transition-colors"
          >
            Our Story
          </button>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} BusinessCadence. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing page ─────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0F2440]">
      <Nav />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <StorySection />
      <DownloadSection />
      <Footer />
    </div>
  );
}

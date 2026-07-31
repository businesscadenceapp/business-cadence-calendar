import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { PersonProvider } from "@/contexts/PersonContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { Capacitor } from "@capacitor/core";

/**
 * Initialize RevenueCat SDK on native platforms at app startup.
 * Must run before any Paywall or restore-purchases flow.
 *
 * API keys:
 *   iOS:     VITE_REVENUECAT_IOS_KEY     (set in Secrets)
 *   Android: VITE_REVENUECAT_ANDROID_KEY (set in Secrets)
 *
 * The app user ID is set to the person's `id` (nanoid) so RevenueCat
 * events can be matched to the correct person in the webhook handler.
 * We initialize anonymously here (no user ID yet) and identify the user
 * after login via Purchases.logIn() — see PersonContext.
 */
async function initRevenueCat() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    const platform = Capacitor.getPlatform();
    const apiKey =
      platform === "ios"
        ? (import.meta.env.VITE_REVENUECAT_IOS_KEY ?? "")
        : (import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? "");
    if (!apiKey) {
      console.warn("[RevenueCat] No API key configured for platform:", platform);
      return;
    }
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey });
    console.log("[RevenueCat] SDK initialized for platform:", platform);
  } catch (err) {
    console.error("[RevenueCat] SDK initialization failed:", err);
  }
}

// Fire-and-forget — does not block rendering
initRevenueCat();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// On native (iOS/Android), relative URLs don't work — must use the full production URL.
const TRPC_URL = Capacitor.isNativePlatform()
  ? "https://businesscadence.com/api/trpc"
  : "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: TRPC_URL,
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <PersonProvider>
        <App />
      </PersonProvider>
    </QueryClientProvider>
  </trpc.Provider>
);

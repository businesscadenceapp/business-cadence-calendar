/**
 * businessScope.ts — helpers for deriving business scope from PersonContext.
 *
 * Previously this lived in ClientLogin.tsx as getBusinessSelection().
 * Now scope comes from the logged-in person's `businessScope` field.
 *
 * businessScope values:
 *   "all"   → owner/co-owner sees all businesses
 *   "chiro" → only New Beginnings Chiropractic
 *   "crossfit" → only Evolved CrossFit
 *   comma-separated slugs → multiple businesses
 */

export type BusinessSelection = "chiro" | "crossfit" | "owner" | "all";

/**
 * Convert a person's businessScope string into a BusinessSelection.
 * Falls back to "owner" (all businesses) if unrecognized.
 */
export function personScopeToBusinessSelection(businessScope: string | undefined): BusinessSelection {
  if (!businessScope || businessScope === "all") return "owner";
  if (businessScope === "chiro") return "chiro";
  if (businessScope === "crossfit") return "crossfit";
  return "owner";
}

/**
 * Legacy localStorage fallback — only used when PersonContext is unavailable.
 * @deprecated Use PersonContext instead.
 */
export function getBusinessSelection(): BusinessSelection {
  try {
    const stored = localStorage.getItem("bcc_selected_business");
    if (stored === "chiro" || stored === "crossfit") return stored;
  } catch { /* ignore */ }
  return "owner";
}

export function saveBusinessSelection(key: BusinessSelection) {
  try {
    localStorage.setItem("bcc_selected_business", key);
  } catch { /* ignore */ }
}

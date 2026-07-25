/**
 * RevenueCat Webhook Handler
 *
 * RevenueCat sends POST events to /api/revenuecat/webhook whenever a subscription
 * event occurs (purchase, renewal, cancellation, billing issue, etc.).
 *
 * Security: RevenueCat signs each request with a shared secret sent in the
 * `Authorization` header as a Bearer token. We validate this before processing.
 *
 * RevenueCat event types we handle:
 *   INITIAL_PURCHASE  → create/activate subscription
 *   RENEWAL           → extend currentPeriodEndsAt
 *   PRODUCT_CHANGE    → update plan
 *   CANCELLATION      → mark as cancelled (access until period end)
 *   BILLING_ISSUE     → mark as lapsed
 *   EXPIRATION        → mark as lapsed
 *   SUBSCRIBER_ALIAS  → no-op (alias events)
 *
 * The RC app_user_id is set to the person's `id` (persons.id nanoid) so we can
 * look up the account from the webhook payload.
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { persons, subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { upsertSubscription } from "./db";

// Map RevenueCat product IDs to our plan names
const PRODUCT_TO_PLAN: Record<string, "core" | "core_team"> = {
  "bc_core_monthly": "core",
  "bc_core_annual": "core",
  "bc_core_team_monthly": "core_team",
  "bc_core_team_annual": "core_team",
};

export function registerRevenueCatWebhook(app: Express) {
  app.post("/api/revenuecat/webhook", async (req: Request, res: Response) => {
    // Validate the shared secret
    const authHeader = req.headers["authorization"] ?? "";
    const secret = ENV.revenueCatWebhookSecret;
    if (secret && authHeader !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const event = req.body?.event;
    if (!event) {
      res.status(400).json({ error: "Missing event body" });
      return;
    }

    const eventType: string = event.type ?? "";
    const appUserId: string = event.app_user_id ?? "";
    const productId: string = event.product_id ?? "";
    const expirationAtMs: number | null = event.expiration_at_ms ?? null;
    const purchasedAtMs: number | null = event.purchased_at_ms ?? null;

    console.log(`[RevenueCat] Event: ${eventType} for user: ${appUserId}`);

    // Look up the person by their RC app_user_id (= persons.id)
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "DB unavailable" });
      return;
    }

    const [person] = await db.select().from(persons).where(eq(persons.id, appUserId)).limit(1);
    if (!person) {
      // Could be an alias or anonymous user — log and return 200 so RC doesn't retry
      console.warn(`[RevenueCat] Person not found for app_user_id: ${appUserId}`);
      res.status(200).json({ received: true });
      return;
    }

    const accountId = person.accountId;
    const plan = PRODUCT_TO_PLAN[productId] ?? "core";
    const currentPeriodEndsAt = expirationAtMs ? new Date(expirationAtMs) : null;
    const rawData = JSON.stringify(event);

    try {
      switch (eventType) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "UNCANCELLATION":
          await upsertSubscription({
            accountId,
            ownerPersonId: person.id,
            revenueCatUserId: appUserId,
            revenueCatProductId: productId || null,
            plan,
            status: "active",
            trialEndsAt: null,
            currentPeriodEndsAt,
            revenueCatData: rawData,
          });
          break;

        case "PRODUCT_CHANGE":
          await upsertSubscription({
            accountId,
            ownerPersonId: person.id,
            revenueCatUserId: appUserId,
            revenueCatProductId: productId || null,
            plan,
            status: "active",
            trialEndsAt: null,
            currentPeriodEndsAt,
            revenueCatData: rawData,
          });
          break;

        case "CANCELLATION":
          // Access continues until period end — mark as cancelled
          await upsertSubscription({
            accountId,
            ownerPersonId: person.id,
            revenueCatUserId: appUserId,
            revenueCatProductId: productId || null,
            plan,
            status: "cancelled",
            trialEndsAt: null,
            currentPeriodEndsAt,
            revenueCatData: rawData,
          });
          break;

        case "BILLING_ISSUE":
        case "EXPIRATION":
          await upsertSubscription({
            accountId,
            ownerPersonId: person.id,
            revenueCatUserId: appUserId,
            revenueCatProductId: productId || null,
            plan,
            status: "lapsed",
            trialEndsAt: null,
            currentPeriodEndsAt,
            revenueCatData: rawData,
          });
          break;

        default:
          // Unhandled event type — log and return 200
          console.log(`[RevenueCat] Unhandled event type: ${eventType}`);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[RevenueCat] Webhook processing error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });
}

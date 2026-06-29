import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import {
  getMeetingLog,
  upsertMeetingLog,
  saveSummary,
  getAgendaItems,
  toggleAgendaItem,
  getAllLoggedDates,
  getBoardCards,
  createBoardCard,
  markCardSeen,
  archiveCard,
  deleteBoardCard,
} from "./db";

const meetingTypeSchema = z.enum(["daily", "weekly", "monthly", "quarterly"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  meetingLog: router({
    /** Get the log (notes + summary + agenda items) for a specific day + meeting type. */
    get: publicProcedure
      .input(z.object({ dateKey: z.string(), meetingType: meetingTypeSchema }))
      .query(async ({ input }) => {
        const log = await getMeetingLog(input.dateKey, input.meetingType);
        if (!log) return { log: null, agendaItems: [] };
        const items = await getAgendaItems(log.id);
        return { log, agendaItems: items };
      }),

    /** Save notes for a meeting. Creates or updates the log row. */
    saveNotes: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        notes: z.string(),
      }))
      .mutation(async ({ input }) => {
        const log = await upsertMeetingLog(input.dateKey, input.meetingType, input.notes);
        return { log };
      }),

    /** Toggle a single agenda item checkbox on/off, and optionally save a comment. */
    toggleItem: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        itemKey: z.string(),
        completed: z.boolean(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let log = await getMeetingLog(input.dateKey, input.meetingType);
        if (!log) {
          log = await upsertMeetingLog(input.dateKey, input.meetingType, "");
        }
        await toggleAgendaItem(log.id, input.itemKey, input.completed, input.comment);
        return { success: true };
      }),

    /** Save just a comment for an item (without changing its completed state). */
    saveItemComment: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        itemKey: z.string(),
        comment: z.string(),
      }))
      .mutation(async ({ input }) => {
        let log = await getMeetingLog(input.dateKey, input.meetingType);
        if (!log) {
          log = await upsertMeetingLog(input.dateKey, input.meetingType, "");
        }
        // Get current completed state to preserve it
        const items = await getAgendaItems(log.id);
        const existing = items.find(i => i.itemKey === input.itemKey);
        await toggleAgendaItem(log.id, input.itemKey, existing?.completed ?? false, input.comment);
        return { success: true };
      }),

    /** Get all dateKeys that have at least one saved meeting log (for calendar indicators). */
    getLoggedDates: publicProcedure
      .query(async () => {
        const dates = await getAllLoggedDates();
        return { dates };
      }),

    /** Generate an AI summary from notes, completed items, and per-item comments, then persist it. */
    generateSummary: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        notes: z.string(),
        items: z.array(z.object({
          label: z.string(),
          completed: z.boolean(),
          comment: z.string().optional(),
        })),
        businessContext: z.string(),
      }))
      .mutation(async ({ input }) => {
        const completedLines = input.items
          .filter(i => i.completed)
          .map(i => i.comment ? `  ✓ ${i.label}\n     → Note: ${i.comment}` : `  ✓ ${i.label}`)
          .join("\n");
        const pendingLines = input.items
          .filter(i => !i.completed)
          .map(i => i.comment ? `  ○ ${i.label}\n     → Note: ${i.comment}` : `  ○ ${i.label}`)
          .join("\n");

        const prompt = `You are a business advisor summarizing a ${input.meetingType} meeting for a husband-and-wife co-owner team who run three businesses: New Beginnings Chiropractic (17+ years, anchor business), Evolved CrossFit (2 years, recently profitable), and Bubbles Realty (rental property, targeting $8K net/year).

Meeting date: ${input.dateKey}
Meeting type: ${input.meetingType.charAt(0).toUpperCase() + input.meetingType.slice(1)} — ${input.businessContext}

Completed agenda items (with any notes added during the meeting):
${completedLines || "  (none completed)"}

Pending / not completed:
${pendingLines || "  (all items completed)"}

Additional meeting notes:
${input.notes || "(none)"}

Write a concise, professional summary (4-6 sentences) that:
1. Opens with what was accomplished across the three businesses
2. Incorporates any specific notes or comments that were added to individual items
3. Flags any items that were not completed and may need follow-up next meeting
4. Ends with one clear, specific action item — who does what by when

Keep the tone warm but professional. This summary will be saved under this specific meeting day for future reference.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a concise business meeting summarizer. Respond with plain text only, no markdown headers." },
            { role: "user", content: prompt },
          ],
        });

        const summary = (response.choices[0]?.message?.content as string) ?? "Summary could not be generated.";
        await saveSummary(input.dateKey, input.meetingType, summary);
        return { summary };
      }),
  }),

  /** Password gate — validates the shared site password. */
  gate: router({
    verify: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input }) => {
        // Read at call time so tests can override process.env.SITE_PASSWORD via beforeAll
        const sitePassword = process.env.SITE_PASSWORD ?? "";
        const correct = sitePassword.length > 0 && input.password === sitePassword;
        return { success: correct };
      }),
  }),

  board: router({
    /** List all active (non-archived) board cards. */
    list: publicProcedure.query(async () => {
      const cards = await getBoardCards(false);
      return { cards };
    }),

    /** Create a new board card. */
    create: publicProcedure
      .input(z.object({
        author: z.enum(["Matt", "Lynn"]),
        type: z.enum(["update", "issue"]),
        business: z.enum(["chiropractic", "crossfit", "realty", "general"]),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ input }) => {
        const card = await createBoardCard(input);
        return { card };
      }),

    /** Mark a card as seen by the other person. */
    markSeen: publicProcedure
      .input(z.object({
        id: z.number(),
        seenBy: z.enum(["Matt", "Lynn"]),
      }))
      .mutation(async ({ input }) => {
        await markCardSeen(input.id, input.seenBy);
        return { success: true };
      }),

    /** Archive a card (soft delete — hides from board after meeting). */
    archive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await archiveCard(input.id);
        return { success: true };
      }),

    /** Permanently delete a card. */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBoardCard(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

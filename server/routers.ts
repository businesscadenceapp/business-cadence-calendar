import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getMeetingLog,
  upsertMeetingLog,
  saveSummary,
  getAgendaItems,
  toggleAgendaItem,
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

    /** Toggle a single agenda item checkbox on/off. */
    toggleItem: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        itemKey: z.string(),
        completed: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        let log = await getMeetingLog(input.dateKey, input.meetingType);
        if (!log) {
          log = await upsertMeetingLog(input.dateKey, input.meetingType, "");
        }
        await toggleAgendaItem(log.id, input.itemKey, input.completed);
        return { success: true };
      }),

    /** Generate an AI summary from notes and completed items, then persist it. */
    generateSummary: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: meetingTypeSchema,
        notes: z.string(),
        completedItems: z.array(z.string()),
        allItems: z.array(z.string()),
        businessContext: z.string(),
      }))
      .mutation(async ({ input }) => {
        const completedList = input.completedItems.length > 0
          ? input.completedItems.map(i => `  ✓ ${i}`).join("\n")
          : "  (none checked)";
        const pendingItems = input.allItems.filter(i => !input.completedItems.includes(i));
        const pendingList = pendingItems.length > 0
          ? pendingItems.map(i => `  ○ ${i}`).join("\n")
          : "  (all items completed)";

        const prompt = `You are a business advisor summarizing a ${input.meetingType} meeting for a husband-and-wife co-owner team who run three businesses: New Beginnings Chiropractic (17+ years, anchor business), Evolved CrossFit (2 years, recently profitable), and Bubbles Realty (rental property, targeting $8K net/year).

Meeting date: ${input.dateKey}
Meeting type: ${input.meetingType.charAt(0).toUpperCase() + input.meetingType.slice(1)} ${input.businessContext}

Completed agenda items:
${completedList}

Pending / not completed:
${pendingList}

Notes from the meeting:
${input.notes || "(no notes entered)"}

Write a concise, professional summary (3-5 sentences) that:
1. Highlights what was accomplished and any key decisions made
2. Notes any items that were not completed and may need follow-up
3. Ends with one specific, actionable next step for the most pressing issue

Keep the tone warm but professional.`;

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
});

export type AppRouter = typeof appRouter;

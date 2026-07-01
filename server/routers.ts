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
  markTaskDone,
  confirmTaskDone,
  getAgendaTemplate,
  getAllAgendaTemplates,
  upsertAgendaTemplate,
  addWaitlistEmail,
  getWaitlistCount,
  createMeetingRecording,
  updateMeetingRecording,
  getMeetingRecording,
  getBusinessProfile,
  upsertBusinessProfile,
  getClosedPeriods,
  addClosedPeriod,
  removeClosedPeriod,
  getMeetingOverrides,
  getEmployeesWithMetrics,
  saveEmployee,
  deactivateEmployee,
  submitWeeklyReport,
  getWeeklyReportSummary,
} from "./db";
import { generateMeetingSchedule } from "../shared/calendarEngine";
import { notifyOwner } from "./_core/notification";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { appUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";

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

  /** Agenda template management — get and save custom agenda items per business per meeting type. */
  agendaTemplate: router({
    /** Get all saved templates (for the Settings page). */
    getAll: publicProcedure.query(async () => {
      const templates = await getAllAgendaTemplates();
      return { templates };
    }),

    /** Get the template for a specific business + meeting type (used by the calendar detail panel). */
    get: publicProcedure
      .input(z.object({
        business: z.enum(["chiropractic", "crossfit", "realty"]),
        meetingType: z.enum(["daily", "weekly", "monthly", "quarterly"]),
      }))
      .query(async ({ input }) => {
        const items = await getAgendaTemplate(input.business, input.meetingType);
        return { items };
      }),

    /** Save a customized agenda template. Requires password verification on the frontend. */
    save: publicProcedure
      .input(z.object({
        business: z.enum(["chiropractic", "crossfit", "realty"]),
        meetingType: z.enum(["daily", "weekly", "monthly", "quarterly"]),
        items: z.array(z.object({
          key: z.string(),
          label: z.string().min(1).max(200),
          sortOrder: z.number(),
        })),
        updatedBy: z.enum(["Matt", "Lynn"]),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const sitePassword = process.env.SITE_PASSWORD ?? "";
        if (!sitePassword || input.password !== sitePassword) {
          throw new Error("Incorrect password. Changes not saved.");
        }
        await upsertAgendaTemplate(input.business, input.meetingType, input.items, input.updatedBy);
        return { success: true };
      }),
  }),

  /** Password gate — validates username + password against the app_users table. */
  gate: router({
    verify: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const username = input.username.trim().toLowerCase();
        const db = await getDb();
        if (!db) return { success: false, scope: null };
        const [user] = await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.username, username))
          .limit(1);

        if (!user) {
          // Constant-time comparison to prevent user enumeration
          await bcrypt.compare(input.password, "$2a$10$invalidhashpadding000000000000000000000000000000000000");
          return { success: false, scope: null };
        }

        const correct = await bcrypt.compare(input.password, user.passwordHash);
        if (!correct) return { success: false, scope: null };

        return { success: true, scope: user.scope, displayName: user.displayName, accountId: user.id };
      }),
  }),

  /** Waitlist signup for BusinessCadence.com marketing site. */
  waitlist: router({
    /** Submit an email to the waitlist. */
    join: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const result = await addWaitlistEmail(input.email);
        if (!result.success) {
          throw new Error("Unable to save your email right now. Please try again in a moment.");
        }
        if (!result.alreadyExists) {
          // Notify owner of new signup (non-blocking)
          try {
            const count = await getWaitlistCount();
            await notifyOwner({
              title: "New BusinessCadence Waitlist Signup",
              content: `${input.email} just joined the waitlist. Total signups: ${count}.`,
            });
          } catch {
            // Notification failure should not block the user response
          }
        }
        return result;
      }),

    /** Get total waitlist count (public — used for social proof). */
    count: publicProcedure.query(async () => {
      const count = await getWaitlistCount();
      return { count };
    }),
  }),

  /** Meeting recording — upload audio, transcribe, and generate AI notes. */
  recording: router({
    /** Upload audio blob, transcribe via Whisper, generate AI notes, save to DB. */
    process: publicProcedure
      .input(z.object({
        dateKey: z.string(),
        meetingType: z.enum(["daily", "weekly", "monthly", "quarterly"]),
        audioBase64: z.string(), // base64-encoded audio blob
        mimeType: z.string().default("audio/webm"),
        agendaItems: z.array(z.string()).optional(), // agenda item labels for context
      }))
      .mutation(async ({ input }) => {
        // 1. Ensure meeting log exists
        const log = await upsertMeetingLog(input.dateKey, input.meetingType, "");
        if (!log) throw new Error("Could not create meeting log");

        // 2. Decode base64 audio and upload to S3
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const fileName = `recordings/${input.dateKey}-${input.meetingType}-${Date.now()}.webm`;
        const { key: audioKey, url: audioUrl } = await storagePut(fileName, audioBuffer, input.mimeType);

        // 3. Create recording row in DB
        const recordingId = await createMeetingRecording(log.id, audioKey);
        if (!recordingId) throw new Error("Could not create recording record");

        // 4. Transcribe via Whisper
        const fullAudioUrl = `${process.env.BUILT_IN_FORGE_API_URL?.replace('/v1', '') ?? ''}${audioUrl}`;
        let transcript = "";
        try {
          const transcription = await transcribeAudio({ audioUrl: fullAudioUrl, language: "en" });
          if ('error' in transcription) throw new Error(transcription.error);
          transcript = transcription.text;
        } catch (err) {
          await updateMeetingRecording(recordingId, { processingStatus: "error", errorMessage: String(err) });
          throw new Error(`Transcription failed: ${err}`);
        }

        // 5. Use LLM to extract structured notes from transcript
        const agendaContext = input.agendaItems?.length
          ? `\n\nThe meeting agenda included these items:\n${input.agendaItems.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
          : "";

        let aiNotes = "";
        try {
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a meeting notes assistant for a small business. Extract structured notes from the meeting transcript. Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence overview of what was discussed",
  "actionItems": ["action item 1", "action item 2"],
  "resolvedItems": ["resolved item 1"],
  "keyDecisions": ["decision 1"]
}
Be concise and specific. If a field has nothing, use an empty array.`,
              },
              {
                role: "user",
                content: `Meeting transcript:${agendaContext}\n\n${transcript}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "meeting_notes",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    actionItems: { type: "array", items: { type: "string" } },
                    resolvedItems: { type: "array", items: { type: "string" } },
                    keyDecisions: { type: "array", items: { type: "string" } },
                  },
                  required: ["summary", "actionItems", "resolvedItems", "keyDecisions"],
                  additionalProperties: false,
                },
              },
            },
          });
          const rawContent = llmResponse.choices[0].message.content;
          aiNotes = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
        } catch (err) {
          // LLM failure is non-fatal — save transcript only
          aiNotes = JSON.stringify({ summary: transcript.slice(0, 500), actionItems: [], resolvedItems: [], keyDecisions: [] });
        }

        // 6. Save transcript + AI notes to DB
        await updateMeetingRecording(recordingId, { transcript, aiNotes, processingStatus: "done" });

        // 7. Also save AI summary back to the meeting log for display in the calendar
        const parsed = (() => { try { return JSON.parse(aiNotes); } catch { return null; } })();
        if (parsed?.summary) {
          await saveSummary(input.dateKey, input.meetingType, `[Recording Summary]\n${parsed.summary}\n\nAction Items:\n${(parsed.actionItems as string[]).map((a: string) => `• ${a}`).join("\n")}`);
        }

        return { success: true, recordingId, transcript, aiNotes };
      }),

    /** Get the latest recording for a meeting log. */
    get: publicProcedure
      .input(z.object({ dateKey: z.string(), meetingType: z.enum(["daily", "weekly", "monthly", "quarterly"]) }))
      .query(async ({ input }) => {
        const log = await getMeetingLog(input.dateKey, input.meetingType);
        if (!log) return { recording: null };
        const recording = await getMeetingRecording(log.id);
        return { recording };
      }),
  }),

  onboarding: router({
    /** Check if the current account has completed onboarding. */
    getStatus: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const profile = await getBusinessProfile(input.accountId);
        return {
          complete: profile?.onboardingComplete ?? false,
          profile: profile ?? null,
        };
      }),

    /** Save onboarding answers (can be called multiple times — upserts). */
    save: publicProcedure
      .input(z.object({
        accountId: z.number(),
        businessName: z.string().min(1),
        industry: z.string().min(1),
        ownerCount: z.number().int().min(1).max(20),
        employeeCount: z.number().int().min(0).max(500),
        workDays: z.array(z.number().int().min(0).max(6)),
        meetingDayPrefs: z.object({
          ownerDaily: z.number().int().min(0).max(6),
          ownerWeekly: z.number().int().min(0).max(6),
          ownerMonthly: z.number().int().min(0).max(6),
          teamDaily: z.number().int().min(0).max(6),
          teamWeekly: z.number().int().min(0).max(6),
        }),
        onboardingComplete: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const profile = await upsertBusinessProfile(input);
        return { success: true, profile };
      }),

    /** Generate the meeting schedule for a year based on business profile + closed periods. */
    generateCalendar: publicProcedure
      .input(z.object({ accountId: z.number(), year: z.number().int() }))
      .query(async ({ input }) => {
        const profile = await getBusinessProfile(input.accountId);
        if (!profile) return { meetings: [] };
        const closedPeriods = await getClosedPeriods(input.accountId);
        const workDays: number[] = JSON.parse(profile.workDays);
        const meetingDayPrefs = JSON.parse(profile.meetingDayPrefs);
        const meetings = generateMeetingSchedule({
          year: input.year,
          workDays,
          meetingDayPrefs,
          closedPeriods,
        });
        return { meetings };
      }),
  }),

  schedule: router({
    /** Get all closed periods for an account. */
    getClosedPeriods: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const periods = await getClosedPeriods(input.accountId);
        return { periods };
      }),

    /** Add a closed day or week. Automatically recalculates affected meetings. */
    addClosedPeriod: publicProcedure
      .input(z.object({
        accountId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        label: z.string().optional(),
        periodType: z.enum(["day", "week"]),
      }))
      .mutation(async ({ input }) => {
        const period = await addClosedPeriod(input);
        return { success: true, period };
      }),

    /** Remove a closed period. */
    removeClosedPeriod: publicProcedure
      .input(z.object({ id: z.number(), accountId: z.number() }))
      .mutation(async ({ input }) => {
        await removeClosedPeriod(input.id, input.accountId);
        return { success: true };
      }),

    /** Get all meeting schedule overrides (rescheduled meetings) for an account. */
    getOverrides: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const overrides = await getMeetingOverrides(input.accountId);
        return { overrides };
      }),
  }),

  board: router({
    /** List all active (non-archived) board cards. */
    list: publicProcedure.query(async () => {
      const cards = await getBoardCards(false);
      return { cards };
    }),

    /** Create a new board card (update, issue, or task). */
    create: publicProcedure
      .input(z.object({
        author: z.enum(["Matt", "Lynn"]),
        type: z.enum(["update", "issue", "task"]),
        business: z.enum(["chiropractic", "crossfit", "realty", "general"]),
        content: z.string().min(1).max(1000),
        assignedTo: z.enum(["Matt", "Lynn"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const card = await createBoardCard(input);
        return { card };
      }),

    /** Doer marks a task as done (first step of two-step completion). */
    markDone: publicProcedure
      .input(z.object({
        id: z.number(),
        completedBy: z.enum(["Matt", "Lynn"]),
      }))
      .mutation(async ({ input }) => {
        await markTaskDone(input.id, input.completedBy);
        return { success: true };
      }),

    /** Requester confirms the task is done (second step — moves to archive). */
    confirmDone: publicProcedure
      .input(z.object({
        id: z.number(),
        confirmedBy: z.enum(["Matt", "Lynn"]),
      }))
      .mutation(async ({ input }) => {
        await confirmTaskDone(input.id, input.confirmedBy);
        return { success: true };
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
  weeklyReport: router({
    /** Get all employees with their metrics for the current account. */
    getEmployees: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        return getEmployeesWithMetrics(input.accountId);
      }),

    /** Create or update an employee and their metrics. */
    saveEmployee: publicProcedure
      .input(z.object({
        accountId: z.number(),
        id: z.number().optional(),
        name: z.string().min(1),
        role: z.string().min(1),
        sortOrder: z.number().optional(),
        metrics: z.array(z.object({
          label: z.string().min(1),
          unit: z.string().optional(),
          sortOrder: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const empId = await saveEmployee(input);
        return { success: true, id: empId };
      }),

    /** Soft-delete an employee. */
    deleteEmployee: publicProcedure
      .input(z.object({ employeeId: z.number(), accountId: z.number() }))
      .mutation(async ({ input }) => {
        await deactivateEmployee(input.employeeId, input.accountId);
        return { success: true };
      }),

    /** Submit weekly numbers for one employee (owner acting on their behalf). */
    submitReport: publicProcedure
      .input(z.object({
        employeeId: z.number(),
        weekKey: z.string(), // "YYYY-Www"
        submittedByOwnerId: z.number(),
        entries: z.array(z.object({
          metricId: z.number(),
          value: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        await submitWeeklyReport(input);
        return { success: true };
      }),

    /** Get this week + last week summary for all employees. */
    getSummary: publicProcedure
      .input(z.object({
        accountId: z.number(),
        weekKey: z.string(),
        prevWeekKey: z.string(),
      }))
      .query(async ({ input }) => {
        return getWeeklyReportSummary(input.accountId, input.weekKey, input.prevWeekKey);
      }),
  }),
});
export type AppRouter = typeof appRouter;

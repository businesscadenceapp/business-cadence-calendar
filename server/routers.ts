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
  getWaitlistEmails,
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
  saveMeetingOverride,
  recalculateOverrides,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getPersonByEmail,
  getPersonById,
  getPersonByInviteToken,
  getPersonsByAccount,
  createPerson,
  updatePerson,
  deletePerson,
  getKpiCategories,
  createKpiCategory,
  updateKpiCategory,
  upsertKpiEntry,
  getKpiEntries,
  getKpiMonthlyTotals,
  getBusinessesByAccount,
  createBusiness,
  updateBusiness,
  getReportQuestions,
  createReportQuestion,
  deleteReportQuestion,
  upsertReportAnswer,
  getReportAnswers,
  createNotification,
  getNotificationsForPerson,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./db";
import { generateMeetingSchedule } from "../shared/calendarEngine";
import { notifyOwner } from "./_core/notification";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { appUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { nanoid } from "nanoid";

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
        updatedBy: z.string().min(1),
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

    /** Return the scope + displayName for a given accountId (used to filter UI by business). */
    getScope: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [user] = await db
          .select({ scope: appUsers.scope, displayName: appUsers.displayName })
          .from(appUsers)
          .where(eq(appUsers.id, input.accountId))
          .limit(1);
        return user ?? null;
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

    /** List all waitlist emails (owner admin only). */
    list: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        if (input.accountId < 0) return { emails: [] };
        const emails = await getWaitlistEmails();
        return { emails };
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
          ownerDaily: z.array(z.number().int().min(0).max(6)),
          ownerWeekly: z.number().int().min(0).max(6),
          ownerMonthly: z.number().int().min(0).max(6),
          quarterlyDay: z.number().int().min(0).max(6),
          teamDaily: z.array(z.number().int().min(0).max(6)),
          teamWeekly: z.number().int().min(0).max(6),
          ownerDailyEnabled: z.boolean().optional().default(true),
          ownerWeeklyEnabled: z.boolean().optional().default(true),
          ownerMonthlyEnabled: z.boolean().optional().default(true),
          quarterlyEnabled: z.boolean().optional().default(true),
          teamDailyEnabled: z.boolean().optional().default(true),
          teamWeeklyEnabled: z.boolean().optional().default(true),
        }),
        onboardingComplete: z.boolean(),
        meetingTimes: z.object({
          ownerDaily: z.string().optional(),
          ownerWeekly: z.string().optional(),
          ownerMonthly: z.string().optional(),
          quarterly: z.string().optional(),
          teamDaily: z.string().optional(),
          teamWeekly: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const profile = await upsertBusinessProfile(input);
        return { success: true, profile };
      }),

    /** Update just the meeting day preferences (used from Settings page). */
    updateMeetingPrefs: publicProcedure
      .input(z.object({
        accountId: z.number(),
        meetingDayPrefs: z.object({
          ownerDaily: z.array(z.number().int().min(0).max(6)),
          ownerWeekly: z.number().int().min(0).max(6),
          ownerMonthly: z.number().int().min(0).max(6),
          quarterlyDay: z.number().int().min(0).max(6),
          teamDaily: z.array(z.number().int().min(0).max(6)),
          teamWeekly: z.number().int().min(0).max(6),
          ownerDailyEnabled: z.boolean().optional().default(true),
          ownerWeeklyEnabled: z.boolean().optional().default(true),
          ownerMonthlyEnabled: z.boolean().optional().default(true),
          quarterlyEnabled: z.boolean().optional().default(true),
          teamDailyEnabled: z.boolean().optional().default(true),
          teamWeeklyEnabled: z.boolean().optional().default(true),
        }),
        meetingTimes: z.object({
          ownerDaily: z.string().optional(),
          ownerWeekly: z.string().optional(),
          ownerMonthly: z.string().optional(),
          quarterly: z.string().optional(),
          teamDaily: z.string().optional(),
          teamWeekly: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const profile = await getBusinessProfile(input.accountId);
        if (!profile) throw new Error("Business profile not found");
        const existing = JSON.parse(profile.meetingDayPrefs);
        const merged = { ...existing, ...input.meetingDayPrefs };
        await upsertBusinessProfile({
          accountId: input.accountId,
          businessName: profile.businessName,
          industry: profile.industry,
          ownerCount: profile.ownerCount,
          employeeCount: profile.employeeCount,
          workDays: JSON.parse(profile.workDays),
          meetingDayPrefs: merged,
          meetingTimes: input.meetingTimes,
          onboardingComplete: profile.onboardingComplete,
        });
        return { success: true };
      }),

    /** Generate the meeting schedule for a year based on business profile + closed periods. */
    generateCalendar: publicProcedure
      .input(z.object({ accountId: z.number(), year: z.number().int() }))
      .query(async ({ input }) => {
        const profile = await getBusinessProfile(input.accountId);
        if (!profile) return { meetings: [], closedDates: [], workDays: [] };
        const closedPeriods = await getClosedPeriods(input.accountId);
        const workDays: number[] = JSON.parse(profile.workDays);
        const meetingDayPrefs = JSON.parse(profile.meetingDayPrefs);
        const meetings = generateMeetingSchedule({
          year: input.year,
          workDays,
          meetingDayPrefs,
          closedPeriods,
        });
        // Expand closed periods into individual YYYY-MM-DD date strings for the frontend
        const closedDates: string[] = [];
        for (const period of closedPeriods) {
          const start = new Date(period.startDate + "T00:00:00");
          const end = new Date(period.endDate + "T00:00:00");
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            closedDates.push(d.toISOString().slice(0, 10));
          }
        }
        return { meetings, closedDates, workDays };
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

    /** Add a closed day or week. Automatically recalculates affected meetings and persists overrides. */
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

        // After adding the closed period, recalculate all overrides
        await recalculateOverrides(input.accountId, generateMeetingSchedule);

        return { success: true, period };
      }),

    /** Remove a closed period. Recalculates overrides after removal. */
    removeClosedPeriod: publicProcedure
      .input(z.object({ id: z.number(), accountId: z.number() }))
      .mutation(async ({ input }) => {
        await removeClosedPeriod(input.id, input.accountId);
        // Recalculate overrides after removal
        await recalculateOverrides(input.accountId, generateMeetingSchedule);
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
        author: z.string().min(1).max(128),
        type: z.enum(["update", "issue", "task"]),
        business: z.enum(["chiropractic", "crossfit", "realty", "general"]),
        content: z.string().min(1).max(1000),
        assignedTo: z.string().min(1).max(128).optional(),
        dueAt: z.number().optional(),          // ms since epoch — task due date
        updateDate: z.number().optional(),     // ms since epoch — date this update covers
        meetingType: z.enum(["daily_huddle", "weekly_meeting", "quarterly_review"]).optional(), // issue: which meeting
        scheduledDate: z.number().optional(),  // ms since epoch — date of the meeting occurrence
        accountId: z.number().optional(),      // for notification routing
        notifyPersonIds: z.array(z.string()).optional(), // explicit recipient list (person IDs)
      }))
      .mutation(async ({ input }) => {
        const card = await createBoardCard(input);
        // Generate notifications for relevant recipients
        if (input.accountId) {
          const allPersons = await getPersonsByAccount(input.accountId);
          if (input.type === "task" && input.assignedTo) {
            // Notify the assignee
            const recipient = allPersons.find(p => p.name === input.assignedTo);
            if (recipient) {
              await createNotification({
                accountId: input.accountId,
                recipientPersonId: recipient.id,
                type: "task_assigned",
                title: "New task assigned to you",
                body: `${input.author} assigned you a task: "${input.content.slice(0, 120)}"`,
                linkTo: "/app/board",
              });
            }
          } else if (input.type === "update" || input.type === "issue") {
            const notifType = input.type === "issue" ? "new_issue" : "new_update";
            const notifTitle = input.type === "issue" ? "New issue posted" : "New update posted";
            // Use explicitly selected recipients if provided; otherwise fall back to owners/coowners
            const recipients = input.notifyPersonIds && input.notifyPersonIds.length > 0
              ? allPersons.filter(p => input.notifyPersonIds!.includes(p.id))
              : allPersons.filter(p => p.role === "owner" || p.role === "coowner");
            for (const p of recipients) {
              if (p.name !== input.author) {
                await createNotification({
                  accountId: input.accountId,
                  recipientPersonId: p.id,
                  type: notifType,
                  title: notifTitle,
                  body: `${input.author}: "${input.content.slice(0, 120)}"`,
                  linkTo: "/app/board",
                });
              }
            }
          }
        }
        return { card };
      }),

    /** Doer marks a task as done (first step of two-step completion). */
    markDone: publicProcedure
      .input(z.object({
        id: z.number(),
        completedBy: z.string().min(1).max(128),
        accountId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Fetch card before marking done to get the author
        const cards = await getBoardCards(false);
        const card = cards.find(c => c.id === input.id);
        await markTaskDone(input.id, input.completedBy);
        // Notify the task author (requester) that it's awaiting their confirmation
        if (input.accountId && card) {
          const allPersons = await getPersonsByAccount(input.accountId);
          const requester = allPersons.find(p => p.name === card.author);
          if (requester && requester.name !== input.completedBy) {
            await createNotification({
              accountId: input.accountId,
              recipientPersonId: requester.id,
              type: "task_done_pending",
              title: "Task completed — needs your confirmation",
              body: `${input.completedBy} marked done: "${card.content.slice(0, 120)}"`,
              linkTo: "/app/board",
            });
          }
        }
        return { success: true };
      }),

    /** Requester confirms the task is done (second step — moves to archive). */
    confirmDone: publicProcedure
      .input(z.object({
        id: z.number(),
        confirmedBy: z.string().min(1).max(128),
        accountId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Fetch card before archiving to get the doer
        const cards = await getBoardCards(false);
        const card = cards.find(c => c.id === input.id);
        await confirmTaskDone(input.id, input.confirmedBy);
        // Notify the doer that their work was confirmed
        if (input.accountId && card?.assignedTo) {
          const allPersons = await getPersonsByAccount(input.accountId);
          const doer = allPersons.find(p => p.name === card.assignedTo);
          if (doer && doer.name !== input.confirmedBy) {
            await createNotification({
              accountId: input.accountId,
              recipientPersonId: doer.id,
              type: "task_confirmed",
              title: "Task confirmed complete!",
              body: `${input.confirmedBy} confirmed your task: "${card.content.slice(0, 120)}"`,
              linkTo: "/app/board",
            });
          }
        }
        return { success: true };
      }),

    /** Mark a card as seen by the other person. */
    markSeen: publicProcedure
      .input(z.object({
        id: z.number(),
        seenBy: z.string().min(1).max(128),
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

    /** List all comments for a board card. */
    listComments: publicProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { boardComments } = await import('../drizzle/schema');
        const { eq, asc } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return { comments: [] };
        const comments = await db
          .select()
          .from(boardComments)
          .where(eq(boardComments.cardId, input.cardId))
          .orderBy(asc(boardComments.createdAt));
        return { comments };
      }),

    /** Add a comment to a board card. */
    addComment: publicProcedure
      .input(z.object({
        cardId: z.number(),
        authorName: z.string().min(1).max(128),
        authorPersonId: z.string().optional(),
        content: z.string().min(1).max(2000),
        accountId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { boardComments, boardCards } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('DB unavailable');
        const [comment] = await db.insert(boardComments).values({
          cardId: input.cardId,
          authorName: input.authorName,
          authorPersonId: input.authorPersonId,
          content: input.content,
        }).$returningId();
        // Notify the card author if they're not the commenter
        if (input.accountId) {
          const cards = await getBoardCards(false);
          const card = cards.find(c => c.id === input.cardId);
          if (card && card.author !== input.authorName) {
            const allPersons = await getPersonsByAccount(input.accountId);
            const cardAuthor = allPersons.find(p => p.name === card.author);
            if (cardAuthor) {
              await createNotification({
                accountId: input.accountId,
                recipientPersonId: cardAuthor.id,
                type: "new_update",
                title: `New comment from ${input.authorName}`,
                body: `On "${card.content.slice(0, 80)}": ${input.content.slice(0, 120)}`,
                linkTo: "/app/board",
              });
            }
          }
        }
        return { success: true, id: comment.id };
      }),

    /** Delete a comment (author only). */
    deleteComment: publicProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { boardComments } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('DB unavailable');
        await db.delete(boardComments).where(eq(boardComments.id, input.commentId));
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
  goals: router({
    /** List goals for an account, optionally filtered by year. */
    list: publicProcedure
      .input(z.object({ accountId: z.number(), year: z.number().optional() }))
      .query(async ({ input }) => {
        return getGoals(input.accountId, input.year);
      }),

    /** Create a new goal. */
    create: publicProcedure
      .input(z.object({
        accountId: z.number(),
        business: z.enum(["chiropractic", "crossfit", "realty", "general"]),
        period: z.enum(["annual", "quarterly"]),
        quarter: z.number().min(1).max(4).optional(),
        year: z.number(),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        status: z.enum(["active", "achieved", "missed", "deferred"]).default("active"),
        owner: z.string().default("both"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return createGoal(input);
      }),

    /** Update a goal's title, description, status, or owner. */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "achieved", "missed", "deferred"]).optional(),
        owner: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateGoal(id, data);
        return { success: true };
      }),

  /** Delete a goal. */
  delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGoal(input.id);
        return { success: true };
      }),
  }),

  /** Person auth — individual logins for owners and employees. */
  person: router({
    /** Login with email + password. Returns personId stored in localStorage. */
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        const person = await getPersonByEmail(input.email);
        if (!person || !person.passwordHash) {
          await bcrypt.compare(input.password, "$2a$10$invalidhashpadding000000000000000000000000000000000000");
          return { success: false as const, person: null };
        }
        if (!person.inviteAccepted) {
          return { success: false as const, person: null, reason: "invite_pending" as const };
        }
        const correct = await bcrypt.compare(input.password, person.passwordHash);
        if (!correct) return { success: false as const, person: null };
        return {
          success: true as const,
          person: {
            id: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            businessScope: person.businessScope,
            accountId: person.accountId,
          },
        };
      }),

    /** Get a person by ID (used to restore session on page load). */
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const person = await getPersonById(input.id);
        if (!person) return null;
        return {
          id: person.id,
          name: person.name,
          email: person.email,
          role: person.role,
          businessScope: person.businessScope,
          accountId: person.accountId,
        };
      }),

    /** Look up an invite token — returns name + validity without consuming the token. */
    lookupInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const person = await getPersonByInviteToken(input.token);
        if (!person) return { valid: false as const, reason: "not_found" as const, name: null };
        if (person.inviteAccepted) return { valid: false as const, reason: "already_accepted" as const, name: person.name };
        return { valid: true as const, name: person.name, email: person.email, role: person.role };
      }),

    /** List all persons for an account (owner only). */
    list: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const people = await getPersonsByAccount(input.accountId);
        return people.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          businessScope: p.businessScope,
          inviteAccepted: p.inviteAccepted,
          createdAt: p.createdAt,
        }));
      }),

    /** Invite a person (owner creates the record, sends invite link). */
    invite: publicProcedure
      .input(z.object({
        accountId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["owner", "coowner", "employee"]),
        businessScope: z.string(),
        origin: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getPersonByEmail(input.email);
        if (existing) return { success: false as const, reason: "already_exists" as const };
        const token = nanoid(32);
        const person = await createPerson({
          accountId: input.accountId,
          name: input.name,
          email: input.email,
          role: input.role,
          businessScope: input.businessScope,
          inviteToken: token,
          inviteAccepted: false,
          passwordHash: null,
        });
        const inviteUrl = `${input.origin}/accept-invite?token=${token}`;
        // Notify owner of the invite (non-blocking)
        try {
          await notifyOwner({
            title: `Invite sent to ${input.name}`,
            content: `Invite link: ${inviteUrl}`,
          });
        } catch { /* non-blocking */ }
        return { success: true as const, inviteUrl, personId: person.id };
      }),

    /** Accept an invite — person sets their own password. */
    acceptInvite: publicProcedure
      .input(z.object({ token: z.string(), password: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const person = await getPersonByInviteToken(input.token);
        if (!person) return { success: false as const, reason: "invalid_token" as const };
        if (person.inviteAccepted) return { success: false as const, reason: "already_accepted" as const };
        const passwordHash = await bcrypt.hash(input.password, 10);
        await updatePerson(person.id, { passwordHash, inviteAccepted: true, inviteToken: null });
        return {
          success: true as const,
          person: {
            id: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            businessScope: person.businessScope,
            accountId: person.accountId,
          },
        };
      }),

    /** Remove a person from the account (owner only). */
    remove: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deletePerson(input.id);
        return { success: true };
      }),

    /** Owner registers themselves as the first person on their account.
     * If accountId=0, a new app_users row is auto-created for them.
     */
    register: publicProcedure
      .input(z.object({
        accountId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["owner", "coowner"]).default("owner"),
        businessScope: z.string().default("all"),
      }))
      .mutation(async ({ input }) => {
        const existing = await getPersonByEmail(input.email);
        if (existing) return { success: false as const, reason: "already_exists" as const };
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Auto-create an app_users account row if this is a brand-new owner signup
        let resolvedAccountId = input.accountId;
        if (resolvedAccountId === 0) {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          // Use email prefix as username (unique, lowercase)
          const username = input.email.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60);
          const acctHash = await bcrypt.hash(input.password, 10);
          const result = await db.insert(appUsers).values({
            username,
            passwordHash: acctHash,
            scope: "owner",
            displayName: input.name,
          });
          resolvedAccountId = (result as any).insertId ?? 0;
        }

        const person = await createPerson({
          accountId: resolvedAccountId,
          name: input.name,
          email: input.email,
          role: input.role,
          businessScope: input.businessScope,
          inviteToken: null,
          inviteAccepted: true,
          passwordHash,
        });
        return {
          success: true as const,
          person: {
            id: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            businessScope: person.businessScope,
            accountId: person.accountId,
          },
        };
      }),
  }),

  /** KPI categories and entries for employee reporting. */
  kpi: router({
    /** List KPI categories for a business. */
    listCategories: publicProcedure
      .input(z.object({ accountId: z.number(), businessSlug: z.string().optional() }))
      .query(async ({ input }) => {
        return getKpiCategories(input.accountId, input.businessSlug);
      }),

    /** Create a KPI category. */
    createCategory: publicProcedure
      .input(z.object({
        accountId: z.number(),
        businessSlug: z.string(),
        name: z.string().min(1),
        unit: z.string().optional(),
        frequency: z.enum(["weekly", "monthly"]).default("weekly"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return createKpiCategory(input);
      }),

    /** Update a KPI category. */
    updateCategory: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        unit: z.string().optional(),
        frequency: z.enum(["weekly", "monthly"]).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        monthlyTarget: z.number().nullable().optional(),
        showGoalToStaff: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKpiCategory(id, data);
        return { success: true };
      }),

    /** Submit a KPI entry for a period. */
    submitEntry: publicProcedure
      .input(z.object({
        accountId: z.number(),
        categoryId: z.number(),
        personId: z.string(),
        periodKey: z.string(), // "YYYY-Www" for weekly, "YYYY-MM" for monthly
        value: z.number(),
      }))
      .mutation(async ({ input }) => {
        await upsertKpiEntry(input);
        return { success: true };
      }),

    /** Get KPI entries for a period. */
    getEntries: publicProcedure
      .input(z.object({
        accountId: z.number(),
        businessSlug: z.string(),
        periodKey: z.string(),
      }))
      .query(async ({ input }) => {
        return getKpiEntries(input.accountId, input.businessSlug, input.periodKey);
      }),

    /** Get monthly totals for a business. */
    getMonthlyTotals: publicProcedure
      .input(z.object({
        accountId: z.number(),
        businessSlug: z.string(),
        yearMonth: z.string(), // "YYYY-MM"
      }))
      .query(async ({ input }) => {
        return getKpiMonthlyTotals(input.accountId, input.businessSlug, input.yearMonth);
      }),

    /**
     * Seed default KPI categories for a business if none exist yet.
     * Chiro defaults: Adjustments/week, New Patients/week, Reactivated Patients/month.
     * CrossFit defaults: Active Members/month, Classes Held/week, New Members/month.
     * Realty defaults: Listings Active/month, Closings/month, Leads/week.
     */
    seedDefaults: publicProcedure
      .input(z.object({ accountId: z.number(), businessSlug: z.string() }))
      .mutation(async ({ input }) => {
        const existing = await getKpiCategories(input.accountId, input.businessSlug);
        if (existing.length > 0) return { seeded: false, message: "Categories already exist" };
        const defaults: Record<string, { name: string; unit: string; frequency: "weekly" | "monthly" }[]> = {
          chiropractic: [
            { name: "Adjustments", unit: "visits", frequency: "weekly" },
            { name: "New Patients", unit: "patients", frequency: "weekly" },
            { name: "Reactivated Patients", unit: "patients", frequency: "monthly" },
            { name: "Patient Visit Average (PVA)", unit: "visits", frequency: "monthly" },
          ],
          crossfit: [
            { name: "Active Members", unit: "members", frequency: "monthly" },
            { name: "Classes Held", unit: "classes", frequency: "weekly" },
            { name: "New Members", unit: "members", frequency: "monthly" },
            { name: "Attendance", unit: "check-ins", frequency: "weekly" },
          ],
          realty: [
            { name: "Active Listings", unit: "listings", frequency: "monthly" },
            { name: "Closings", unit: "closings", frequency: "monthly" },
            { name: "New Leads", unit: "leads", frequency: "weekly" },
          ],
        };
        const cats = defaults[input.businessSlug] ?? [
          { name: "Revenue", unit: "$", frequency: "monthly" as const },
          { name: "Tasks Completed", unit: "tasks", frequency: "weekly" as const },
        ];
        for (let i = 0; i < cats.length; i++) {
          await createKpiCategory({ accountId: input.accountId, businessSlug: input.businessSlug, ...cats[i], sortOrder: i });
        }
        return { seeded: true, count: cats.length };
      }),
  }),

  /** Business management — list and configure account businesses. */
  business: router({
    /** List all active businesses for an account. */
    list: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        return getBusinessesByAccount(input.accountId);
      }),

    /** Create a new business for an account. */
    create: publicProcedure
      .input(z.object({
        accountId: z.number(),
        name: z.string().min(1),
        slug: z.string().min(1),
        icon: z.string().default("🏢"),
        color: z.string().default("#64748B"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return createBusiness(input);
      }),

    /** Update a business. */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBusiness(id, data);
        return { success: true };
      }),
  }),

  /** Weekly employee report questions and answers. */
  report: router({
    /** List report questions for an account (optionally filtered by businessId). */
    listQuestions: publicProcedure
      .input(z.object({ accountId: z.number(), businessId: z.number().optional() }))
      .query(async ({ input }) => {
        return getReportQuestions(input.accountId, input.businessId);
      }),

    /** Create a report question. */
    createQuestion: publicProcedure
      .input(z.object({
        accountId: z.number(),
        businessId: z.number().default(0),
        question: z.string().min(1),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return createReportQuestion(input);
      }),

    /** Soft-delete a report question. */
    deleteQuestion: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteReportQuestion(input.id);
        return { success: true };
      }),

    /** Submit (upsert) a report answer for a week. */
    submitAnswer: publicProcedure
      .input(z.object({
        questionId: z.number(),
        personId: z.string(),
        accountId: z.number(),
        weekKey: z.string(), // "YYYY-Www"
        answer: z.string(),
      }))
      .mutation(async ({ input }) => {
        await upsertReportAnswer(input);
        return { success: true };
      }),

    /** Get all answers for a week (owner view). */
    getWeekAnswers: publicProcedure
      .input(z.object({ accountId: z.number(), weekKey: z.string() }))
      .query(async ({ input }) => {
        return getReportAnswers(input.accountId, input.weekKey);
      }),
  }),
  /** In-app notifications — per-person alerts for board events. */
  notification: router({
    /** Get notifications for the logged-in person. */
    list: publicProcedure
      .input(z.object({ accountId: z.number(), personId: z.string() }))
      .query(async ({ input }) => {
        const items = await getNotificationsForPerson(input.accountId, input.personId);
        return { items };
      }),

    /** Count unread notifications for badge display. */
    unreadCount: publicProcedure
      .input(z.object({ accountId: z.number(), personId: z.string() }))
      .query(async ({ input }) => {
        const count = await countUnreadNotifications(input.accountId, input.personId);
        return { count };
      }),

    /** Mark a single notification as read. */
    markRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { success: true };
      }),

    /** Mark all notifications as read for a person. */
    markAllRead: publicProcedure
      .input(z.object({ accountId: z.number(), personId: z.string() }))
      .mutation(async ({ input }) => {
        await markAllNotificationsRead(input.accountId, input.personId);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

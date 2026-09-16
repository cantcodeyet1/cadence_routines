import { Router } from "express";
import { prisma } from "../db.js";
import { toDateOnly, todayDateOnly } from "../lib/dates.js";
import { computeNextHabitStreak, computeNextRoutineStreak } from "../lib/streaks.js";

export const sessionsRouter = Router();

// POST /api/sessions/start  { routineId, date? }
// A routine can be played more than once a day, so this doesn't just
// find-or-create today's session: if the most recent session for today is
// already complete, "starting" begins a genuinely new run. It only resumes
// the latest session when that run is still in progress (nothing skipped
// past, no completedAt yet) - covers a stray double-call (e.g. React
// StrictMode) or navigating back into an unfinished routine, without
// letting a finished run block starting a fresh one.
sessionsRouter.post("/start", async (req, res, next) => {
  try {
    const { routineId, date } = req.body;
    const dateOnly = date ? toDateOnly(date) : todayDateOnly();

    const latest = await prisma.routineSession.findFirst({
      where: { routineId, date: dateOnly },
      orderBy: { startedAt: "desc" },
      include: { logs: true },
    });

    if (latest && !latest.completedAt) {
      return res.status(200).json(latest);
    }

    const session = await prisma.routineSession.create({
      data: { routineId, date: dateOnly },
      include: { logs: true },
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sessions/:sessionId
// Removes a session and its logs (e.g. clearing out a stray or duplicate
// run). Doesn't retroactively recompute streaks - those only move forward
// as sessions complete, never backward on delete.
sessionsRouter.delete("/:sessionId", async (req, res, next) => {
  try {
    await prisma.routineSession.delete({ where: { id: req.params.sessionId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:sessionId/logs
// { habitId, completedAt?, durationSec?, note?, skipped? }
// Ticking a habit: pass completedAt (defaults to now if omitted and skipped is falsy).
sessionsRouter.post("/:sessionId/logs", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { habitId, durationSec, note, skipped, startedAt } = req.body;
    const completedAt = skipped ? null : req.body.completedAt ? new Date(req.body.completedAt) : new Date();
    const startedAtDate = startedAt ? new Date(startedAt) : null;

    const session = await prisma.routineSession.findUniqueOrThrow({ where: { id: sessionId } });

    const log = await prisma.habitLog.upsert({
      where: { sessionId_habitId: { sessionId, habitId } },
      update: { startedAt: startedAtDate, completedAt, durationSec: durationSec ?? null, note: note ?? null, skipped: !!skipped },
      create: {
        sessionId,
        habitId,
        startedAt: startedAtDate,
        completedAt,
        durationSec: durationSec ?? null,
        note: note ?? null,
        skipped: !!skipped,
      },
    });

    if (completedAt && !skipped) {
      const habit = await prisma.habit.findUniqueOrThrow({ where: { id: habitId } });
      const next = computeNextHabitStreak({
        prevLastCompletedDate: habit.lastCompletedDate,
        prevCurrentStreak: habit.currentStreak,
        prevBestStreak: habit.bestStreak,
        completionDate: session.date,
      });
      await prisma.habit.update({ where: { id: habitId }, data: next });
    }

    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:sessionId/complete  { note? }
// Marks the session done. The routine's streak only advances if every
// required habit in it was completed (not skipped).
sessionsRouter.post("/:sessionId/complete", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { note } = req.body;

    const session = await prisma.routineSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date(), note: note ?? null },
      include: { logs: true, routine: { include: { days: true, habits: true } } },
    });

    const requiredHabitIds = session.routine.habits.filter((h) => h.required).map((h) => h.habitId);
    const doneHabitIds = new Set(
      session.logs.filter((l) => l.completedAt && !l.skipped).map((l) => l.habitId)
    );
    const allRequiredDone = requiredHabitIds.every((id) => doneHabitIds.has(id));

    let routine = session.routine;
    if (allRequiredDone) {
      const scheduledWeekdays = new Set(session.routine.days.map((d) => d.weekday));
      const next = computeNextRoutineStreak({
        scheduledWeekdays,
        prevLastCompletedDate: session.routine.lastCompletedDate,
        prevCurrentStreak: session.routine.currentStreak,
        prevBestStreak: session.routine.bestStreak,
        completionDate: session.date,
      });
      routine = await prisma.routine.update({ where: { id: session.routine.id }, data: next });
    }

    const xpEarned = session.logs
      .filter((l) => l.completedAt && !l.skipped)
      .length
        ? await prisma.habit
            .findMany({ where: { id: { in: [...doneHabitIds] } } })
            .then((habits) => habits.reduce((sum, h) => sum + h.xpValue, 0))
        : 0;

    res.json({
      sessionId: session.id,
      routineId: routine.id,
      currentStreak: routine.currentStreak,
      bestStreak: routine.bestStreak,
      streakAdvanced: allRequiredDone,
      xpEarned,
      doneCount: doneHabitIds.size,
      totalCount: session.routine.habits.length,
      quote: session.routine.quote,
    });
  } catch (err) {
    next(err);
  }
});

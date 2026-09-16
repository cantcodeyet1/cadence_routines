import { Router } from "express";
import { prisma } from "../db.js";
import { toDateOnly, todayDateOnly, weekdayOf } from "../lib/dates.js";

export const routinesRouter = Router();

async function routineCardData(routine, dateOnly) {
  // A routine can be run more than once a day, so "today's" progress is
  // whichever session was started most recently on this date.
  const session = await prisma.routineSession.findFirst({
    where: { routineId: routine.id, date: dateOnly },
    orderBy: { startedAt: "desc" },
    include: { logs: true },
  });

  const habitCount = await prisma.routineHabit.count({ where: { routineId: routine.id } });
  const routineHabits = await prisma.routineHabit.findMany({
    where: { routineId: routine.id },
    include: { habit: true },
  });

  const doneHabitIds = new Set(
    (session?.logs ?? []).filter((l) => l.completedAt && !l.skipped).map((l) => l.habitId)
  );
  const doneCount = doneHabitIds.size;
  const xpLeft = routineHabits
    .filter((rh) => !doneHabitIds.has(rh.habitId))
    .reduce((sum, rh) => sum + rh.habit.xpValue, 0);

  return {
    id: routine.id,
    name: routine.name,
    color: routine.color,
    currentStreak: routine.currentStreak,
    bestStreak: routine.bestStreak,
    weekdays: routine.days?.map((d) => d.weekday) ?? [],
    habitCount,
    doneCount,
    xpLeft,
    sessionId: session?.id ?? null,
    completedAt: session?.completedAt ?? null,
  };
}

// GET /api/routines?date=YYYY-MM-DD  (defaults to today)
// GET /api/routines?all=true  -- every routine regardless of schedule (used by Profile)
routinesRouter.get("/", async (req, res, next) => {
  try {
    const dateOnly = req.query.date ? toDateOnly(req.query.date) : todayDateOnly();
    const weekday = weekdayOf(dateOnly);

    const routines = await prisma.routine.findMany({
      where: req.query.all === "true" ? {} : { days: { some: { weekday } } },
      orderBy: { createdAt: "asc" },
      include: { days: true },
    });

    const cards = await Promise.all(routines.map((r) => routineCardData(r, dateOnly)));
    res.json({ date: dateOnly.toISOString().slice(0, 10), weekday, routines: cards });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id?date=YYYY-MM-DD
routinesRouter.get("/:id", async (req, res, next) => {
  try {
    const dateOnly = req.query.date ? toDateOnly(req.query.date) : todayDateOnly();

    const routine = await prisma.routine.findUnique({
      where: { id: req.params.id },
      include: {
        days: true,
        habits: { include: { habit: true }, orderBy: { position: "asc" } },
      },
    });
    if (!routine) return res.status(404).json({ error: "Routine not found" });

    const session = await prisma.routineSession.findFirst({
      where: { routineId: routine.id, date: dateOnly },
      orderBy: { startedAt: "desc" },
      include: { logs: true },
    });
    const logsByHabitId = new Map((session?.logs ?? []).map((l) => [l.habitId, l]));

    res.json({
      id: routine.id,
      name: routine.name,
      color: routine.color,
      currentStreak: routine.currentStreak,
      bestStreak: routine.bestStreak,
      weekdays: routine.days.map((d) => d.weekday),
      quote: routine.quote,
      session: session
        ? { id: session.id, completedAt: session.completedAt, note: session.note }
        : null,
      habits: routine.habits.map((rh) => ({
        routineHabitId: rh.id,
        position: rh.position,
        required: rh.required,
        id: rh.habit.id,
        name: rh.habit.name,
        type: rh.habit.type,
        targetSec: rh.habit.targetSec,
        xpValue: rh.habit.xpValue,
        colorTag: rh.habit.colorTag,
        currentStreak: rh.habit.currentStreak,
        log: logsByHabitId.get(rh.habit.id)
          ? {
              completedAt: logsByHabitId.get(rh.habit.id).completedAt,
              durationSec: logsByHabitId.get(rh.habit.id).durationSec,
              note: logsByHabitId.get(rh.habit.id).note,
              skipped: logsByHabitId.get(rh.habit.id).skipped,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/routines/:id  -- edit the routine's own fields (habits are
// managed separately via the /habits sub-routes below)
// body: { name?, color?, quote?, weekdays? }
routinesRouter.patch("/:id", async (req, res, next) => {
  try {
    const { name, color, quote, weekdays } = req.body;
    if (name != null && !String(name).trim()) return res.status(400).json({ error: "name cannot be blank" });
    if (weekdays != null && weekdays.length === 0) return res.status(400).json({ error: "pick at least one day" });

    const routine = await prisma.$transaction(async (tx) => {
      const updated = await tx.routine.update({
        where: { id: req.params.id },
        data: {
          ...(name != null && { name: name.trim() }),
          ...(color != null && { color }),
          ...(quote !== undefined && { quote: quote?.trim() || null }),
        },
      });

      if (weekdays != null) {
        await tx.routineDay.deleteMany({ where: { routineId: req.params.id } });
        await tx.routineDay.createMany({
          data: weekdays.map((weekday) => ({ routineId: req.params.id, weekday })),
        });
      }

      return updated;
    });

    res.json(routine);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/routines/:id/habits/reorder  -- persist a new habit order
// body: { order: [routineHabitId, ...] }  (full list, in the new order)
routinesRouter.patch("/:id/habits/reorder", async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: "order must be a non-empty array" });
    }

    const owned = await prisma.routineHabit.count({
      where: { id: { in: order }, routineId: req.params.id },
    });
    if (owned !== order.length) {
      return res.status(400).json({ error: "order includes a habit not in this routine" });
    }

    await prisma.$transaction(
      order.map((routineHabitId, position) =>
        prisma.routineHabit.update({
          where: { id: routineHabitId },
          data: { position },
        })
      )
    );

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id/history?limit=14
// Past sessions for this routine, most recent first, each with its
// per-habit log times (for "when did I actually do this").
routinesRouter.get("/:id/history", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 14, 60);
    const sessions = await prisma.routineSession.findMany({
      where: { routineId: req.params.id, completedAt: { not: null } },
      orderBy: [{ date: "desc" }, { startedAt: "desc" }],
      take: limit,
      include: { logs: { include: { habit: true } } },
    });

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        note: s.note,
        logs: s.logs
          .sort((a, b) => (a.startedAt ?? a.completedAt) - (b.startedAt ?? b.completedAt))
          .map((l, i) => ({
            position: i + 1,
            habitId: l.habitId,
            habitName: l.habit.name,
            startedAt: l.startedAt,
            completedAt: l.completedAt,
            durationSec: l.durationSec,
            skipped: l.skipped,
            note: l.note,
          })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/routines
// body: { name, color, quote?, weekdays: number[], habits: [{ existingHabitId? , name, type, targetSec, xpValue, required }] }
routinesRouter.post("/", async (req, res, next) => {
  try {
    const { name, color, quote, weekdays = [], habits = [] } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name is required" });

    const routine = await prisma.$transaction(async (tx) => {
      const created = await tx.routine.create({
        data: {
          name: name.trim(),
          color: color || "#7C5CFC",
          quote: quote?.trim() || null,
          days: { create: weekdays.map((weekday) => ({ weekday })) },
        },
      });

      let position = 0;
      for (const h of habits) {
        const habit = h.existingHabitId
          ? await tx.habit.findUniqueOrThrow({ where: { id: h.existingHabitId } })
          : await tx.habit.create({
              data: {
                name: h.name,
                type: h.type || "TICK",
                targetSec: h.targetSec ?? null,
                xpValue: h.xpValue ?? 10,
                colorTag: h.colorTag || color || "#7C5CFC",
              },
            });

        await tx.routineHabit.create({
          data: {
            routineId: created.id,
            habitId: habit.id,
            position: position++,
            required: h.required ?? true,
          },
        });
      }

      return created;
    });

    res.status(201).json({ id: routine.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/routines/:id/habits  -- add one habit to an existing routine
routinesRouter.post("/:id/habits", async (req, res, next) => {
  try {
    const routineId = req.params.id;
    const h = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const habit = h.existingHabitId
        ? await tx.habit.findUniqueOrThrow({ where: { id: h.existingHabitId } })
        : await tx.habit.create({
            data: {
              name: h.name,
              type: h.type || "TICK",
              targetSec: h.targetSec ?? null,
              xpValue: h.xpValue ?? 10,
              colorTag: h.colorTag || "#7C5CFC",
            },
          });

      const maxPos = await tx.routineHabit.aggregate({
        where: { routineId },
        _max: { position: true },
      });

      return tx.routineHabit.create({
        data: {
          routineId,
          habitId: habit.id,
          position: (maxPos._max.position ?? -1) + 1,
          required: h.required ?? true,
        },
      });
    });

    res.status(201).json({ routineHabitId: result.id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/routines/:id/habits/:routineHabitId
// Removes a habit from this routine (just the link - the habit itself,
// and its history, are untouched).
routinesRouter.delete("/:id/habits/:routineHabitId", async (req, res, next) => {
  try {
    const link = await prisma.routineHabit.findFirst({
      where: { id: req.params.routineHabitId, routineId: req.params.id },
    });
    if (!link) return res.status(404).json({ error: "Not found in this routine" });

    await prisma.routineHabit.delete({ where: { id: link.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

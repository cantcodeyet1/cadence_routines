import { Router } from "express";
import { prisma } from "../db.js";
import { dateKey, todayDateOnly, addDays } from "../lib/dates.js";

export const habitsRouter = Router();

// GET /api/habits  -- every habit, grouped by the routine(s) it belongs to,
// each with a 14-day completion sparkline for the "all habits" overview.
habitsRouter.get("/", async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      include: { routines: { include: { routine: true } } },
      orderBy: { createdAt: "asc" },
    });

    const since = addDays(todayDateOnly(), -13);
    const logs = await prisma.habitLog.findMany({
      where: { completedAt: { not: null }, skipped: false, session: { date: { gte: since } } },
      include: { session: true },
    });
    const doneDatesByHabit = new Map();
    for (const log of logs) {
      const key = log.habitId;
      if (!doneDatesByHabit.has(key)) doneDatesByHabit.set(key, new Set());
      doneDatesByHabit.get(key).add(dateKey(log.session.date));
    }

    const result = habits.map((habit) => {
      const doneDates = doneDatesByHabit.get(habit.id) ?? new Set();
      const sparkline = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(todayDateOnly(), -i);
        sparkline.push(doneDates.has(dateKey(d)) ? 1 : 0);
      }
      return {
        id: habit.id,
        name: habit.name,
        type: habit.type,
        colorTag: habit.colorTag,
        currentStreak: habit.currentStreak,
        bestStreak: habit.bestStreak,
        routines: habit.routines.map((rh) => ({ id: rh.routine.id, name: rh.routine.name })),
        sparkline,
      };
    });

    res.json({ habits: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/:id  -- streak stats, a heatmap of the last 84 days, and recent notes
habitsRouter.get("/:id", async (req, res, next) => {
  try {
    const habit = await prisma.habit.findUnique({
      where: { id: req.params.id },
      include: { routines: { include: { routine: true } } },
    });
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const since = addDays(todayDateOnly(), -83);
    const logs = await prisma.habitLog.findMany({
      where: { session: { date: { gte: since } } },
      include: { session: true },
      orderBy: { session: { date: "desc" } },
    });

    const doneDates = new Set(
      logs.filter((l) => l.completedAt && !l.skipped).map((l) => dateKey(l.session.date))
    );
    const heatmap = [];
    for (let i = 83; i >= 0; i--) {
      const d = addDays(todayDateOnly(), -i);
      heatmap.push({ date: dateKey(d), done: doneDates.has(dateKey(d)) });
    }

    const recentNotes = logs
      .filter((l) => l.note && l.note.trim())
      .slice(0, 10)
      .map((l) => ({ date: dateKey(l.session.date), note: l.note }));

    const totalScheduled = logs.length;
    const totalDone = logs.filter((l) => l.completedAt && !l.skipped).length;
    const completionRate = totalScheduled ? Math.round((totalDone / totalScheduled) * 100) : 0;

    res.json({
      id: habit.id,
      name: habit.name,
      type: habit.type,
      colorTag: habit.colorTag,
      currentStreak: habit.currentStreak,
      bestStreak: habit.bestStreak,
      completionRate,
      routines: habit.routines.map((rh) => ({ id: rh.routine.id, name: rh.routine.name })),
      heatmap,
      recentNotes,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habits/:id
// A habit can belong to more than one routine - deleting it removes it from
// all of them (RoutineHabit cascades) along with every logged completion of
// it (HabitLog cascades). The routines and sessions it was part of stay.
habitsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.habit.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/habits  -- create a standalone habit (not yet attached to a routine)
habitsRouter.post("/", async (req, res, next) => {
  try {
    const { name, type, targetSec, xpValue, colorTag } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name is required" });

    const habit = await prisma.habit.create({
      data: {
        name: name.trim(),
        type: type || "TICK",
        targetSec: targetSec ?? null,
        xpValue: xpValue ?? 10,
        colorTag: colorTag || "#7C5CFC",
      },
    });

    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/habits/:id  -- edit a habit's own properties (name, type,
// duration, color). Not routine-specific - "required" lives on RoutineHabit.
habitsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { name, type, targetSec, xpValue, colorTag } = req.body;
    if (name != null && !String(name).trim()) return res.status(400).json({ error: "name cannot be blank" });

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        ...(name != null && { name: name.trim() }),
        ...(type != null && { type }),
        ...(targetSec !== undefined && { targetSec }),
        ...(xpValue != null && { xpValue }),
        ...(colorTag != null && { colorTag }),
      },
    });

    res.json(habit);
  } catch (err) {
    next(err);
  }
});

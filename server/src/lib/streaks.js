import { toDateOnly, addDays, weekdayOf, isSameDate } from "./dates.js";
import { prisma } from "../db.js";

// Walks backward from `beforeDate` (exclusive) to find the most recent date
// whose weekday is in `scheduledWeekdays`. Used so a routine's streak only
// cares about the days it's actually scheduled to run on.
function previousScheduledDate(beforeDate, scheduledWeekdays) {
  if (scheduledWeekdays.size === 0) return null;
  let cursor = addDays(beforeDate, -1);
  for (let i = 0; i < 14; i++) {
    if (scheduledWeekdays.has(weekdayOf(cursor))) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

export function computeNextRoutineStreak({
  scheduledWeekdays,
  prevLastCompletedDate,
  prevCurrentStreak,
  prevBestStreak,
  completionDate,
}) {
  const date = toDateOnly(completionDate);

  if (prevLastCompletedDate && isSameDate(prevLastCompletedDate, date)) {
    // Already counted today - no change.
    return {
      currentStreak: prevCurrentStreak,
      bestStreak: prevBestStreak,
      lastCompletedDate: date,
    };
  }

  const expectedPrev = previousScheduledDate(date, scheduledWeekdays);
  const continues =
    prevLastCompletedDate && expectedPrev && isSameDate(prevLastCompletedDate, expectedPrev);

  const currentStreak = continues ? prevCurrentStreak + 1 : 1;
  const bestStreak = Math.max(prevBestStreak, currentStreak);

  return { currentStreak, bestStreak, lastCompletedDate: date };
}

// Rebuilds a routine's streak from scratch by replaying its completed
// session history through computeNextRoutineStreak, rather than trusting the
// incrementally-maintained counter. Used after a session is deleted, since a
// removed day can shorten or break a streak that only ever moved forward
// before.
export async function recomputeRoutineStreak(routineId) {
  const routine = await prisma.routine.findUniqueOrThrow({
    where: { id: routineId },
    include: { days: true, habits: true },
  });
  const scheduledWeekdays = new Set(routine.days.map((d) => d.weekday));
  const requiredHabitIds = routine.habits.filter((h) => h.required).map((h) => h.habitId);

  const sessions = await prisma.routineSession.findMany({
    where: { routineId, completedAt: { not: null } },
    orderBy: [{ date: "asc" }, { startedAt: "asc" }],
    include: { logs: true },
  });

  let state = { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  for (const session of sessions) {
    const doneHabitIds = new Set(
      session.logs.filter((l) => l.completedAt && !l.skipped).map((l) => l.habitId)
    );
    if (!requiredHabitIds.every((id) => doneHabitIds.has(id))) continue;
    state = computeNextRoutineStreak({
      scheduledWeekdays,
      prevLastCompletedDate: state.lastCompletedDate,
      prevCurrentStreak: state.currentStreak,
      prevBestStreak: state.bestStreak,
      completionDate: session.date,
    });
  }

  return prisma.routine.update({ where: { id: routineId }, data: state });
}

export function computeNextHabitStreak({
  prevLastCompletedDate,
  prevCurrentStreak,
  prevBestStreak,
  completionDate,
}) {
  const date = toDateOnly(completionDate);

  if (prevLastCompletedDate && isSameDate(prevLastCompletedDate, date)) {
    return {
      currentStreak: prevCurrentStreak,
      bestStreak: prevBestStreak,
      lastCompletedDate: date,
    };
  }

  const yesterday = addDays(date, -1);
  const continues = prevLastCompletedDate && isSameDate(prevLastCompletedDate, yesterday);

  const currentStreak = continues ? prevCurrentStreak + 1 : 1;
  const bestStreak = Math.max(prevBestStreak, currentStreak);

  return { currentStreak, bestStreak, lastCompletedDate: date };
}

// Same idea as recomputeRoutineStreak, but for a single habit's streak,
// replaying every completed (non-skipped) log across all of its sessions - a
// habit can belong to more than one routine, so its streak isn't scoped to
// just one of them.
export async function recomputeHabitStreak(habitId) {
  const logs = await prisma.habitLog.findMany({
    where: { habitId, completedAt: { not: null }, skipped: false },
    orderBy: { session: { date: "asc" } },
    include: { session: true },
  });

  let state = { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  for (const log of logs) {
    state = computeNextHabitStreak({
      prevLastCompletedDate: state.lastCompletedDate,
      prevCurrentStreak: state.currentStreak,
      prevBestStreak: state.bestStreak,
      completionDate: log.session.date,
    });
  }

  return prisma.habit.update({ where: { id: habitId }, data: state });
}

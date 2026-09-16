import { toDateOnly, addDays, weekdayOf, isSameDate } from "./dates.js";

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

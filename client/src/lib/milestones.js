// Streak milestone ladder, shared between the per-routine milestones page
// and the Profile badge case. Each tier should read as clearly bigger than
// the one before it - fire growing into something cosmic - so the ordering
// itself tells the story.
export const TIERS = [1, 2, 3, 5, 10, 15, 20, 30, 31, 40, 50, 60, 75, 100, 150, 200, 365];

export const NAMES = [
  "Spark", "Ember", "Flicker", "Flame", "Blaze", "Bonfire", "Inferno", "Wildfire",
  "Firestorm", "Supernova", "Comet", "Nova", "Eclipse", "Aurora", "Zenith", "Legend", "Immortal",
];

// The highest tier a streak of `bestStreak` has earned, as { tier, name, index } or null.
export function highestEarnedTier(bestStreak) {
  let result = null;
  for (let i = 0; i < TIERS.length; i++) {
    if (bestStreak >= TIERS[i]) result = { tier: TIERS[i], name: NAMES[i], index: i };
  }
  return result;
}

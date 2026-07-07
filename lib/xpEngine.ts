import { db } from "../db";
import { userStats, ranks } from "../db/schema";
import { eq, and, lte, gte } from "drizzle-orm";

/**
 * Helper to query user rank based on XP.
 * Falls back to local logic if DB is not populated.
 */
export async function getRankForXp(xp: number): Promise<string> {
  try {
    const rankRows = await db
      .select()
      .from(ranks)
      .where(and(lte(ranks.minXp, xp), gte(ranks.maxXp, xp)))
      .limit(1);
    if (rankRows.length > 0) {
      return rankRows[0].name;
    }
  } catch (err) {
    console.error("Failed to query rank from database:", err);
  }

  // Local fallback
  if (xp < 2500) return "Newbie";
  if (xp < 5000) return "Gym Rat";
  if (xp < 7500) return "Iron Discipline";
  if (xp < 10000) return "Absolute Unit";
  if (xp < 12500) return "Demigod";
  return "Greek God";
}

/**
 * Calculates level from total cumulative XP.
 * Level formula: level N requires N * 500 XP to reach (Level 2 = 1000 XP, Level 3 = 1500 XP, etc.)
 * For XP < 1000, level is 1.
 */
export function calculateLevel(totalXp: number): number {
  if (totalXp < 1000) {
    return 1;
  }
  return Math.floor(totalXp / 500);
}

/**
 * Calculates difference in calendar days between two dates.
 */
export function getDifferenceInDays(d1: Date, d2: Date): number {
  const start1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const start2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = start1.getTime() - start2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates session XP based on completed sets.
 * +10 XP per logged set, +50 XP bonus for each set where isPr = true.
 */
export async function calculateSessionXP(
  sets: { isPr?: boolean | null }[]
): Promise<number> {
  let totalXP = 0;
  for (const set of sets) {
    totalXP += 10;
    if (set.isPr) {
      totalXP += 50;
    }
  }
  return totalXP;
}

/**
 * Applies the session XP to userStats. Updates XP, level, and streak logic.
 * Handles creating the userStats row if it doesn't exist.
 */
export async function applyXP(
  userId: number,
  xpEarned: number
): Promise<{ leveledUp: boolean; newLevel: number }> {
  try {
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    const now = new Date();

    if (stats.length === 0) {
      // First session ever
      const newXp = xpEarned;
      const newLevel = calculateLevel(newXp);
      const newRank = await getRankForXp(newXp);
      
      await db.insert(userStats).values({
        userId,
        totalXp: newXp,
        currentLevel: newLevel,
        currentRank: newRank,
        currentStreak: 1,
        longestStreak: 1,
        lastWorkoutAt: now,
      });

      return {
        leveledUp: newLevel > 1,
        newLevel,
      };
    }

    const existing = stats[0];
    const oldLevel = existing.currentLevel;
    const newXp = existing.totalXp + xpEarned;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > oldLevel;

    // Streak Logic
    let newStreak = existing.currentStreak;
    if (!existing.lastWorkoutAt) {
      newStreak = 1;
    } else {
      const lastWorkout = new Date(existing.lastWorkoutAt);
      const diffDays = getDifferenceInDays(now, lastWorkout);
      if (diffDays === 1) {
        newStreak = existing.currentStreak + 1;
      } else if (diffDays >= 2) {
        newStreak = 1;
      }
      // If last workout was today (diffDays === 0) -> keep current streak
    }

    const newLongestStreak = Math.max(existing.longestStreak, newStreak);

    const newRank = await getRankForXp(newXp);

    await db
      .update(userStats)
      .set({
        totalXp: newXp,
        currentLevel: newLevel,
        currentRank: newRank,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastWorkoutAt: now,
      })
      .where(eq(userStats.id, existing.id));

    return {
      leveledUp,
      newLevel,
    };
  } catch (error) {
    console.error("Error in applyXP:", error);
    return {
      leveledUp: false,
      newLevel: 1,
    };
  }
}

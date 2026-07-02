import { db } from "../db";
import { userStats } from "../db/schema";
import { eq } from "drizzle-orm";

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
      
      await db.insert(userStats).values({
        userId,
        totalXp: newXp,
        currentLevel: newLevel,
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

    await db
      .update(userStats)
      .set({
        totalXp: newXp,
        currentLevel: newLevel,
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

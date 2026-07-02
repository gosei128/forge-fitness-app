import { db } from "../db";
import { workoutSessions, sets } from "../db/schema";
import { eq } from "drizzle-orm";
import { checkAndUpdatePR } from "./prDetection";
import { calculateSessionXP, applyXP } from "./xpEngine";

/**
 * Handles completing a workout session:
 * 1. Checks and updates PRs for each completed set in the session (accounting for weight units).
 * 2. Calculates the total XP earned from sets and PRs.
 * 3. Applies the XP to userStats and handles level/streak updates.
 * 4. Saves the total XP and completedAt timestamp to the session row.
 * 5. Returns details for UI reaction.
 */
export async function completeWorkoutSession(
  sessionId: number,
  userId: number
): Promise<{
  totalXP: number;
  isPRs: boolean[];
  leveledUp: boolean;
  newLevel: number;
}> {
  try {
    // 1. Fetch all sets for the session from the database
    const sessionSets = await db
      .select()
      .from(sets)
      .where(eq(sets.sessionId, sessionId));

    // 2. Run checkAndUpdatePR for every set in the session
    const isPRs: boolean[] = [];
    for (const set of sessionSets) {
      const prResult = await checkAndUpdatePR(
        userId,
        set.exerciseId,
        set.id,
        set.weight,
        set.reps,
        set.weightUnit
      );
      isPRs.push(prResult.isPR);
    }

    // 3. Run calculateSessionXP on all sets (with updated PR flags)
    const setsWithPRInfo = sessionSets.map((set, index) => ({
      ...set,
      isPr: isPRs[index],
    }));
    const totalXP = await calculateSessionXP(setsWithPRInfo);

    // 4. Run applyXP to update userStats
    const xpResult = await applyXP(userId, totalXP);

    // 5. Write totalXpEarned and completedAt timestamp to the workoutSessions row
    await db
      .update(workoutSessions)
      .set({
        totalXpEarned: totalXP,
        completedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));

    return {
      totalXP,
      isPRs,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
    };
  } catch (error) {
    console.error("Error in completeWorkoutSession:", error);
    throw error;
  }
}

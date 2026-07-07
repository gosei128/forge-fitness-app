import { db } from "../db";
import { workoutSessions, sets, exercises, userStats } from "../db/schema";
import { eq } from "drizzle-orm";
import { checkAndUpdatePR } from "./prDetection";
import { calculateSessionXP, applyXP } from "./xpEngine";
import { checkMissionProgress, MissionEvent, Mission } from "./missionEngine";

/**
 * Handles completing a workout session:
 * 1. Checks and updates PRs for each completed set in the session (accounting for weight units).
 * 2. Calculates the total XP earned from sets and PRs.
 * 3. Applies the XP to userStats and handles level/streak updates.
 * 4. Checks and updates mission progress, applying rewards for completed missions.
 * 5. Saves the total XP and completedAt timestamp to the session row.
 * 6. Returns details for UI reaction.
 */
export async function completeWorkoutSession(
  sessionId: number,
  userId: number
): Promise<{
  totalXP: number;
  isPRs: boolean[];
  leveledUp: boolean;
  newLevel: number;
  completedMissions: Mission[];
}> {
  try {
    // 0. Fetch initial user stats to track level ups across all XP changes
    const initialStats = await db
      .select({ currentLevel: userStats.currentLevel })
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
    const initialLevel = initialStats[0]?.currentLevel ?? 1;

    // 1. Fetch all sets for the session joined with exercises to get muscle group info
    const sessionSets = await db
      .select({
        id: sets.id,
        sessionId: sets.sessionId,
        exerciseId: sets.exerciseId,
        weight: sets.weight,
        reps: sets.reps,
        setNumber: sets.setNumber,
        isPr: sets.isPr,
        weightUnit: sets.weightUnit,
        createdAt: sets.createdAt,
        muscleGroup: exercises.muscleGroup,
      })
      .from(sets)
      .leftJoin(exercises, eq(exercises.id, sets.exerciseId))
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

    // 4. Run applyXP to update userStats with session XP
    await applyXP(userId, totalXP);

    // 5. Gather unique muscle groups trained in this session
    const uniqueMuscleGroups = new Set<string>();
    for (const set of sessionSets) {
      if (set.muscleGroup) {
        uniqueMuscleGroups.add(set.muscleGroup);
      }
    }

    // 6. Build mission events and check progress
    const missionEvents: MissionEvent[] = [
      { type: "session_complete" }
    ];
    if (isPRs.some((isPr) => isPr)) {
      missionEvents.push({ type: "pr_hit" });
    }
    uniqueMuscleGroups.forEach((mg) => {
      missionEvents.push({ type: "set_logged", muscleGroup: mg });
    });

    const { completedMissions } = await checkMissionProgress(userId, missionEvents);

    // 7. Write totalXpEarned and completedAt timestamp to the workoutSessions row
    await db
      .update(workoutSessions)
      .set({
        totalXpEarned: totalXP,
        completedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));

    // 8. Fetch final stats to determine consolidated level and leveledUp flag
    const finalStats = await db
      .select({ currentLevel: userStats.currentLevel })
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
    const finalLevel = finalStats[0]?.currentLevel ?? 1;
    const leveledUp = finalLevel > initialLevel;

    return {
      totalXP,
      isPRs,
      leveledUp,
      newLevel: finalLevel,
      completedMissions,
    };
  } catch (error) {
    console.error("Error in completeWorkoutSession:", error);
    throw error;
  }
}

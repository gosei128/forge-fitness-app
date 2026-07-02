import { db } from "../db";
import { personalRecords, sets } from "../db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Standardizes weight to lbs for correct personal record comparisons.
 */
function convertToLbs(weight: number, unit: string): number {
  if (unit === "kg") {
    return weight * 2.20462;
  }
  // Bodyweight is handled at face value
  return weight;
}

/**
 * Checks if the completed set is a personal record for the exercise.
 * Converts weights to a common base (lbs) if units differ before comparison.
 */
export async function checkAndUpdatePR(
  userId: number,
  exerciseId: number,
  setId: number,
  weight: number,
  reps: number,
  weightUnit: string = "lbs"
): Promise<{ isPR: boolean }> {
  try {
    const currentRecords = await db
      .select()
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.exerciseId, exerciseId)
        )
      )
      .limit(1);

    const existingPR = currentRecords[0];

    const existingWeightLbs = existingPR 
      ? convertToLbs(existingPR.weight, existingPR.weightUnit || "lbs")
      : 0;
    const newWeightLbs = convertToLbs(weight, weightUnit);

    if (!existingPR || newWeightLbs > existingWeightLbs) {
      if (!existingPR) {
        await db.insert(personalRecords).values({
          userId,
          exerciseId,
          setId,
          weight,
          reps,
          weightUnit,
          achievedAt: new Date(),
        });
      } else {
        await db
          .update(personalRecords)
          .set({
            setId,
            weight,
            reps,
            weightUnit,
            achievedAt: new Date(),
          })
          .where(eq(personalRecords.id, existingPR.id));
      }

      // Mark the set as a PR
      await db
        .update(sets)
        .set({ isPr: true })
        .where(eq(sets.id, setId));

      return { isPR: true };
    }

    return { isPR: false };
  } catch (error) {
    console.error("Error in checkAndUpdatePR:", error);
    return { isPR: false };
  }
}

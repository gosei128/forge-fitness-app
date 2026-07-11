import { db } from "../db";
import { userStats } from "../db/schema";
import { eq } from "drizzle-orm";
import archetypesData from '../assets/data/archetypes.json';

export type Archetype = typeof archetypesData[0];

export const getAllArchetypes = () => archetypesData;

export const getArchetype = (id: string) =>
  archetypesData.find(a => a.id === id) ?? null;

export async function selectArchetype(userId: number, archetypeId: string | null) {
  try {
    const existingStats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (existingStats.length === 0) {
      await db.insert(userStats).values({
        userId,
        totalXp: 0,
        currentLevel: 1,
        currentRank: "Newbie",
        currentStreak: 0,
        longestStreak: 0,
        selectedArchetypeId: archetypeId,
        currentPhase: archetypeId ? 1 : null,
      });
    } else {
      await db
        .update(userStats)
        .set({
          selectedArchetypeId: archetypeId,
          currentPhase: archetypeId ? 1 : null,
        })
        .where(eq(userStats.userId, userId));
    }
  } catch (error) {
    console.error("Error selecting archetype:", error);
    throw error;
  }
}
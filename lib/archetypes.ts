import { db } from "../db";
import { userStats, workoutTemplates, templateExercises, exercises } from "../db/schema";
import { eq, inArray, desc } from "drizzle-orm";
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

    if (archetypeId) {
      const archetype = getArchetype(archetypeId);
      if (archetype) {
        // 1. Delete any existing templates for this user that were generated from archetypes
        const archetypeNames = ["Nightwing -", "Toji Fushiguro -", "Batman -"];
        const userTemplates = await db
          .select({ id: workoutTemplates.id, name: workoutTemplates.name })
          .from(workoutTemplates)
          .where(eq(workoutTemplates.userId, userId));

        const templatesToDelete = userTemplates
          .filter(t => archetypeNames.some(prefix => t.name.startsWith(prefix)))
          .map(t => t.id);

        if (templatesToDelete.length > 0) {
          await db
            .delete(templateExercises)
            .where(inArray(templateExercises.templateId, templatesToDelete));
          await db
            .delete(workoutTemplates)
            .where(inArray(workoutTemplates.id, templatesToDelete));
        }

        // 2. Map exercise names (resolve missing names to their db equivalents)
        const mappedName = (name: string) => {
          const lower = name.toLowerCase().trim();
          if (lower === "barbell squat") return "barbell full squat";
          if (lower === "hanging knee raise") return "hanging leg raise";
          return lower;
        };

        const uniqueNames = Array.from(
          new Set(
            archetype.phases.flatMap(p =>
              p.workouts.flatMap(w =>
                w.exercises.map(ex => mappedName(ex.name))
              )
            )
          )
        );

        // Fetch matched exercises from DB
        const dbExercises = await db
          .select({ id: exercises.id, name: exercises.name })
          .from(exercises)
          .where(inArray(exercises.name, uniqueNames));

        const exerciseMap = new Map<string, number>();
        dbExercises.forEach(ex => {
          exerciseMap.set(ex.name.toLowerCase().trim(), ex.id);
        });

        // Helper to clean reps string to numeric string for input fields
        const cleanReps = (repsStr: string): string => {
          const clean = repsStr.toLowerCase().trim();
          if (clean === "max") return "10";
          const match = clean.match(/^\d+/);
          if (match) return match[0];
          return "10";
        };

        // 3. Create new templates for each workout of the chosen archetype across all phases
        for (const phase of archetype.phases) {
          for (const workout of phase.workouts) {
            // Put phase # in indications as requested: e.g. "Nightwing - Phase 1 - Day 1: Push + Core"
            const templateName = `${archetype.character} - Phase ${phase.phase} - Day ${workout.day}: ${workout.name}`;

            let templateIdVal: number;
            try {
              const inserted = await db
                .insert(workoutTemplates)
                .values({
                  userId,
                  name: templateName,
                  restTime: 60,
                  weightUnit: "lbs",
                })
                .returning({ id: workoutTemplates.id });
              templateIdVal = inserted[0].id;
            } catch (err) {
              await db.insert(workoutTemplates).values({
                userId,
                name: templateName,
                restTime: 60,
                weightUnit: "lbs",
              });
              const temps = await db
                .select()
                .from(workoutTemplates)
                .where(eq(workoutTemplates.userId, userId))
                .orderBy(desc(workoutTemplates.createdAt))
                .limit(1);
              templateIdVal = temps[0].id;
            }

            // Insert template exercises
            for (let i = 0; i < workout.exercises.length; i++) {
              const ex = workout.exercises[i];
              const resolvedName = mappedName(ex.name);
              const exerciseId = exerciseMap.get(resolvedName);
              if (exerciseId !== undefined) {
                // Construct defaultSets array in JSON format
                const setsArray = Array.from({ length: ex.sets || 3 }, (_, idx) => ({
                  id: Date.now() + Math.random() + idx,
                  weight: "",
                  reps: cleanReps(ex.reps),
                }));

                await db.insert(templateExercises).values({
                  templateId: templateIdVal,
                  exerciseId,
                  orderNumber: i + 1,
                  weightUnit: "lbs",
                  restTime: ex.rest || 60,
                  defaultSets: JSON.stringify(setsArray),
                });
              } else {
                console.warn(`Could not resolve exercise name: ${ex.name}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error selecting archetype:", error);
    throw error;
  }
}
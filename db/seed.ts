import { db } from "./index";
import { exercises } from "./schema";

const exerciseData = [
    // Chest
    { name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", category: "Compound" },
    { name: "Incline Bench Press", muscleGroup: "Chest", equipment: "Barbell", category: "Compound" },
    { name: "Dumbbell Flyes", muscleGroup: "Chest", equipment: "Dumbbell", category: "Isolation" },
    { name: "Push Up", muscleGroup: "Chest", equipment: "Bodyweight", category: "Compound" },
    { name: "Cable Crossover", muscleGroup: "Chest", equipment: "Machine", category: "Isolation" },

    // Back
    { name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", category: "Compound" },
    { name: "Pull Up", muscleGroup: "Back", equipment: "Bodyweight", category: "Compound" },
    { name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", category: "Compound" },
    { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Machine", category: "Compound" },
    { name: "Seated Cable Row", muscleGroup: "Back", equipment: "Machine", category: "Compound" },

    // Legs
    { name: "Squat", muscleGroup: "Legs", equipment: "Barbell", category: "Compound" },
    { name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell", category: "Compound" },
    { name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", category: "Compound" },
    { name: "Leg Curl", muscleGroup: "Legs", equipment: "Machine", category: "Isolation" },
    { name: "Leg Extension", muscleGroup: "Legs", equipment: "Machine", category: "Isolation" },
    { name: "Calf Raise", muscleGroup: "Legs", equipment: "Machine", category: "Isolation" },
    { name: "Lunges", muscleGroup: "Legs", equipment: "Dumbbell", category: "Compound" },

    // Shoulders
    { name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", category: "Compound" },
    { name: "Dumbbell Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", category: "Isolation" },
    { name: "Face Pull", muscleGroup: "Shoulders", equipment: "Machine", category: "Isolation" },
    { name: "Arnold Press", muscleGroup: "Shoulders", equipment: "Dumbbell", category: "Compound" },

    // Arms
    { name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell", category: "Isolation" },
    { name: "Dumbbell Curl", muscleGroup: "Arms", equipment: "Dumbbell", category: "Isolation" },
    { name: "Tricep Pushdown", muscleGroup: "Arms", equipment: "Machine", category: "Isolation" },
    { name: "Skull Crusher", muscleGroup: "Arms", equipment: "Barbell", category: "Isolation" },
    { name: "Hammer Curl", muscleGroup: "Arms", equipment: "Dumbbell", category: "Isolation" },

    // Core
    { name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", category: "Compound" },
    { name: "Crunch", muscleGroup: "Core", equipment: "Bodyweight", category: "Isolation" },
    { name: "Hanging Leg Raise", muscleGroup: "Core", equipment: "Bodyweight", category: "Isolation" },
    { name: "Ab Wheel Rollout", muscleGroup: "Core", equipment: "Bodyweight", category: "Compound" },
];

export async function seedExercises() {
    // Check if already seeded — don't double insert
    const existing = await db.select().from(exercises);
    if (existing.length > 0) {
        console.log("Exercises already seeded, skipping.");
        return;
    }

    await db.insert(exercises).values(exerciseData);
    console.log(`Seeded ${exerciseData.length} exercises.`);
}
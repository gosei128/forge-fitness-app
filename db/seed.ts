import { db } from "./index";
import { exercises, ranks } from "./schema";
import exercisesData from ".././assets/data/exercises.json";

export const seedExercises = async () => {
  const existing = await db.select().from(exercises);

  if (existing.length > 0) {
    console.log("Exercise already exist, skipping");
    return;
  }
  const mapped = (exercisesData as any[]).map((e: any) => ({
    name: e.name,
    muscleGroup: e.body_part,
    equipment: e.equipment,
    category: e.category,
    instructions: e.instructions?.en ?? null,
  }));
  const chunkSize = 100;
  for (let i = 0; i < mapped.length; i += chunkSize) {
    await db.insert(exercises).values(mapped.slice(i, i + chunkSize));
  }

  console.log(`Seeded ${mapped.length} exercises.`);
};

export const seedRanks = async () => {
  const existing = await db.select().from(ranks);
  if (existing.length > 0) {
    console.log("Ranks already exist, skipping");
    return;
  }

  const rankData = [
    { name: "Newbie", minXp: 0, maxXp: 2499, level: 1 },
    { name: "Gym Rat", minXp: 2500, maxXp: 4999, level: 5 },
    { name: "Iron Discipline", minXp: 5000, maxXp: 7499, level: 10 },
    { name: "Absolute Unit", minXp: 7500, maxXp: 9999, level: 15 },
    { name: "Demigod", minXp: 10000, maxXp: 12499, level: 20 },
    { name: "Greek God", minXp: 12500, maxXp: 99999999, level: 25 },
  ];

  await db.insert(ranks).values(rankData);
  console.log("Seeded ranks successfully.");
};
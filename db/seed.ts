import { db } from "./index";
import { exercises } from "./schema";
import exercisesData from ".././assets/data/exercises.json";

export const seedExercises = async () => {
 const existing  = await db.select().from(exercises);

    if(existing.length > 0 ){
        console.log("Exercise already exist, skipping")
        return;
    }
    const mapped =  (exercisesData as any[]).map((e:any)=> ({
        name : e.name,
        muscleGroup : e.body_part,
        equipment : e.equipment,
        category : e.category,
        instructions : e.instructions?.en ?? null
    }))
    const chunkSize = 100
    for (let i = 0; i < mapped.length; i += chunkSize) {
        await db.insert(exercises).values(mapped.slice(i, i + chunkSize));
    }

    console.log(`Seeded ${mapped.length} exercises.`);
}
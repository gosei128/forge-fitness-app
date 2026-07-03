import {text, int, sqliteTable, uniqueIndex} from 'drizzle-orm/sqlite-core'
import {relations} from "drizzle-orm"
export const exercises = sqliteTable("exercises", {
    id : int("id").primaryKey({autoIncrement : true}),
    name : text("name").notNull(),
    muscleGroup: text("muscle_group").notNull(),
    equipment: text("equipment"),
    category : text("category"),
    instructions : text("instructions"),
    createdAt: int("create_at", {mode :"timestamp"}).$defaultFn(() => new Date())
})

export const user = sqliteTable("user", {
    id : int("id").primaryKey({autoIncrement : true}),
    firstName : text("first_name").notNull(),
    lastName : text("last_name").notNull(),
    remoteId : text("remote_id").notNull(),
    email: text("email").notNull(),
    lastSyncedAt : int("last_synced_at", {mode : "timestamp"}),
    createdAt: int("created_at", {mode : "timestamp"}).$defaultFn(() => new Date())
}, (table)=> [uniqueIndex("user_email_idx").on(table.email)])

export const workoutSessions = sqliteTable("workout_sessions", {
    id: int("id").primaryKey({autoIncrement :true}),
    name : text("name"),
    userId : int("user_id").notNull().references(() => user.id),
    startedAt : int("started_at", {mode: "timestamp"}).$defaultFn(()=> new Date()),
    completedAt : int("completed_at", {mode: "timestamp"}),
    totalXpEarned : int("total_xp_earned").notNull().default(0),
    restTime : int("rest_time").notNull().default(60)
})

export const sets = sqliteTable("sets", {
    id : int("id").primaryKey({autoIncrement : true}),
    sessionId : int("session_id").notNull().references(()=> workoutSessions.id),
    exerciseId : int("exercise_id").notNull().references(()=> exercises.id),
    weight: int("weight").notNull(),
    reps : int("reps").notNull(),
    setNumber : int("set_number").notNull(),
    isPr : int("is_pr", {mode : "boolean"}).default(false),
    weightUnit : text("weight_unit").notNull().default("lbs"),
    createdAt : int("created_at", {mode : "timestamp"}).$defaultFn(()=> new Date())
})

export const personalRecords = sqliteTable("personal_records", {
    id :int("id").primaryKey({autoIncrement:true}),
    userId : int("user_id").notNull().references(()=> user.id),
    exerciseId : int("exercise_id").notNull().references(()=> exercises.id),
    setId : int("set_id").notNull().references(()=> sets.id),
    weight : int("weight").notNull(),
    reps : int("reps").notNull(),
    weightUnit : text("weight_unit").notNull().default("lbs"),
    achievedAt : int("achieved_at", {mode : "timestamp"}).$defaultFn(()=> new Date())

}, (table)=>[uniqueIndex("user_exercise_pr_idx").on(table.userId, table.exerciseId)])

export const userStats = sqliteTable("user_stats", {
    id: int("id").primaryKey({autoIncrement : true}),
    userId : int("user_id").notNull().references(()=> user.id),
    totalXp :int("total_xp").notNull().default(0),
    currentLevel : int("current_level").notNull().default(1),
    currentStreak : int("current_streak").notNull().default(0),
    longestStreak : int("longest_streak").notNull().default(0),
    lastWorkoutAt : int("last_workout_at", {mode : "timestamp"}),
})

export const workoutTemplates = sqliteTable("workout_templates", {
    id: int("id").primaryKey({autoIncrement : true}),
    userId: int("user_id").notNull().references(() => user.id),
    name: text("name").notNull(),
    restTime: int("rest_time").notNull().default(60),
    weightUnit: text("weight_unit").notNull().default("lbs"),
    createdAt: int("created_at", {mode: "timestamp"}).$defaultFn(() => new Date())
})
export const templateExercises = sqliteTable("template_exercises", {
    id: int("id").primaryKey({autoIncrement : true}),
    templateId: int("template_id").notNull().references(() => workoutTemplates.id),
    exerciseId: int("exercise_id").notNull().references(() => exercises.id),
    orderNumber: int("order_number").notNull(),
    weightUnit: text("weight_unit").notNull().default("lbs")
})


// Relations

export const userRelations =
    relations(user, ({many})=> ({
    sessions : many(workoutSessions)
}))

export const workoutSessionsRelations =
    relations(workoutSessions, ({one, many})=> ({
    user: one(user, {
        fields : [workoutSessions.userId],
        references : [user.id]
    }),
    sets : many(sets)
}))

export const setRelations =
    relations(sets, ({one})=> ({
    sessions : one(workoutSessions, {
        fields : [sets.sessionId],
        references : [workoutSessions.id]
    }),
    exercises : one(exercises, {
        fields: [sets.exerciseId],
        references : [exercises.id]
    })
}))

export const exercisesRelations =
    relations(exercises, ({many})=> ({
    sets :many(sets)
}))

export const personalRecordsRelations = relations(personalRecords, ({one}) => ({
    user: one(user, {
        fields: [personalRecords.userId],
        references: [user.id]
    }),
    exercise: one(exercises, {
        fields: [personalRecords.exerciseId],
        references: [exercises.id]
    }),
    set: one(sets, {
        fields: [personalRecords.setId],
        references: [sets.id]
    })
}));
export const userStatRelation = relations(userStats, ({one}) => ({
    user: one(user, {
        fields: [userStats.userId],
        references: [user.id]
    })
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({one, many}) => ({
    user: one(user, {
        fields: [workoutTemplates.userId],
        references: [user.id]
    }),
    exercises: many(templateExercises)
}));

export const templateExercisesRelations = relations(templateExercises, ({one}) => ({
    template: one(workoutTemplates, {
        fields: [templateExercises.templateId],
        references: [workoutTemplates.id]
    }),
    exercise: one(exercises, {
        fields: [templateExercises.exerciseId],
        references: [exercises.id]
    })
}));
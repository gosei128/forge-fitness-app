import { useQuery } from "@tanstack/react-query";
import { db } from "../../db";
import {
  user,
  userStats,
  exercises,
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sets,
  personalRecords,
} from "../../db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getMissions, generateMissions, Mission } from "../missionEngine";
import { getCoachLine } from "../coachEngine";

// ─── User Stats & Home Query ──────────────────────────────────────────────────
export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) {
        return {
          user: null,
          stats: {
            currentLevel: 1,
            totalXp: 0,
            currentStreak: 0,
            longestStreak: 0,
            currentRank: "Newbie",
          },
          missions: [] as Mission[],
          coachLine: "Motivation gets you started, but discipline keeps you going. 💪",
        };
      }

      const currentUser = users[0];
      const userId = currentUser.id;

      const statRows = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

      const activeMissions = await getMissions(userId);
      const coachData = await getCoachLine(userId);

      const stats =
        statRows.length > 0
          ? statRows[0]
          : {
              currentLevel: 1,
              totalXp: 0,
              currentStreak: 0,
              longestStreak: 0,
              currentRank: "Newbie",
            };

      return {
        user: currentUser,
        stats,
        missions: activeMissions,
        coachLine: coachData.line,
      };
    },
  });
}

// ─── Exercises List Query ────────────────────────────────────────────────────
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const data = await db.select().from(exercises);
      return data;
    },
  });
}

// ─── Custom Templates Query ──────────────────────────────────────────────────
export function useWorkoutTemplates() {
  return useQuery({
    queryKey: ["workoutTemplates"],
    queryFn: async () => {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) return [];
      const userIdVal = users[0].id;

      const temps = await db
        .select()
        .from(workoutTemplates)
        .where(eq(workoutTemplates.userId, userIdVal));

      const templatesList = [];
      for (const temp of temps) {
        const tempExs = await db
          .select({
            name: exercises.name,
            weightUnit: templateExercises.weightUnit,
          })
          .from(templateExercises)
          .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
          .where(eq(templateExercises.templateId, temp.id))
          .orderBy(templateExercises.orderNumber);

        templatesList.push({
          id: `custom_${temp.id}`,
          dbId: temp.id,
          name: temp.name,
          exercises: tempExs.map((e) => e.name),
          exerciseUnits: tempExs.map((e) => e.weightUnit),
          restTime: temp.restTime,
          description: `Custom Template · ${temp.restTime}s rest`,
          isCustom: true,
        });
      }
      return templatesList;
    },
  });
}

// ─── Workout History Query ───────────────────────────────────────────────────
export function useWorkoutHistory() {
  return useQuery({
    queryKey: ["workoutHistory"],
    queryFn: async () => {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) return [];
      const userIdVal = users[0].id;

      const historySessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userIdVal))
        .orderBy(desc(workoutSessions.completedAt));

      const sessionsWithSets = [];
      for (const sess of historySessions) {
        if (!sess.completedAt) continue;

        const sessionSets = await db
          .select({
            id: sets.id,
            weight: sets.weight,
            reps: sets.reps,
            setNumber: sets.setNumber,
            weightUnit: sets.weightUnit,
            exerciseName: exercises.name,
          })
          .from(sets)
          .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
          .where(eq(sets.sessionId, sess.id))
          .orderBy(sets.setNumber);

        const groupedExercises: { [key: string]: typeof sessionSets } = {};
        for (const setRow of sessionSets) {
          if (!groupedExercises[setRow.exerciseName]) {
            groupedExercises[setRow.exerciseName] = [];
          }
          groupedExercises[setRow.exerciseName].push(setRow);
        }

        sessionsWithSets.push({
          ...sess,
          exercises: Object.entries(groupedExercises).map(
            ([name, setsList]) => ({
              name,
              sets: setsList,
            }),
          ),
        });
      }
      return sessionsWithSets;
    },
  });
}

// ─── Missions Query ──────────────────────────────────────────────────────────
export function useMissions() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) {
        return { missions: [] as Mission[], stats: null };
      }
      const userId = users[0].id;

      await generateMissions(userId);
      const activeMissions = await getMissions(userId);

      const statRows = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

      return {
        missions: activeMissions,
        stats: statRows.length > 0 ? statRows[0] : null,
      };
    },
  });
}

// ─── Profile Data Query ──────────────────────────────────────────────────────
export function useProfileData() {
  return useQuery({
    queryKey: ["profileData"],
    queryFn: async () => {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) {
        return {
          userName: "Forge Athlete",
          stats: null,
          sessionsCount: 0,
          prList: [],
        };
      }

      const currentUser = users[0];
      const userId = currentUser.id;

      const statsRes = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

      const sessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId));
      const completedCount = sessions.filter((s) => s.completedAt).length;

      const prs = await db
        .select({
          prId: personalRecords.id,
          weight: personalRecords.weight,
          reps: personalRecords.reps,
          achievedAt: personalRecords.achievedAt,
          exerciseName: exercises.name,
        })
        .from(personalRecords)
        .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
        .where(eq(personalRecords.userId, userId))
        .orderBy(desc(personalRecords.achievedAt))
        .limit(3);

      return {
        userName: currentUser.firstName,
        stats: statsRes.length > 0 ? statsRes[0] : null,
        sessionsCount: completedCount,
        prList: prs,
      };
    },
  });
}

// ─── Exercise Detail Analytics Query ─────────────────────────────────────────
const calculateE1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export function useExerciseDetail(id: number | null) {
  return useQuery({
    queryKey: ["exerciseDetail", id],
    enabled: id !== null && !isNaN(id),
    queryFn: async () => {
      if (!id) return null;

      const exRes = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, Number(id)))
        .limit(1);

      if (exRes.length === 0) return null;

      const exercise = exRes[0];

      const rawSets = await db
        .select({
          id: sets.id,
          sessionId: sets.sessionId,
          sessionName: workoutSessions.name,
          startedAt: workoutSessions.startedAt,
          weight: sets.weight,
          reps: sets.reps,
          setNumber: sets.setNumber,
          isPr: sets.isPr,
          weightUnit: sets.weightUnit,
          setType: sets.setType,
        })
        .from(sets)
        .innerJoin(workoutSessions, eq(sets.sessionId, workoutSessions.id))
        .where(eq(sets.exerciseId, Number(id)))
        .orderBy(desc(workoutSessions.startedAt), sets.setNumber);

      const sessionMap = new Map<
        number,
        {
          sessionId: number;
          sessionName: string;
          dateStr: string;
          maxWeight: number;
          maxE1RM: number;
          sets: typeof rawSets;
        }
      >();

      for (const s of rawSets) {
        const sid = s.sessionId;
        const e1rm = calculateE1RM(s.weight, s.reps);
        const dateStr = s.startedAt
          ? new Date(s.startedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Unknown Date";

        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, {
            sessionId: sid,
            sessionName: s.sessionName || "Workout Session",
            dateStr,
            maxWeight: s.setType !== "warmup" ? s.weight : 0,
            maxE1RM: s.setType !== "warmup" ? e1rm : 0,
            sets: [s],
          });
        } else {
          const existing = sessionMap.get(sid)!;
          existing.sets.push(s);
          if (s.setType !== "warmup") {
            if (s.weight > existing.maxWeight) existing.maxWeight = s.weight;
            if (e1rm > existing.maxE1RM) existing.maxE1RM = e1rm;
          }
        }
      }

      return {
        exercise,
        historySets: rawSets,
        groupedSessions: Array.from(sessionMap.values()),
      };
    },
  });
}

import { db } from "../db";
import { missions, sets, exercises } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { applyXP } from "./xpEngine";

// ---------- Types ----------

export type MissionType = "sessions_this_week" | "hit_a_pr" | "muscle_group";

export type MissionEvent =
  | { type: "session_complete" }
  | { type: "pr_hit" }
  | { type: "set_logged"; muscleGroup: string };

export interface Mission {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  muscleGroup: string | null;
  status: string;
  xpReward: number;
  expiresAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
}

// ---------- Constants ----------

const MUSCLE_GROUPS = [
  "back",
  "chest",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "cardio",
];

/**
 * Returns the start of next Monday at midnight (local time).
 */
function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilMonday,
    0,
    0,
    0,
    0,
  );
  return nextMonday;
}

/**
 * Returns the most recent Monday at midnight (local time).
 * If today is Monday, returns today at midnight.
 */
function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diff,
    0,
    0,
    0,
    0,
  );
  return monday;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Mission Templates ----------

interface MissionTemplate {
  type: MissionType;
  generate: () => {
    title: string;
    description: string;
    targetValue: number;
    muscleGroup: string | null;
    xpReward: number;
  };
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    type: "sessions_this_week",
    generate: () => {
      const target = pickRandom([2, 3, 4, 5]);
      return {
        title: `Log ${target} Sessions`,
        description: `Complete ${target} workout sessions this week.`,
        targetValue: target,
        muscleGroup: null,
        xpReward: target * 50,
      };
    },
  },
  {
    type: "hit_a_pr",
    generate: () => ({
      title: "Break a Record",
      description: "Hit a new personal record on any exercise.",
      targetValue: 1,
      muscleGroup: null,
      xpReward: 150,
    }),
  },
  {
    type: "muscle_group",
    generate: () => {
      const group = pickRandom(MUSCLE_GROUPS);
      return {
        title: `Train ${group.charAt(0).toUpperCase() + group.slice(1)}`,
        description: `Complete 2 workouts that include ${group} exercises.`,
        targetValue: 2,
        muscleGroup: group,
        xpReward: 100,
      };
    },
  },
];

// ---------- Public API ----------

/**
 * Generates weekly missions for a user.
 * Idempotent — skips if active missions already exist for the current week.
 */
export async function generateMissions(userId: number): Promise<void> {
  try {
    const thisMonday = getThisMonday();
    const nextMonday = getNextMonday();

    // Check if missions for this week already exist
    const existing = await db
      .select()
      .from(missions)
      .where(
        and(eq(missions.userId, userId), eq(missions.status, "active")),
      );

    // Expire any old missions whose expiresAt has passed
    const now = new Date();
    for (const mission of existing) {
      if (mission.expiresAt && mission.expiresAt < now) {
        await db
          .update(missions)
          .set({ status: "expired" })
          .where(eq(missions.id, mission.id));
      }
    }

    // If we still have active missions created this week, skip generation
    const activeMissionsThisWeek = existing.filter(
      (m) =>
        m.createdAt &&
        m.createdAt >= thisMonday &&
        (!m.expiresAt || m.expiresAt >= now),
    );

    if (activeMissionsThisWeek.length >= 3) {
      console.log("Missions already exist for this week, skipping generation.");
      return;
    }

    // Generate one mission per type
    for (const template of MISSION_TEMPLATES) {
      const generated = template.generate();
      await db.insert(missions).values({
        userId,
        type: template.type,
        title: generated.title,
        description: generated.description,
        targetValue: generated.targetValue,
        currentValue: 0,
        muscleGroup: generated.muscleGroup,
        status: "active",
        xpReward: generated.xpReward,
        expiresAt: nextMonday,
      });
    }

    console.log("Generated 3 new weekly missions.");
  } catch (error) {
    console.error("Error generating missions:", error);
  }
}

/**
 * Checks and updates mission progress based on a workout event.
 * If a mission completes, awards XP and returns completed missions.
 */
export async function checkMissionProgress(
  userId: number,
  events: MissionEvent[],
): Promise<{ completedMissions: Mission[] }> {
  const completedMissions: Mission[] = [];

  try {
    const activeMissions = await db
      .select()
      .from(missions)
      .where(
        and(eq(missions.userId, userId), eq(missions.status, "active")),
      );

    for (const mission of activeMissions) {
      let shouldIncrement = false;

      for (const event of events) {
        if (
          mission.type === "sessions_this_week" &&
          event.type === "session_complete"
        ) {
          shouldIncrement = true;
          break;
        }
        if (mission.type === "hit_a_pr" && event.type === "pr_hit") {
          shouldIncrement = true;
          break;
        }
        if (
          mission.type === "muscle_group" &&
          event.type === "set_logged" &&
          mission.muscleGroup &&
          event.muscleGroup.toLowerCase() ===
            mission.muscleGroup.toLowerCase()
        ) {
          shouldIncrement = true;
          break;
        }
      }

      if (!shouldIncrement) continue;

      const newValue = mission.currentValue + 1;
      const isComplete = newValue >= mission.targetValue;

      await db
        .update(missions)
        .set({
          currentValue: newValue,
          ...(isComplete
            ? { status: "completed", completedAt: new Date() }
            : {}),
        })
        .where(eq(missions.id, mission.id));

      if (isComplete) {
        // Award mission XP
        await applyXP(userId, mission.xpReward);
        completedMissions.push({ ...mission, currentValue: newValue, status: "completed" });
        console.log(
          `Mission completed: "${mission.title}" — +${mission.xpReward} XP`,
        );
      }
    }
  } catch (error) {
    console.error("Error checking mission progress:", error);
  }

  return { completedMissions };
}

/**
 * Returns all missions for the current week (active + completed + expired).
 */
export async function getMissions(userId: number): Promise<Mission[]> {
  try {
    const thisMonday = getThisMonday();

    const rows = await db
      .select()
      .from(missions)
      .where(eq(missions.userId, userId));

    // Return missions created this week, plus any still active
    return rows.filter(
      (m) =>
        (m.createdAt && m.createdAt >= thisMonday) ||
        m.status === "active",
    );
  } catch (error) {
    console.error("Error fetching missions:", error);
    return [];
  }
}

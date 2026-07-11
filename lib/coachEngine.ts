import { db } from "../db";
import { workoutSessions, userStats, missions, sets } from "../db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { calculateLevel } from "./xpEngine";

export type CoachCategory =
  | "onPR"
  | "onMissedDays"
  | "onSessionComplete"
  | "onLevelUp"
  | "onMissionComplete"
  | "onIdle";

const COACH_LINES: Record<CoachCategory, string[]> = {
  onPR: [
    "That's a new ceiling. Now we raise the floor.",
    "Strength is built in increments. Today you added a brick.",
    "A personal record. Remember how heavy that felt when you started.",
    "New strength unlocked. Respect the progress, then look ahead.",
    "PR achieved. You are rewriting your limits one rep at a time.",
    "That record was yesterday's peak. Today it's your new baseline.",
    "Progress is rarely loud. But that PR speaks for itself.",
    "You pushed past a barrier today. Let the body adapt now.",
  ],
  onMissedDays: [
    "You're back. That's what matters. Let's not waste it.",
    "A break is just a pause, not an end. Welcome back to the forge.",
    "Consistency isn't about being perfect; it's about returning. Let's begin.",
    "The days you missed are behind us. Today is the only day we have.",
    "Momentum can be rebuilt. Start with this set.",
    "It's normal to drift. The discipline is in the return.",
    "No guilt, no regrets. Just focus on the first set today.",
    "The weight doesn't care how long you were gone. It only cares that you're here now.",
  ],
  onSessionComplete: [
    "Work done. Rest, recover, and let the adaptation happen.",
    "Another session logged. Discipline is the quiet repetition of effort.",
    "You showed up and completed the task. That's a deposit in the bank.",
    "Session finished. The hardest part was getting started. Well done.",
    "Every logged workout is a vote for the person you want to become.",
    "The physical work is done. The mental strength remains.",
    "You did what needed to be done. Let it rest now.",
    "Consistency is built one finished session at a time.",
  ],
  onLevelUp: [
    "One session away. You already know what to do.",
    "New level unlocked. The weights didn't get lighter, you got stronger.",
    "Level up. A reminder of how far you've climbed since day one.",
    "A new rank in the forge. Keep sharpening the blade.",
    "Level increased. Elevate your effort to match your new status.",
    "You've reached a new level. The challenge grows, but so do you.",
    "Higher level, deeper commitment. Keep pushing the boundaries.",
  ],
  onMissionComplete: [
    "Mission accomplished. Extra XP earned, but the real reward is the habit.",
    "Weekly target reached. Small goals build the grand design.",
    "Mission complete. You set the target and hit it. Onto the next.",
    "Reward collected. Every completed mission is proof of focus.",
    "Mission done. You are executing the plan perfectly.",
    "Another milestone hit. Keep checking off the targets.",
  ],
  onIdle: [
    "Motivation gets you started, but discipline keeps you going.",
    "The forge is open. What's the plan for today?",
    "Consistency is the only secret. Show up, put in the work, repeat.",
    "Don't wait for inspiration. Action breeds motivation.",
    "Every rep is a brick. What are you building today?",
    "Your future self is depending on the choices you make today.",
    "Focus on the next set. The rest will take care of itself.",
    "Quiet progress is still progress. Keep showing up.",
    "Discipline doesn't ask how you feel. It asks what needs to be done.",
  ],
};

export async function determineCoachCategory(userId: number): Promise<CoachCategory> {
  const now = new Date();
  
  // 1. Fetch user stats
  const statsRows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);
    
  if (statsRows.length === 0) {
    return "onIdle";
  }
  const stats = statsRows[0];

  // 2. Fetch last completed session (completed in the last 12 hours)
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const lastSessionRows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.completedAt, twelveHoursAgo)
      )
    )
    .orderBy(desc(workoutSessions.completedAt))
    .limit(1);

  if (lastSessionRows.length > 0) {
    const lastSession = lastSessionRows[0];
    
    // Check for level up in this session
    // Fetch missions completed in the last 12 hours
    const recentMissions = await db
      .select()
      .from(missions)
      .where(
        and(
          eq(missions.userId, userId),
          eq(missions.status, "completed"),
          gte(missions.completedAt, twelveHoursAgo)
        )
      );
      
    const recentMissionsXp = recentMissions.reduce((sum, m) => sum + m.xpReward, 0);
    const xpBeforeRecent = stats.totalXp - lastSession.totalXpEarned - recentMissionsXp;
    
    const prevLevel = calculateLevel(xpBeforeRecent);
    if (stats.currentLevel > prevLevel) {
      return "onLevelUp";
    }

    // Check if any missions completed
    if (recentMissions.length > 0) {
      return "onMissionComplete";
    }

    // Check if session has a PR
    const prSets = await db
      .select()
      .from(sets)
      .where(and(eq(sets.sessionId, lastSession.id), eq(sets.isPr, true)))
      .limit(1);
      
    if (prSets.length > 0) {
      return "onPR";
    }

    return "onSessionComplete";
  }

  // 3. Check for missed days (4+ days)
  if (stats.lastWorkoutAt) {
    const lastWorkout = new Date(stats.lastWorkoutAt);
    const diffTime = now.getTime() - lastWorkout.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 4) {
      return "onMissedDays";
    }
  }

  return "onIdle";
}

export async function getCoachLine(userId: number): Promise<{ category: CoachCategory; line: string }> {
  try {
    const category = await determineCoachCategory(userId);
    const lines = COACH_LINES[category];
    
    // Stable seed selection
    const statsRows = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
      
    const lastWorkoutTime = statsRows[0]?.lastWorkoutAt
      ? new Date(statsRows[0].lastWorkoutAt).getTime()
      : 0;
      
    const daySeed = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    const seed = daySeed + lastWorkoutTime;
    const index = Math.abs(seed) % lines.length;
    
    return {
      category,
      line: lines[index],
    };
  } catch (error) {
    console.error("Error in getCoachLine:", error);
    return {
      category: "onIdle",
      line: COACH_LINES.onIdle[0],
    };
  }
}

import React, { useCallback, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import { Trophy, Flame, Dumbbell } from "lucide-react-native";
import { db } from "../../db";
import { user, userStats, workoutSessions, personalRecords, exercises } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import Animated, { FadeInUp } from "react-native-reanimated";

interface PRItem {
  prId: number;
  weight: number;
  reps: number;
  achievedAt: Date | null;
  exerciseName: string;
}

function timeAgo(date: Date | null | number): string {
  if (!date) return "some time ago";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "last week";
  return `${diffWeeks} weeks ago`;
}

function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toString();
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    currentLevel: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
  } | null>(null);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [prList, setPrList] = useState<PRItem[]>([]);
  const [userName, setUserName] = useState("Roni");

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadProfileData() {
        try {
          // Get user
          const users = await db.select().from(user).limit(1);
          if (users.length > 0) {
            const currentUser = users[0];
            if (isMounted) {
              setUserName(currentUser.firstName);
            }

            const userId = currentUser.id;

            // Fetch userStats
            const statsRes = await db
              .select()
              .from(userStats)
              .where(eq(userStats.userId, userId))
              .limit(1);
            if (statsRes.length > 0 && isMounted) {
              setStats(statsRes[0]);
            } else if (isMounted) {
              setStats({
                currentLevel: 1,
                totalXp: 0,
                currentStreak: 0,
                longestStreak: 0,
              });
            }

            // Fetch total sessions completed
            const sessions = await db
              .select()
              .from(workoutSessions)
              .where(eq(workoutSessions.userId, userId));
            const completedSessions = sessions.filter(s => s.completedAt);
            if (isMounted) {
              setSessionsCount(completedSessions.length);
            }

            // Fetch personal records list (joined with exercises)
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

            if (isMounted) {
              setPrList(prs);
            }
          }
        } catch (e) {
          console.error("Error loading profile details:", e);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
      loadProfileData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const level = stats?.currentLevel ?? 1;
  const streak = stats?.currentStreak ?? 0;
  const totalXp = stats?.totalXp ?? 0;

  if (loading) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <ActivityIndicator size="large" color="#f3ff47" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <Header title="Profile" />
      <Spacer height={20} />

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* User Card Header */}
        <Animated.View 
          entering={FadeInUp.duration(400)}
          className="items-center mb-6 mt-4"
        >
          <View className="w-24 h-24 rounded-full border-2 border-secondary justify-center items-center bg-tertiary">
            <Text className="text-secondary font-spaceBold text-3xl">
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-white font-spaceBold text-2xl mt-3">{userName}</Text>
          <Text className="text-secondary font-spaceBold text-xs mt-1">Goal — Batman Build</Text>
        </Animated.View>

        {/* Stats Row Cards */}
        <View className="flex-row justify-between mb-8 gap-2">
          {/* Level */}
          <Animated.View 
            entering={FadeInUp.delay(100).duration(400)}
            className="flex-1 bg-tertiary border border-neutral-900 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-spaceBold text-xl mb-1">{level}</Text>
            <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase">Level</Text>
          </Animated.View>
          {/* Day streak */}
          <Animated.View 
            entering={FadeInUp.delay(150).duration(400)}
            className="flex-1 bg-tertiary border border-neutral-900 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-spaceBold text-xl mb-1">{streak}</Text>
            <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase">Day streak</Text>
          </Animated.View>
          {/* Sessions */}
          <Animated.View 
            entering={FadeInUp.delay(200).duration(400)}
            className="flex-1 bg-tertiary border border-neutral-900 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-spaceBold text-xl mb-1">{sessionsCount}</Text>
            <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase">Sessions</Text>
          </Animated.View>
          {/* Total XP */}
          <Animated.View 
            entering={FadeInUp.delay(250).duration(400)}
            className="flex-1 bg-tertiary border border-neutral-900 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-spaceBold text-xl mb-1">{formatXP(totalXp)}</Text>
            <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase">Total XP</Text>
          </Animated.View>
        </View>

        {/* Current Goal Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-spaceBold text-lg">Current goal</Text>
            <Pressable>
              <Text className="text-secondary font-spaceBold text-xs">Change</Text>
            </Pressable>
          </View>

          <View className="bg-tertiary border border-neutral-900 rounded-3xl p-5 relative">
            <View className="absolute top-5 right-5 bg-secondary/10 border border-secondary/35 rounded-full px-2 py-0.5">
              <Text className="text-secondary font-spaceBold text-[10px]">In progress</Text>
            </View>

            <Text className="text-white font-spaceBold text-lg mb-4">Batman Build</Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-neutral-400 font-spaceRegular text-sm">Body fat</Text>
                <Text className="text-white font-spaceBold text-sm">10–12%</Text>
              </View>
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-neutral-400 font-spaceRegular text-sm">Bench press</Text>
                <Text className="text-white font-spaceBold text-sm">1.2× bodyweight</Text>
              </View>
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-neutral-400 font-spaceRegular text-sm">Pull-ups</Text>
                <Text className="text-white font-spaceBold text-sm">15 reps</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Personal Records Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} className="mb-16">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-spaceBold text-lg">Personal records</Text>
            <Pressable>
              <Text className="text-secondary font-spaceBold text-xs">All PRs</Text>
            </Pressable>
          </View>

          {prList.length === 0 ? (
            <View className="bg-tertiary border border-neutral-900 border-dashed rounded-3xl p-8 items-center justify-center">
              <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
                No personal records logged yet. Complete a workout to set new PRs!
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {prList.map((pr, index) => (
                <Animated.View 
                  key={pr.prId} 
                  entering={FadeInUp.delay(450 + index * 50).duration(400)}
                  className="bg-tertiary border border-neutral-900 rounded-2xl p-4 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-white font-spaceBold text-sm capitalize">{pr.exerciseName}</Text>
                    <Text className="text-neutral-500 font-spaceRegular text-xs mt-0.5">
                      {pr.reps} reps · {timeAgo(pr.achievedAt)}
                    </Text>
                  </View>
                  <Text className="text-secondary font-spaceBold text-base">
                    {pr.weight} kg
                  </Text>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

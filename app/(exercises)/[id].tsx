import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trophy, TrendingUp, Dumbbell, History, BookOpen, Flame } from "lucide-react-native";

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
};

type HistoricalSet = {
  id: number;
  sessionId: number;
  sessionName: string | null;
  startedAt: Date | null;
  weight: number;
  reps: number;
  setNumber: number;
  isPr: boolean | null;
  weightUnit: string;
  setType: string;
};

type GroupedSession = {
  sessionId: number;
  sessionName: string;
  dateStr: string;
  maxWeight: number;
  maxE1RM: number;
  sets: HistoricalSet[];
};

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: "#EF4444",
  Back: "#3B82F6",
  Legs: "#22C55E",
  Shoulders: "#F59E0B",
  Arms: "#A855F7",
  Core: "#EC4899",
  Biceps: "#A855F7",
  Triceps: "#A855F7",
  Glutes: "#22C55E",
  Hamstrings: "#22C55E",
  Quadriceps: "#22C55E",
};

const getMuscleColor = (muscle: string) =>
  MUSCLE_GROUP_COLORS[muscle] ?? "#f3ff47";

const calculateE1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

const InfoChip = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) => (
  <View className="bg-tertiary/40 border border-white/5 rounded-2xl p-4 flex-1">
    <Text className="text-neutral-500 font-spaceMedium text-xs mb-1 uppercase tracking-widest">
      {label}
    </Text>
    <Text
      className="font-spaceBold text-sm"
      style={{ color: accent ?? "#fff" }}
    >
      {value}
    </Text>
  </View>
);

import { useExerciseDetail } from "../../lib/hooks/useQueries";

const ExerciseDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"analytics" | "instructions">("analytics");

  const exerciseId = id ? Number(id) : null;
  const { data, isLoading } = useExerciseDetail(exerciseId);

  const exercise = data?.exercise ?? null;
  const historySets = data?.historySets ?? [];
  const groupedSessions = data?.groupedSessions ?? [];
  const notFound = !isLoading && !exercise;

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <ActivityIndicator color="#f3ff47" size="large" />
      </View>
    );
  }

  if (notFound || !exercise) {
    return (
      <View
        className="flex-1 bg-primary justify-center items-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-white font-spaceBold text-xl mb-2">
          Exercise not found
        </Text>
        <Text className="text-neutral-500 font-spaceMedium text-sm text-center mb-6">
          This exercise may have been removed or doesn't exist.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-secondary/20 px-6 py-3 rounded-full"
        >
          <Text className="text-secondary font-spaceBold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const instructions = exercise.instructions
    ? exercise.instructions.split(/\n|\.\s+/).filter(Boolean)
    : [];

  // Compute overall stats
  const workingSets = historySets.filter((s) => s.setType !== "warmup");
  const maxWeight = workingSets.reduce((max, s) => Math.max(max, s.weight), 0);
  const maxE1RM = workingSets.reduce(
    (max, s) => Math.max(max, calculateE1RM(s.weight, s.reps)),
    0,
  );
  const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const mainUnit = workingSets[0]?.weightUnit || "lbs";

  // Reverse sessions to get chronological progression data for the chart
  const chronologicalSessions = [...groupedSessions].reverse();
  const maxE1RMChart = Math.max(...chronologicalSessions.map((s) => s.maxE1RM), 1);

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View
        className="px-5 pb-4 border-b border-white/5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/10 items-center justify-center mb-4"
        >
          <Text className="text-white font-spaceBold text-base">‹</Text>
        </Pressable>

        <View className="w-10 h-1 rounded-full mb-3 bg-secondary" />
        <Text className="text-white font-spaceBold text-2xl leading-tight mb-2">
          {exercise.name}
        </Text>

        {/* Tab Switcher */}
        <View className="flex-row bg-neutral-900 p-1 rounded-xl mt-3 border border-white/5">
          <Pressable
            onPress={() => setActiveTab("analytics")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-2 ${
              activeTab === "analytics"
                ? "bg-tertiary border border-white/10"
                : ""
            }`}
          >
            <TrendingUp
              size={14}
              color={activeTab === "analytics" ? "#f3ff47" : "#888"}
            />
            <Text
              className={`font-spaceBold text-xs ${
                activeTab === "analytics" ? "text-secondary" : "text-neutral-400"
              }`}
            >
              Analytics & History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("instructions")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-2 ${
              activeTab === "instructions"
                ? "bg-tertiary border border-white/10"
                : ""
            }`}
          >
            <BookOpen
              size={14}
              color={activeTab === "instructions" ? "#f3ff47" : "#888"}
            />
            <Text
              className={`font-spaceBold text-xs ${
                activeTab === "instructions" ? "text-secondary" : "text-neutral-400"
              }`}
            >
              Instructions
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {activeTab === "analytics" ? (
          <View className="px-5 pt-5">
            {/* Quick Stat Cards */}
            <View className="flex-row gap-3 mb-4">
              <View className="bg-tertiary/40 border border-white/5 rounded-2xl p-4 flex-1">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Trophy size={14} color="#f3ff47" />
                  <Text className="text-neutral-500 font-spaceMedium text-[10px] uppercase tracking-widest">
                    MAX WEIGHT
                  </Text>
                </View>
                <Text className="font-spaceBold text-2xl text-white">
                  {maxWeight} <Text className="text-xs text-neutral-400">{mainUnit}</Text>
                </Text>
              </View>

              <View className="bg-tertiary/40 border border-white/5 rounded-2xl p-4 flex-1">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Flame size={14} color="#f59e0b" />
                  <Text className="text-neutral-500 font-spaceMedium text-[10px] uppercase tracking-widest">
                    EST. 1RM
                  </Text>
                </View>
                <Text className="font-spaceBold text-2xl text-secondary">
                  {maxE1RM} <Text className="text-xs text-neutral-400">{mainUnit}</Text>
                </Text>
              </View>
            </View>

            <View className="bg-tertiary/40 border border-white/5 rounded-2xl p-4 mb-6">
              <Text className="text-neutral-500 font-spaceMedium text-[10px] uppercase tracking-widest mb-1">
                LIFETIME VOLUME LOGGED
              </Text>
              <Text className="font-spaceBold text-xl text-white">
                {totalVolume.toLocaleString()} <Text className="text-xs text-neutral-400">{mainUnit}</Text>
              </Text>
            </View>

            {/* 1RM Progression Chart */}
            {chronologicalSessions.length > 1 && (
              <View className="bg-tertiary/40 border border-white/5 rounded-2xl p-5 mb-6">
                <Text className="text-white font-spaceBold text-base mb-1">
                  1RM Progression Trend
                </Text>
                <Text className="text-neutral-500 font-spaceRegular text-xs mb-4">
                  Estimated 1RM across recent sessions
                </Text>

                <View className="flex-row items-end justify-between h-32 pt-4 px-2">
                  {chronologicalSessions.slice(-7).map((session, idx) => {
                    const heightPercent = Math.max(
                      15,
                      Math.round((session.maxE1RM / maxE1RMChart) * 100),
                    );
                    return (
                      <View key={session.sessionId} className="items-center flex-1 mx-1">
                        <Text className="text-[9px] font-spaceBold text-neutral-400 mb-1">
                          {session.maxE1RM}
                        </Text>
                        <View className="w-full bg-neutral-900 rounded-t-lg overflow-hidden justify-end h-20">
                          <View
                            className="bg-secondary rounded-t-lg"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </View>
                        <Text className="text-[9px] font-spaceMedium text-neutral-500 mt-1 truncate">
                          {session.dateStr.split(",")[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* History Logs Section */}
            <Text className="text-white font-spaceBold text-lg mb-3">
              Workout History
            </Text>

            {groupedSessions.length === 0 ? (
              <View className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 items-center">
                <Dumbbell size={32} color="#555" className="mb-2" />
                <Text className="text-neutral-400 font-spaceBold text-sm text-center mb-1">
                  No Working Sets Logged Yet
                </Text>
                <Text className="text-neutral-500 font-spaceRegular text-xs text-center">
                  Log this exercise during your next workout to track 1RM and progress.
                </Text>
              </View>
            ) : (
              groupedSessions.map((session) => (
                <View
                  key={session.sessionId}
                  className="bg-tertiary/30 border border-white/5 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-white/5">
                    <View>
                      <Text className="text-white font-spaceBold text-sm">
                        {session.sessionName}
                      </Text>
                      <Text className="text-neutral-500 font-spaceRegular text-[10px]">
                        {session.dateStr}
                      </Text>
                    </View>
                    <View className="bg-secondary/15 px-2.5 py-1 rounded-full">
                      <Text className="text-secondary font-spaceBold text-[10px]">
                        Top 1RM: {session.maxE1RM} {session.sets[0]?.weightUnit || "lbs"}
                      </Text>
                    </View>
                  </View>

                  {session.sets.map((s) => {
                    const e1rm = calculateE1RM(s.weight, s.reps);
                    return (
                      <View
                        key={s.id}
                        className="flex-row items-center justify-between py-1.5 px-1 border-b border-neutral-900/50"
                      >
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`w-6 h-5 rounded items-center justify-center ${
                              s.setType === "warmup"
                                ? "bg-amber-500/20"
                                : s.setType === "drop"
                                ? "bg-purple-500/20"
                                : s.setType === "failure"
                                ? "bg-red-500/20"
                                : "bg-neutral-800"
                            }`}
                          >
                            <Text
                              className={`font-spaceBold text-[9px] ${
                                s.setType === "warmup"
                                  ? "text-amber-400"
                                  : s.setType === "drop"
                                  ? "text-purple-400"
                                  : s.setType === "failure"
                                  ? "text-red-400"
                                  : "text-white"
                              }`}
                            >
                              {s.setType === "warmup"
                                ? "WM"
                                : s.setType === "drop"
                                ? "DR"
                                : s.setType === "failure"
                                ? "FL"
                                : `${s.setNumber}`}
                            </Text>
                          </View>

                          <Text className="text-white font-spaceBold text-xs">
                            {s.weight} {s.weightUnit} × {s.reps} reps
                          </Text>

                          {s.isPr && (
                            <View className="bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                              <Text className="text-amber-400 font-spaceBold text-[9px]">
                                PR
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text className="text-neutral-400 font-spaceMedium text-xs">
                          e1RM: {e1rm} {s.weightUnit}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        ) : (
          /* Instructions Tab */
          <View className="px-5 pt-5">
            <View className="flex-row gap-3 mb-6">
              <InfoChip label="Muscle" value={exercise.muscleGroup} />
              {exercise.equipment ? (
                <InfoChip label="Equipment" value={exercise.equipment} />
              ) : null}
              {exercise.category ? (
                <InfoChip label="Category" value={exercise.category} />
              ) : null}
            </View>

            {instructions.length > 0 ? (
              <View>
                <Text className="text-white font-spaceBold text-lg mb-4">
                  How to perform
                </Text>
                {instructions.map((step, index) => (
                  <View
                    key={index}
                    className="flex-row mb-4 bg-tertiary/40 border border-white/5 rounded-2xl p-4"
                  >
                    <View className="w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5 flex-shrink-0 bg-secondary/20">
                      <Text className="font-spaceBold text-xs text-secondary">
                        {index + 1}
                      </Text>
                    </View>
                    <Text className="text-neutral-300 font-spaceMedium text-sm flex-1 leading-relaxed">
                      {step.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 items-center">
                <Text className="text-neutral-500 font-spaceMedium text-sm text-center">
                  No instructions available for this exercise yet.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ExerciseDetail;

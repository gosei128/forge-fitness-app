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
import { db } from "../../db";
import { exercises } from "../../db/schema";
import { eq } from "drizzle-orm";

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
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
  MUSCLE_GROUP_COLORS[muscle] ?? "#7C3AED";

const InfoChip = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) => (
  <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-1">
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

const ExerciseDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchExercise = async () => {
      if (!id) return;
      const result = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, Number(id)))
        .limit(1);

      if (result.length === 0) {
        setNotFound(true);
      } else {
        setExercise(result[0]);
      }
      setIsLoading(false);
    };
    fetchExercise();
  }, [id]);

  const accentColor = exercise
    ? getMuscleColor(exercise.muscleGroup)
    : "#7C3AED";

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <ActivityIndicator color="#7C3AED" size="large" />
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

        {/* Accent bar */}
        <View className="w-10 h-1 rounded-full mb-3 bg-secondary" />
        <Text className="text-white font-spaceBold text-2xl leading-tight">
          {exercise.name}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Info chips row */}
        <View className="px-5 pt-5 flex-row gap-3">
          <InfoChip label="Muscle" value={exercise.muscleGroup} />
          {exercise.equipment ? (
            <InfoChip label="Equipment" value={exercise.equipment} />
          ) : null}
          {exercise.category ? (
            <InfoChip label="Category" value={exercise.category} />
          ) : null}
        </View>

        {/* Instructions */}
        {instructions.length > 0 && (
          <View className="px-5 mt-6">
            <Text className="text-white font-spaceBold text-lg mb-4">
              How to perform
            </Text>
            {instructions.map((step, index) => (
              <View
                key={index}
                className="flex-row mb-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4"
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
        )}

        {instructions.length === 0 && (
          <View className="px-5 mt-6">
            <View className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 items-center">
              <Text className="text-neutral-500 font-spaceMedium text-sm text-center">
                No instructions available for this exercise yet.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ExerciseDetail;

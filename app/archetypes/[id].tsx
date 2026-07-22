import React, { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────
interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

interface Workout {
  day: number;
  name: string;
  exercises: Exercise[];
}

interface Phase {
  phase: number;
  name: string;
  weeks: number;
  description: string;
  workouts: Workout[];
}

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trophy,
  Target,
  Dumbbell,
} from "lucide-react-native";
import { db } from "../../db";
import { user } from "../../db/schema";
import { getArchetype, selectArchetype } from "../../lib/archetypes";
import Spacer from "../../components/Spacer";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

// ─── Accordion Card ────────────────────────────────────────────
function AccordionCard({
  title,
  content,
  isExpanded,
  onPress,
  isLast = false,
}: {
  title: string;
  content: string;
  isExpanded: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const heightVal = useSharedValue(0);

  useEffect(() => {
    if (contentHeight > 0) {
      heightVal.value = withTiming(isExpanded ? contentHeight : 0, {
        duration: 250,
      });
    }
  }, [isExpanded, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = contentHeight > 0 ? heightVal.value / contentHeight : 0;
    return { height: heightVal.value, opacity };
  });

  return (
    <Pressable
      onPress={onPress}
      className={`bg-tertiary/40 border border-white/5 p-4 rounded-2xl ${isLast ? "mb-6" : "mb-3"}`}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-white font-spaceBold text-sm">{title}</Text>
        {isExpanded ? (
          <ChevronUp color="#999" size={16} />
        ) : (
          <ChevronDown color="#999" size={16} />
        )}
      </View>

      {/* Hidden measurement container */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          opacity: 0,
          left: 16,
          right: 16,
          top: 0,
        }}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <View className="mt-3 border-t border-neutral-900/60 pt-3">
          <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
            {content}
          </Text>
        </View>
      </View>

      <Animated.View style={[{ overflow: "hidden" }, animatedStyle]}>
        <View className="mt-3 border-t border-neutral-900/60 pt-3">
          <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
            {content}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Workout Carousel ──────────────────────────────────────────
// Isolated dayIndex state per phase — navigation is independent across phases.
function WorkoutCarousel({ workouts }: { workouts: Workout[] }) {
  const [dayIndex, setDayIndex] = useState(0);

  // Reset index when workouts list changes (e.g. user toggles a different phase)
  useEffect(() => {
    setDayIndex(0);
  }, [workouts]);

  // Guard dayIndex out of bounds during transition renders
  const safeDayIndex = dayIndex >= workouts.length ? 0 : dayIndex;
  const workout = workouts[safeDayIndex];

  // Guard against empty workouts array
  if (!workout) return null;

  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const navigate = (direction: "prev" | "next") => {
    // Pre-compute as a plain number — runOnJS cannot serialize a function argument
    const newIndex =
      direction === "next"
        ? Math.min(workouts.length - 1, dayIndex + 1)
        : Math.max(0, dayIndex - 1);

    const outX = direction === "next" ? -12 : 12;
    const inX = direction === "next" ? 12 : -12;

    // Fade + slide out
    opacity.value = withTiming(0, { duration: 100 });
    translateX.value = withTiming(outX, { duration: 100 }, () => {
      // Swap content at the invisible frame (newIndex is a plain number — safe to pass)
      runOnJS(setDayIndex)(newIndex);
      // Snap to opposite side then fade + slide in
      translateX.value = inX;
      opacity.value = withTiming(1, { duration: 150 });
      translateX.value = withTiming(0, { duration: 150 });
    });
  };

  const goBack = () => {
    if (safeDayIndex > 0) navigate("prev");
  };
  const goNext = () => {
    if (safeDayIndex < workouts.length - 1) navigate("next");
  };

  const isFirst = safeDayIndex === 0;
  const isLast = safeDayIndex === workouts.length - 1;

  return (
    <View className="mt-4 border-t border-white/5 pt-4">
      {/* Day navigator row */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={goBack}
          disabled={isFirst}
          className={`p-1.5 rounded-full border ${
            isFirst
              ? "border-white/5 opacity-30"
              : "border-secondary/40 bg-secondary/10"
          }`}
        >
          <ChevronLeft color={isFirst ? "#555" : "#fba613"} size={14} />
        </Pressable>

        <View className="items-center flex-1 mx-3">
          <Text className="text-white font-spaceBold text-xs text-center">
            Day {workout.day} — {workout.name}
          </Text>
          {/* Pill dot indicators */}
          <View className="flex-row gap-1 mt-1.5">
            {workouts.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === safeDayIndex ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: i === safeDayIndex ? "#fba613" : "#333",
                }}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={goNext}
          disabled={isLast}
          className={`p-1.5 rounded-full border ${
            isLast
              ? "border-white/5 opacity-30"
              : "border-secondary/40 bg-secondary/10"
          }`}
        >
          <ChevronRight color={isLast ? "#555" : "#fba613"} size={14} />
        </Pressable>
      </View>

      {/* Animated exercise table */}
      <Animated.View
        style={animatedStyle}
        className="bg-primary/40 rounded-2xl overflow-hidden border border-white/5"
      >
        {/* Table header */}
        <View className="flex-row px-4 py-2.5 border-b border-white/5">
          <Text className="flex-1 text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider">
            Exercise
          </Text>
          <Text className="w-10 text-center text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider">
            Sets
          </Text>
          <Text className="w-14 text-center text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider">
            Reps
          </Text>
          <Text className="w-10 text-right text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider">
            Rest
          </Text>
        </View>

        {/* Exercise rows */}
        {workout.exercises.map((ex: Exercise, idx: number) => (
          <View
            key={idx}
            className={`flex-row items-center px-4 py-3 ${
              idx < workout.exercises.length - 1
                ? "border-b border-white/5"
                : ""
            }`}
          >
            <Text
              className="flex-1 text-white font-spaceRegular text-xs capitalize"
              numberOfLines={1}
            >
              {ex.name}
            </Text>
            <Text className="w-10 text-center text-secondary font-spaceBold text-xs">
              {ex.sets}
            </Text>
            <Text className="w-14 text-center text-neutral-300 font-spaceRegular text-xs">
              {ex.reps}
            </Text>
            <Text className="w-10 text-right text-neutral-500 font-spaceRegular text-xs">
              {ex.rest}s
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────
export default function CharacterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const item = getArchetype(id || "");

  useEffect(() => {
    async function loadUser() {
      try {
        const users = await db.select().from(user).limit(1);
        if (users.length > 0) setUserId(users[0].id);
      } catch (e) {
        console.error("Error loading user in detail screen:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "beginner":
        return {
          text: "text-green-400",
          bg: "bg-green-400/10",
          border: "border-green-400/20",
        };
      case "intermediate":
        return {
          text: "text-amber-400",
          bg: "bg-amber-400/10",
          border: "border-amber-400/20",
        };
      case "advanced":
        return {
          text: "text-red-400",
          bg: "bg-red-400/10",
          border: "border-red-400/20",
        };
      default:
        return {
          text: "text-neutral-400",
          bg: "bg-neutral-400/10",
          border: "border-neutral-400/20",
        };
    }
  };

  const getStrengthTarget = (targets: any) => {
    if (targets.benchPress) return `Bench: ${targets.benchPress}`;
    if (targets.deadlift) return `Deadlift: ${targets.deadlift}`;
    if (targets.pullUps) return `Pullups: ${targets.pullUps} reps`;
    return "";
  };

  const handleStartProgram = async () => {
    if (!userId || !item) return;
    try {
      await selectArchetype(userId, item.id);
      router.replace("/(tabs)/workouts");
    } catch (e) {
      console.error("Error starting program:", e);
    }
  };

  if (loading || !item) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <ActivityIndicator size="large" color="#fba613" />
      </View>
    );
  }

  const diffColors = getDifficultyColor(item.difficulty);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="bg-neutral-900 border border-neutral-850 p-2.5 rounded-full"
        >
          <ChevronLeft color="#fff" size={20} />
        </Pressable>
        <Text className="text-white font-spaceBold text-lg ml-4">
          Physique Program
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Character header */}
        <View className="mt-4 mb-6">
          <Text className="text-white font-spaceBold text-4xl mb-1">
            {item.character}
          </Text>
          <View className="flex-row items-center gap-3 mt-1.5 mb-3.5">
            <Text className="text-neutral-400 font-spaceMedium text-sm">
              {item.archetype}
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full border ${diffColors.bg} ${diffColors.border}`}
            >
              <Text
                className={`font-spaceBold text-[9px] uppercase tracking-wider ${diffColors.text}`}
              >
                {item.difficulty}
              </Text>
            </View>
          </View>
          <Text className="text-neutral-500 font-spaceRegular text-xs leading-relaxed italic">
            "{item.realWorldEquivalent}"
          </Text>
        </View>

        {/* Coach Card */}
        <View className="bg-tertiary/50 border border-neutral-900 p-5 rounded-3xl mb-6 flex-row gap-4 items-center">
          <Image
            source={require("../../assets/images/coach-head.png")}
            style={{ width: 60, height: 70, borderRadius: 100 }}
          />
          <View className="flex-1">
            <Text className="text-secondary font-spaceBold text-xs uppercase tracking-wider mb-1">
              Coach says
            </Text>
            <Text className="text-white font-spaceRegular text-xs leading-relaxed italic">
              "{item.coachLines.onBodyTypeExplain}"
            </Text>
          </View>
        </View>

        {/* Target Metrics */}
        <Text className="text-white font-spaceBold text-lg mb-3">
          Target Metrics
        </Text>
        <View className="flex-row justify-between gap-3 mb-6">
          <View className="flex-1 bg-tertiary/40 border border-white/5 p-4 rounded-2xl items-center justify-center">
            <Target color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Body Fat
            </Text>
            <Text className="text-white font-spaceBold text-sm text-center">
              {item.targets.bodyFat}
            </Text>
          </View>
          <View className="flex-1 bg-tertiary/40 border border-white/5 p-4 rounded-2xl items-center justify-center">
            <Trophy color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Strength
            </Text>
            <Text className="text-white font-spaceBold text-sm text-center">
              {getStrengthTarget(item.targets)}
            </Text>
          </View>
          <View className="flex-1 bg-tertiary/40 border border-white/5 p-4 rounded-2xl items-center justify-center">
            <Dumbbell color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Focus
            </Text>
            <Text
              className="text-white font-spaceBold text-[10px] text-center"
              numberOfLines={2}
            >
              {item.targets.focus}
            </Text>
          </View>
        </View>

        {/* Program Discussion */}
        <Text className="text-white font-spaceBold text-lg mb-3">
          Program Discussion
        </Text>
        <AccordionCard
          title="What to expect"
          content={item.bodyTypeDiscussion.expectations}
          isExpanded={expandedSection === "expect"}
          onPress={() => toggleSection("expect")}
        />
        <AccordionCard
          title="Timeline"
          content={item.bodyTypeDiscussion.timeline}
          isExpanded={expandedSection === "timeline"}
          onPress={() => toggleSection("timeline")}
        />
        <AccordionCard
          title="Coach note"
          content={item.bodyTypeDiscussion.coachNote}
          isExpanded={expandedSection === "coachNote"}
          onPress={() => toggleSection("coachNote")}
          isLast={true}
        />

        {/* ─── Training Phases + per-phase Workout Carousels ─── */}
        <Text className="text-white font-spaceBold text-lg mb-3">
          Training Phases
        </Text>
        <View className="gap-4 mb-10">
          {item.phases.map((phase: Phase) => (
            <View
              key={phase.phase}
              className="bg-tertiary/40 border border-white/5 p-5 rounded-3xl"
            >
              {/* Phase header */}
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-secondary font-spaceBold text-sm">
                  Phase {phase.phase} — {phase.name}
                </Text>
                <View className="bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full">
                  <Text className="text-secondary font-spaceBold text-[9px] uppercase">
                    {phase.weeks} weeks
                  </Text>
                </View>
              </View>

              <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed mb-1">
                {phase.description}
              </Text>

              <Text className="text-neutral-600 font-spaceBold text-[9px] uppercase tracking-wider">
                {phase.workouts.length} training day
                {phase.workouts.length !== 1 ? "s" : ""} / week
              </Text>

              {/* Day carousel — independent state per phase */}
              <WorkoutCarousel workouts={phase.workouts} />
            </View>
          ))}
        </View>

        <Spacer height={40} />
      </ScrollView>

      {/* Bottom CTA */}
      <View className="p-5 bg-primary border-t border-neutral-950">
        <Pressable
          onPress={handleStartProgram}
          className="bg-secondary py-4 rounded-2xl items-center justify-center shadow-lg active:opacity-90"
        >
          <Text className="text-black font-spaceBold text-sm uppercase tracking-wider">
            Start This Program
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

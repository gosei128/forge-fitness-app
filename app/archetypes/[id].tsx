import React, { useState, useEffect } from "react";
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
  Trophy,
  Target,
  Dumbbell,
} from "lucide-react-native";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getArchetype, selectArchetype } from "../../lib/archetypes";
import Spacer from "../../components/Spacer";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

// ─── Accordion Card component ────────────────────────────────
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
    return {
      height: heightVal.value,
      opacity: opacity,
    };
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

      {/* Hidden layout measurement container (absolute, off-screen horizontal bounds) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          opacity: 0,
          left: 16,
          right: 16,
          top: 0,
        }}
        onLayout={(e) => {
          setContentHeight(e.nativeEvent.layout.height);
        }}
      >
        <View className="mt-3 border-t border-neutral-900/60 pt-3">
          <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
            {content}
          </Text>
        </View>
      </View>

      {/* Animated container */}
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
        if (users.length > 0) {
          setUserId(users[0].id);
        }
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
      // Navigate to dashboard
      router.replace("/(tabs)");
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
      {/* Header back button */}
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
        {/* Top Header Section */}
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

        {/* Targets Section */}
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
              Primary Focus
            </Text>
            <Text
              className="text-white font-spaceBold text-[10px] text-center"
              numberOfLines={2}
            >
              {item.targets.focus}
            </Text>
          </View>
        </View>

        {/* Body Type Discussion Section */}
        <Text className="text-white font-spaceBold text-lg mb-3">
          Program Discussion
        </Text>

        {/* Program Discussion Accordions */}
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

        {/* Phases Section */}
        <Text className="text-white font-spaceBold text-lg mb-3">
          Phases Overview
        </Text>
        <View className="space-y-4 mb-12 gap-3">
          {item.phases.map((phase: any) => (
            <View
              key={phase.phase}
              className="bg-tertiary/40 border border-white/5 p-5 rounded-3xl"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-secondary font-spaceBold text-sm">
                  Phase {phase.phase} — {phase.name}
                </Text>
                <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase">
                  {phase.weeks} Weeks
                </Text>
              </View>
              <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
                {phase.description}
              </Text>
            </View>
          ))}
        </View>

        <Spacer height={40} />
      </ScrollView>

      {/* Bottom Button Fixed */}
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

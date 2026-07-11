import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, ChevronDown, ChevronUp, Trophy, Target, Dumbbell } from "lucide-react-native";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getArchetype, selectArchetype } from "../../lib/archetypes";
import Spacer from "../../components/Spacer";

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
        return { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" };
      case "intermediate":
        return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" };
      case "advanced":
        return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
      default:
        return { text: "text-neutral-400", bg: "bg-neutral-400/10", border: "border-neutral-400/20" };
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
            <View className={`px-2 py-0.5 rounded-full border ${diffColors.bg} ${diffColors.border}`}>
              <Text className={`font-spaceBold text-[9px] uppercase tracking-wider ${diffColors.text}`}>
                {item.difficulty}
              </Text>
            </View>
          </View>
          <Text className="text-neutral-500 font-spaceRegular text-xs leading-relaxed italic">
            "{item.realWorldEquivalent}"
          </Text>
        </View>

        {/* Coach Card */}
        <View className="bg-[#1a1a1e] border border-neutral-900 p-5 rounded-3xl mb-6 flex-row gap-4 items-center">
          <View className="w-12 h-12 rounded-2xl bg-[#fba613]/10 border border-[#fba613]/25 justify-center items-center">
            <Text className="text-[#fba613] font-spaceBold text-xl">S</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#fba613] font-spaceBold text-xs uppercase tracking-wider mb-1">
              Coach says
            </Text>
            <Text className="text-white font-spaceRegular text-xs leading-relaxed italic">
              "{item.coachLines.onBodyTypeExplain}"
            </Text>
          </View>
        </View>

        {/* Targets Section */}
        <Text className="text-white font-spaceBold text-lg mb-3">Target Metrics</Text>
        <View className="flex-row justify-between gap-3 mb-6">
          <View className="flex-1 bg-neutral-900 border border-neutral-850 p-4 rounded-2xl items-center justify-center">
            <Target color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Body Fat
            </Text>
            <Text className="text-white font-spaceBold text-sm text-center">
              {item.targets.bodyFat}
            </Text>
          </View>
          <View className="flex-1 bg-neutral-900 border border-neutral-850 p-4 rounded-2xl items-center justify-center">
            <Trophy color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Strength
            </Text>
            <Text className="text-white font-spaceBold text-sm text-center">
              {getStrengthTarget(item.targets)}
            </Text>
          </View>
          <View className="flex-1 bg-neutral-900 border border-neutral-850 p-4 rounded-2xl items-center justify-center">
            <Dumbbell color="#fba613" size={16} className="mb-2" />
            <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase mb-1">
              Primary Focus
            </Text>
            <Text className="text-white font-spaceBold text-[10px] text-center" numberOfLines={2}>
              {item.targets.focus}
            </Text>
          </View>
        </View>

        {/* Body Type Discussion Section */}
        <Text className="text-white font-spaceBold text-lg mb-3">Program Discussion</Text>
        
        {/* Card 1: What to expect */}
        <Pressable
          onPress={() => toggleSection("expect")}
          className="bg-[#1a1a1e] border border-neutral-900 p-4 rounded-2xl mb-3"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-spaceBold text-sm">What to expect</Text>
            {expandedSection === "expect" ? (
              <ChevronUp color="#999" size={16} />
            ) : (
              <ChevronDown color="#999" size={16} />
            )}
          </View>
          {expandedSection === "expect" && (
            <View className="mt-3 border-t border-neutral-900/60 pt-3">
              <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
                {item.bodyTypeDiscussion.expectations}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Card 2: Timeline */}
        <Pressable
          onPress={() => toggleSection("timeline")}
          className="bg-[#1a1a1e] border border-neutral-900 p-4 rounded-2xl mb-3"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-spaceBold text-sm">Timeline</Text>
            {expandedSection === "timeline" ? (
              <ChevronUp color="#999" size={16} />
            ) : (
              <ChevronDown color="#999" size={16} />
            )}
          </View>
          {expandedSection === "timeline" && (
            <View className="mt-3 border-t border-neutral-900/60 pt-3">
              <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
                {item.bodyTypeDiscussion.timeline}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Card 3: Coach note */}
        <Pressable
          onPress={() => toggleSection("coachNote")}
          className="bg-[#1a1a1e] border border-neutral-900 p-4 rounded-2xl mb-6"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-spaceBold text-sm">Coach note</Text>
            {expandedSection === "coachNote" ? (
              <ChevronUp color="#999" size={16} />
            ) : (
              <ChevronDown color="#999" size={16} />
            )}
          </View>
          {expandedSection === "coachNote" && (
            <View className="mt-3 border-t border-neutral-900/60 pt-3">
              <Text className="text-neutral-400 font-spaceRegular text-xs leading-relaxed">
                {item.bodyTypeDiscussion.coachNote}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Phases Section */}
        <Text className="text-white font-spaceBold text-lg mb-3">Phases Overview</Text>
        <View className="space-y-4 mb-12">
          {item.phases.map((phase: any) => (
            <View
              key={phase.phase}
              className="bg-neutral-900/40 border border-neutral-900 p-5 rounded-3xl"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-[#fba613] font-spaceBold text-sm">
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
          className="bg-[#fba613] py-4 rounded-2xl items-center justify-center shadow-lg active:opacity-90"
        >
          <Text className="text-black font-spaceBold text-sm uppercase tracking-wider">
            Start This Program
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

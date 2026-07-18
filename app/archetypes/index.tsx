import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getAllArchetypes } from "../../lib/archetypes";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";

export default function CharacterSelection() {
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadCurrentGoal() {
        try {
          const users = await db.select().from(user).limit(1);
          if (users.length > 0) {
            const currentUserId = users[0].id;
            const statsRes = await db
              .select()
              .from(userStats)
              .where(eq(userStats.userId, currentUserId))
              .limit(1);
            if (statsRes.length > 0 && isMounted) {
              setSelectedId(statsRes[0].selectedArchetypeId);
            }
          }
        } catch (e) {
          console.error("Error loading goal in character selection:", e);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
      loadCurrentGoal();
      return () => {
        isMounted = false;
      };
    }, []),
  );

  const archetypes = getAllArchetypes();

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

  const handleSkip = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <ActivityIndicator size="large" color="#fba613" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <Header title="Choose Your Goal" />
      <Spacer height={10} />

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-2 mb-6">
          <Text className="text-neutral-400 font-spaceRegular text-sm">
            Your coach will build the path. Committing to a physique archetype
            dictates your training and targets.
          </Text>
        </View>

        {archetypes.map((item) => {
          const isSelected = item.id === selectedId;
          const diffColors = getDifficultyColor(item.difficulty);
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/archetypes/${item.id}`)}
              className={`bg-[#1a1a1e] p-5 rounded-3xl mb-5 border ${
                isSelected
                  ? "border-[#fba613]/40 shadow-lg shadow-[#fba613]/5"
                  : "border-neutral-900"
              }`}
            >
              {/* Character Header & Badge */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-white font-spaceBold text-2xl">
                    {item.character}
                  </Text>
                  <Text className="text-neutral-400 font-spaceMedium text-xs mt-0.5">
                    {item.archetype}
                  </Text>
                </View>
                <View
                  className={`px-2.5 py-1 rounded-full border ${diffColors.bg} ${diffColors.border}`}
                >
                  <Text
                    className={`font-spaceBold text-[10px] uppercase tracking-wider ${diffColors.text}`}
                  >
                    {item.difficulty}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View className="flex-row justify-between items-center bg-neutral-950/40 rounded-2xl p-3.5 my-3.5 gap-2">
                <View className="flex-1 items-center">
                  <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider mb-0.5">
                    Body Fat
                  </Text>
                  <Text className="text-white font-spaceBold text-xs">
                    {item.targets.bodyFat}
                  </Text>
                </View>
                <View className="w-[1px] h-6 bg-neutral-900" />
                <View className="flex-1 items-center">
                  <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider mb-0.5">
                    Pull-ups
                  </Text>
                  <Text className="text-white font-spaceBold text-xs">
                    {item.targets.pullUps} reps
                  </Text>
                </View>
                <View className="w-[1px] h-6 bg-neutral-900" />
                <View className="flex-1 items-center">
                  <Text className="text-neutral-500 font-spaceBold text-[9px] uppercase tracking-wider mb-0.5">
                    Focus
                  </Text>
                  <Text
                    className="text-white font-spaceBold text-[10px] text-center"
                    numberOfLines={1}
                  >
                    {item.targets.focus.split(" + ")[0]}
                  </Text>
                </View>
              </View>

              {/* View Program Button */}
              <View className="bg-[#fba613]/10 border border-[#fba613]/25 py-3.5 rounded-2xl items-center">
                <Text className="text-[#fba613] font-spaceBold text-sm uppercase tracking-wider">
                  View Program
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleSkip}
          className="py-4 items-center justify-center mt-2 mb-8"
        >
          <Text className="text-neutral-500 font-spaceBold text-sm uppercase tracking-wider">
            CANCEL
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

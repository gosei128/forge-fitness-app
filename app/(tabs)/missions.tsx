import React, { useCallback, useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import { Sword, CheckCircle, Clock, Trophy, Target } from "lucide-react-native";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  getMissions,
  Mission,
  generateMissions,
} from "../../lib/missionEngine";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

function MissionProgressBar({ progress }: { progress: number }) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 1000,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  return (
    <View className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden mt-3">
      <Animated.View
        style={animatedStyle}
        className="h-full bg-secondary rounded-full"
      />
    </View>
  );
}

export default function MissionsScreen() {
  const [missionsList, setMissionsList] = useState<Mission[]>([]);
  const [stats, setStats] = useState<{
    currentLevel: number;
    totalXp: number;
    currentRank: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [daysLeft, setDaysLeft] = useState(7);

  // Calculate days left until next Monday reset
  useEffect(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const days = day === 0 ? 1 : 8 - day;
    setDaysLeft(days);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const users = await db.select().from(user).limit(1);
      if (users.length > 0) {
        const userId = users[0].id;

        // Ensure missions exist for this user first
        await generateMissions(userId);

        const activeMissions = await getMissions(userId);
        setMissionsList(activeMissions);

        const statRows = await db
          .select()
          .from(userStats)
          .where(eq(userStats.userId, userId))
          .limit(1);
        if (statRows.length > 0) {
          setStats(statRows[0]);
        }
      }
    } catch (error) {
      console.error("Error loading missions screen data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const completedCount = missionsList.filter(
    (m) => m.status === "completed",
  ).length;

  return (
    <View className="flex-1 bg-primary">
      <Header title="MISSIONS" />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f3ff47" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f3ff47"
              colors={["#f3ff47"]}
            />
          }
        >
          <Spacer height={15} />

          {/* Overview Panel */}
          <Animated.View
            entering={FadeIn.duration(400)}
            className="bg-tertiary/40 border border-white/5 p-5 rounded-3xl mb-6"
          >
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="font-spaceBold text-white text-2xl">
                  Weekly Ops
                </Text>
                <View className="flex-row items-center mt-1">
                  <Clock size={13} color="#888" />
                  <Text className="font-spaceRegular text-neutral-400 text-xs ml-1.5">
                    Resets in {daysLeft} {daysLeft === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <View className="bg-secondary/15 px-3.5 py-1.5 rounded-full border border-secondary/20">
                  <Text className="font-spaceBold text-secondary text-sm">
                    {completedCount} / {missionsList.length} Done
                  </Text>
                </View>
              </View>
            </View>

            {/* Level Info Banner */}
            {stats && (
              <View className="mt-4 pt-4 border-t border-white/5 flex-row justify-between items-center">
                <Text className="font-spaceMedium text-neutral-300 text-xs uppercase tracking-wider">
                  Level {stats.currentLevel} {stats.currentRank}
                </Text>
                <Text className="font-spaceRegular text-neutral-400 text-xs">
                  XP:{" "}
                  <Text className="font-spaceBold text-white">
                    {stats.totalXp}
                  </Text>
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Missions List */}
          <Text className="font-spaceBold text-white text-base uppercase tracking-wider mb-4">
            Active Contracts
          </Text>

          {missionsList.length === 0 ? (
            <View className="bg-tertiary/20 border border-dashed border-white/10 rounded-3xl py-12 px-6 items-center justify-center">
              <Target size={36} color="#888" className="opacity-55 mb-3" />
              <Text className="font-spaceBold text-white text-center mb-1">
                No active contracts
              </Text>
              <Text className="font-spaceRegular text-neutral-400 text-sm text-center">
                Pull down to refresh and fetch new missions.
              </Text>
            </View>
          ) : (
            missionsList.map((mission, index) => {
              const isCompleted = mission.status === "completed";
              const progress =
                mission.targetValue > 0
                  ? mission.currentValue / mission.targetValue
                  : 0;

              return (
                <Animated.View
                  key={mission.id}
                  entering={FadeInDown.delay(index * 100).duration(400)}
                  className={`p-5 rounded-3xl mb-4 border ${
                    isCompleted
                      ? "bg-secondary/5 border-secondary/20"
                      : "bg-tertiary/60 border-white/5"
                  }`}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center">
                        <View
                          className={`w-7 h-7 rounded-lg items-center justify-center mr-2.5 ${
                            isCompleted ? "bg-secondary/15" : "bg-neutral-800"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle size={16} color="#f3ff47" />
                          ) : (
                            <Sword size={15} color="#888" />
                          )}
                        </View>
                        <Text
                          className={`font-spaceBold text-base ${
                            isCompleted ? "text-secondary" : "text-white"
                          }`}
                        >
                          {mission.title}
                        </Text>
                      </View>

                      <Text className="font-spaceRegular text-neutral-400 text-sm mt-2.5 leading-5">
                        {mission.description}
                      </Text>
                    </View>

                    {/* Reward Badge */}
                    <View className="items-end">
                      <View className="bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-white/5 flex-row items-center">
                        <Trophy size={12} color="#fba613" />
                        <Text className="font-spaceBold text-neutral-200 text-xs ml-1">
                          +{mission.xpReward} XP
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Progress Indicator */}
                  <View className="mt-4 flex-row justify-between items-center">
                    <Text className="font-spaceMedium text-neutral-500 text-xs uppercase tracking-wider">
                      Progress
                    </Text>
                    <Text className="font-spaceBold text-neutral-300 text-xs">
                      {mission.currentValue} / {mission.targetValue}
                    </Text>
                  </View>

                  <MissionProgressBar progress={progress} />
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

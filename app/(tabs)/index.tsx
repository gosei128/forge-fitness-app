import React, { useCallback, useState, useEffect } from "react";
import { Text, View, Image, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import { Flame, Trophy, Dumbbell } from "lucide-react-native";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

/**
 * Animated Progress Bar for Level Card
 */
function AnimatedProgressBar({ progress }: { progress: number }) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progress, { duration: 1200 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  return (
    <View className="h-2 w-full bg-neutral-850 rounded-full overflow-hidden">
      <Animated.View
        style={animatedStyle}
        className="h-full bg-secondary rounded-full"
      />
    </View>
  );
}

/**
 * Animated Flame Icon with subtle pulsing
 */
function AnimatedFlame() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1.0, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Flame color={"#f3ff47"} fill={"#f3ff47"} size={16} />
    </Animated.View>
  );
}

/**
 * Animated Level number that fades and scales on update
 */
function AnimatedLevelNumber({ level }: { level: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = 0;
    scale.value = 0.7;
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withTiming(1, { duration: 500 });
  }, [level]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.Text
      style={animatedStyle}
      className="font-spaceBold text-white text-5xl mt-1 leading-none"
    >
      {level}
    </Animated.Text>
  );
}

/**
 * Helper to get user's title based on level
 */
function getLevelTitle(level: number): string {
  if (level < 3) return "Iron Discipline";
  if (level < 6) return "Bronze Challenger";
  if (level < 10) return "Silver Gladiator";
  if (level < 15) return "Gold Elite";
  if (level < 20) return "Platinum Master";
  return "Diamond Legend";
}

export default function Index() {
  const [stats, setStats] = useState<{
    currentLevel: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
  } | null>(null);

  // Fetch the actual stats when page is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadStats() {
        try {
          // Find first user
          const users = await db.select().from(user).limit(1);
          if (users.length > 0) {
            const userId = users[0].id;
            const res = await db
              .select()
              .from(userStats)
              .where(eq(userStats.userId, userId))
              .limit(1);
            if (res.length > 0 && isMounted) {
              setStats(res[0]);
            } else if (isMounted) {
              setStats({
                currentLevel: 1,
                totalXp: 0,
                currentStreak: 0,
                longestStreak: 0,
              });
            }
          } else if (isMounted) {
            setStats({
              currentLevel: 1,
              totalXp: 0,
              currentStreak: 0,
              longestStreak: 0,
            });
          }
        } catch (e) {
          console.error("Error loading stats on home screen:", e);
        }
      }
      loadStats();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const level = stats?.currentLevel ?? 1;
  const totalXp = stats?.totalXp ?? 0;
  const streak = stats?.currentStreak ?? 0;

  // Level XP range math:
  // Level L range starts at minXp and goes to maxXp (which is start of L+1)
  const minXp = level === 1 ? 0 : level * 500;
  const maxXp = (level + 1) * 500;
  const progress = Math.max(0, Math.min(1, (totalXp - minXp) / (maxXp - minXp)));

  return (
    <View className="flex-1 bg-primary">
      <Header title="FORGE" />
      <Spacer height={20} />

      <View className="flex-row items-end bg-tertiary p-2 space-x-3">
        {/* Character Image Container */}
        <View className="items-center justify-end">
          <Image
            className="relative left-0"
            source={require("../../assets/images/Sigmale.png")}
            style={{ height: 130, width: 130 }}
            resizeMode="contain"
          />
        </View>

        {/* Speech Bubble / Dialogue Box */}
        <View className="flex-1 bg-primary p-4 rounded-2xl rounded-bl-none relative">
          <Text className="font-spaceBold text-white text-xs uppercase tracking-wider mb-1 opacity-75">
            Sigma
          </Text>

          <Text className="font-spaceRegular text-white text-sm leading-relaxed">
            "Motivation gets you started, but discipline keeps you going. 💪
            Don't wait to feel like working out. Do it anyway. What's the game
            plan for today?"
          </Text>
        </View>
      </View>
      <Spacer height={20} />

      <ScrollView className="mx-4 flex-1">
        {/* Level Stats Card */}
        <View className="bg-tertiary border border-neutral-900 p-5 rounded-2xl overflow-hidden relative shadow-lg">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="font-spaceBold text-neutral-500 text-[10px] uppercase tracking-widest">
                Current Level
              </Text>
              <AnimatedLevelNumber level={level} />
              <View className="flex-row items-center justify-start gap-1.5 mt-2">
                <Trophy size={14} color="#f3ff47" />
                <Text className="font-spaceBold text-secondary text-sm">
                  {getLevelTitle(level)}
                </Text>
              </View>
            </View>

            {/* Streak Pill Badge */}
            <View className="flex-row items-center bg-primary/60 border border-secondary/20 rounded-full px-3 py-1.5 gap-1.5">
              <AnimatedFlame />
              <Text className="font-spaceBold text-xs text-secondary">
                {streak} {streak === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>

          {/* Progress Section */}
          <Spacer height={24} />
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="font-spaceRegular text-neutral-400 text-xs">
              {totalXp} XP
            </Text>
            <Text className="font-spaceRegular text-neutral-400 text-xs">
              {maxXp} XP
            </Text>
          </View>
          <AnimatedProgressBar progress={progress} />
        </View>

        {/* Active Missions */}
        <Spacer height={24} />
        <View className="flex-row justify-between items-center px-1">
          <Text className="font-spaceBold text-white text-lg">
            Active missions
          </Text>
          <Text className="font-spaceBold text-secondary text-xs">
            View all
          </Text>
        </View>
        <Spacer height={10} />

        {/* Mission 1 */}
        <View className="bg-tertiary border border-neutral-900 rounded-2xl p-4 mb-3 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-850">
                <Dumbbell size={16} color="#f3ff47" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-spaceBold text-sm mb-1.5">
                  Log 4 sessions this week
                </Text>
                <View className="h-1.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                  <View className="h-full bg-secondary rounded-full" style={{ width: '75%' }} />
                </View>
              </View>
            </View>
          </View>
          <Text className="text-secondary font-spaceBold text-xs">+150 XP</Text>
        </View>

        {/* Mission 2 */}
        <View className="bg-tertiary border border-neutral-900 rounded-2xl p-4 mb-8 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-850">
                <Trophy size={16} color="#f3ff47" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-spaceBold text-sm mb-1.5">
                  Hit a new PR this week
                </Text>
                <View className="h-1.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                  <View className="h-full bg-secondary rounded-full" style={{ width: '25%' }} />
                </View>
              </View>
            </View>
          </View>
          <Text className="text-secondary font-spaceBold text-xs">+200 XP</Text>
        </View>
      </ScrollView>
    </View>
  );
}

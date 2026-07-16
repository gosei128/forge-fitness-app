import React, { useCallback, useState, useEffect } from "react";
import {
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import AnimatedProgressBar from "../../components/AnimatedProgressBar";
import {
  Flame,
  Trophy,
  Dumbbell,
  Sword,
  Space,
  Check,
} from "lucide-react-native";
import { db } from "../../db";
import { user, userStats } from "../../db/schema";
import { eq } from "drizzle-orm";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { getMissions, Mission } from "../../lib/missionEngine";
import { getCoachLine } from "../../lib/coachEngine";

/**
 * Animated Flame Icon with subtle pulsing
 */
function AnimatedFlame() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1.0, { duration: 800 }),
      ),
      -1,
      true,
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
  const [currentLevel, setCurrentLevel] = useState(level);
  const [prevLevel, setPrevLevel] = useState(level);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (level !== currentLevel) {
      setPrevLevel(currentLevel);
      setCurrentLevel(level);
      translateY.value = 0;
      translateY.value = withSpring(
        -48,
        { damping: 15, stiffness: 120 },
        (finished) => {
          if (finished) {
            runOnJS(setPrevLevel)(level);
          }
        },
      );
    }
  }, [level, currentLevel]);

  const animatedStyle = useAnimatedStyle(() => {
    const activeTranslation = prevLevel === currentLevel ? 0 : translateY.value;
    return {
      transform: [{ translateY: activeTranslation }],
    };
  });

  return (
    <View style={{ height: 48, overflow: "hidden" }} className="mt-1">
      <Animated.View style={animatedStyle}>
        <Text
          style={{ height: 48 }}
          className="font-spaceBold text-white text-5xl leading-none"
        >
          {prevLevel}
        </Text>
        <Text
          style={{ height: 48 }}
          className="font-spaceBold text-white text-5xl leading-none"
        >
          {currentLevel}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function Index() {
  const [stats, setStats] = useState<{
    currentLevel: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    currentRank: string;
  } | null>(null);

  const [missionList, setMissionList] = useState<Mission[]>([]);
  const [coachLine, setCoachLine] = useState<string>(
    "Motivation gets you started, but discipline keeps you going. 💪",
  );

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
            const activeMissions = await getMissions(userId);
            setMissionList(activeMissions);
            const coachData = await getCoachLine(userId);
            if (isMounted) {
              setCoachLine(coachData.line);
            }
            if (res.length > 0 && isMounted) {
              setStats(res[0]);
            } else if (isMounted) {
              setStats({
                currentLevel: 1,
                totalXp: 0,
                currentStreak: 0,
                longestStreak: 0,
                currentRank: "Newbie",
              });
            }
          } else if (isMounted) {
            setStats({
              currentLevel: 1,
              totalXp: 0,
              currentStreak: 0,
              longestStreak: 0,
              currentRank: "Newbie",
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
    }, []),
  );

  const level = stats?.currentLevel ?? 1;
  const totalXp = stats?.totalXp ?? 0;
  const streak = stats?.currentStreak ?? 0;
  const rank = stats?.currentRank ?? "Newbie";

  // Level XP range math:
  // Level L range starts at minXp and goes to maxXp (which is start of L+1)
  const minXp = level === 1 ? 0 : level * 500;
  const maxXp = (level + 1) * 500;
  const progress = Math.max(
    0,
    Math.min(1, (totalXp - minXp) / (maxXp - minXp)),
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View className="flex-1 bg-primary">
        <Header title="FORGE" />

        <ScrollView className=" flex-1">
          {/* Level Stats Card */}
          <View className="flex-row items-end bg-tertiary/40 p-2 mb-5 space-x-3">
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
            <View className="flex-1 bg-primary p-4 rounded-2xl relative">
              <Text className="font-spaceBold text-white text-xs uppercase tracking-wider mb-1 opacity-75">
                Sigma
              </Text>

              <Text className="font-spaceRegular pl-3 text-white text-sm leading-relaxed">
                {coachLine}
              </Text>
            </View>
          </View>
          <View className="mx-4">
            <View className="bg-tertiary/40 border border-tertiary/40 p-5 rounded-2xl overflow-hidden relative shadow-lg">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="font-spaceBold text-neutral-500 text-[10px] uppercase tracking-widest">
                    Current Level
                  </Text>
                  <AnimatedLevelNumber level={level} />
                  <View className="flex-row items-center justify-start gap-1.5 mt-2">
                    <Trophy size={14} color="#f3ff47" />
                    <Text className="font-spaceBold text-secondary text-sm">
                      {rank}
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

            {/* Temporary Onboarding Test Button */}
            <Spacer height={16} />
            <Pressable
              onPress={() => router.push("/onboarding" as any)}
              className="bg-neutral-900 border border-amber-500/20 py-3.5 rounded-2xl flex-row justify-center items-center gap-2"
            >
              <Trophy size={14} color="#f59e0b" />
              <Text className="font-spaceBold text-amber-500 text-xs tracking-wider uppercase">
                Test Onboarding Flow
              </Text>
            </Pressable>

            {/* Active Missions */}
            <Spacer height={24} />
            <View className="flex-row justify-between items-center px-1">
              <Text className="font-spaceBold text-white text-lg">
                Active missions
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/missions")}
                className="flex-row items-center gap-1.5"
              >
                <Text className="font-spaceBold text-secondary text-xs">
                  View all
                </Text>
              </Pressable>
            </View>
            <Spacer height={10} />

            {/* Mission 1 */}
            {missionList.map((mission) => (
              <View
                key={mission.id}
                className={`${mission.completedAt ? "bg-tertiary/10 border-white/5" : "bg-tertiary/40"} border rounded-2xl p-4 mb-3 flex-row items-center justify-between`}
              >
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-3">
                    <View className=" p-2.5 rounded-xl border border-neutral-850">
                      {mission.completedAt ? (
                        <Check size={16} color="#f3ff47" />
                      ) : (
                        <Sword size={16} color="#f3ff47" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-spaceBold text-sm mb-1.5">
                        {mission.description}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-secondary font-spaceBold text-xs">
                  {mission.completedAt ? "Completed" : mission.xpReward + " XP"}
                </Text>
              </View>
            ))}
          </View>
          <Spacer height={100} />
        </ScrollView>
      </View>
    </>
  );
}

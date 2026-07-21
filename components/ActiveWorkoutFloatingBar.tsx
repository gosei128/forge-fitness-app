import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Vibration } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutSession } from "../context/WorkoutSessionContext";
import { Dumbbell, Timer, Coffee, ChevronUp } from "lucide-react-native";
import Animated, {
  SlideInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export default function ActiveWorkoutFloatingBar() {
  const insets = useSafeAreaInsets();
  const {
    isActive,
    isCollapsed,
    sessionName,
    currentExerciseName,
    elapsedTime,
    restTimeLeft,
    restDuration,
    isRestActive,
    expandSession,
  } = useWorkoutSession();
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value =
      isRestActive && restTimeLeft > 0
        ? withRepeat(withTiming(1, { duration: 900 }), -1, true)
        : withTiming(0, { duration: 180 });
  }, [glow, isRestActive, restTimeLeft]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.35 + glow.value * 0.25,
    shadowRadius: 10 + glow.value * 12,
    borderColor: isRestActive && restTimeLeft > 0 ? "#f59e0b" : "#f3ff47",
  }));

  // Only render if a session is active and currently collapsed
  if (!isActive || !isCollapsed) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePress = () => {
    Vibration.vibrate(10);
    expandSession();
  };

  const restProgress =
    isRestActive && restDuration > 0
      ? Math.max(0, Math.min(1, restTimeLeft / restDuration))
      : 0;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(180)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        glowStyle,
        {
          top: insets.top + 8,
        },
      ]}
      className="bg-tertiary border flex-row items-center px-4 py-3"
    >
      <Pressable
        onPress={handlePress}
        className="flex-1 flex-row items-center justify-between"
      >
        {/* Left Side: Workout Title & Timer */}
        <View className="flex-row items-center flex-1">
          <View className="bg-secondary/15 p-2 rounded-full mr-3 border border-secondary/20">
            <Dumbbell size={16} color="#f3ff47" />
          </View>
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-white font-spaceBold text-lg leading-tight"
            >
              {sessionName || "Active Workout"}
            </Text>
            <Text
              numberOfLines={1}
              className="text-neutral-300 font-spaceMedium text-[11px] mt-0.5"
            >
              {currentExerciseName || "Session in progress"}
            </Text>
            <View className="flex-row items-center mt-1">
              <Timer size={11} color="#9ca3af" className="mr-1" />
              <Text className="text-gray-400 font-spaceMedium text-[11px]">
                {formatTime(elapsedTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Middle/Right Side: Rest Timer if active */}
        {isRestActive && restTimeLeft > 0 && (
          <View className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex-row items-center mr-3">
            <Coffee size={12} color="#f59e0b" className="mr-1" />
            <Text className="text-amber-500 font-spaceBold text-xs">
              Rest: {restTimeLeft}s
            </Text>
          </View>
        )}

        {/* Right Side: Expand Action */}
        <View className="bg-neutral-800 p-1.5 rounded-full ml-1 border border-neutral-700">
          <ChevronUp size={14} color="#fff" />
        </View>
      </Pressable>
      {isRestActive && restTimeLeft > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${restProgress * 100}%`,
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    minHeight: 72,
    borderRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 9999, // Ensure it floats on top of everything
    overflow: "hidden",
  },
  progressTrack: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 7,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#f59e0b",
  },
});

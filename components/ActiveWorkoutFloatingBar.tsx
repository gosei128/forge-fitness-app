import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutSession } from "../context/WorkoutSessionContext";
import { Dumbbell, Timer, Coffee, ChevronUp } from "lucide-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

export default function ActiveWorkoutFloatingBar() {
  const insets = useSafeAreaInsets();
  const {
    isActive,
    isCollapsed,
    sessionName,
    elapsedTime,
    restTimeLeft,
    isRestActive,
    expandSession,
  } = useWorkoutSession();

  // Only render if a session is active and currently collapsed
  if (!isActive || !isCollapsed) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          top: insets.top + 8,
        },
      ]}
      className="bg-tertiary border h-20  border-primary rounded-2xl flex-row items-center px-4 py-3"
    >
      <Pressable
        onPress={expandSession}
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
              className="text-white font-spaceBold text-sm leading-tight"
            >
              {sessionName || "Active Workout"}
            </Text>
            <View className="flex-row items-center mt-0.5">
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 9999, // Ensure it floats on top of everything
  },
});

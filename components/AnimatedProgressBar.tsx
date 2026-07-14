import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export interface AnimatedProgressBarProps {
  progress: number;
}

export default function AnimatedProgressBar({ progress }: AnimatedProgressBarProps) {
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
    <View className="h-2 w-full bg-primary rounded-full overflow-hidden">
      <Animated.View
        style={animatedStyle}
        className="h-full bg-secondary rounded-full"
      />
    </View>
  );
}

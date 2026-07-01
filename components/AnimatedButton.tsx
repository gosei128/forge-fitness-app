import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type AnimatedButtonProps = Omit<PressableProps, "style"> & {
  title?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  textClassName?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
};

export default function AnimatedButton({
  title,
  children,
  style,
  className = "bg-secondary rounded-lg py-4 px-6 items-center justify-center flex-row",
  textClassName = "text-white font-spaceBold",
  icon,
  iconPosition = "left",
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.95);
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1);
    onPressOut?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[animatedStyle, style, disabled ? { opacity: 0.6 } : undefined]}
        className={className}
      >
        {icon && iconPosition === "left" ? (
          <View className="mr-2">{icon}</View>
        ) : null}
        {title ? <Text className={textClassName}>{title}</Text> : children}
        {icon && iconPosition === "right" ? (
          <View className="ml-2">{icon}</View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

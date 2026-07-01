import { StatusBar } from "expo-status-bar";
import { Button, Pressable } from "react-native";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { db } from "../../db";
import { exercises } from "../../db/schema";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Index() {
  return (
    <View className="flex-1 bg-primary justify-center items-center gap-4">
      <Text className="   text-white">
        Open up App.tsx to start working on your app!
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

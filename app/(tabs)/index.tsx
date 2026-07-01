import { StatusBar } from "expo-status-bar";
import { Text, View, StyleSheet } from "react-native";
import {Pressable} from "react-native";
import Animated, {useSharedValue, useAnimatedStyle, withTiming, withSpring} from "react-native-reanimated";

export default function Index() {
    const scale = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(()=>({
        transform : [{scale: scale.value}]
    }))
  return (
    <View className="flex-1 bg-primary justify-center items-center gap-4">
      <Text className="   text-white ">Dashboard</Text>
        <Pressable
                   onPressIn={() => (scale.value = withSpring(0.90))}
                   onPressOut={() => (scale.value = withSpring(1))} >
            <Animated.View style={[animatedStyle]} className="bg-secondary rounded-lg py-4 px-6 items-center">
                <Text className="text-white">Add Workout</Text>
            </Animated.View>
        </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}


import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import AnimatedButton from "../../components/AnimatedButton";

export default function Index() {
  return (
    <View className="flex-1 bg-primary justify-center items-center gap-4">
      <Text className="text-white">Dashboard</Text>
      <AnimatedButton
        title="Add Workout"
        onPress={() => console.log("Add Workout pressed")}
        className="bg-secondary rounded-lg py-4 px-6 items-center justify-center"
      />
      <StatusBar style="auto" />
    </View>
  );
}

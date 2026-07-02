import { StatusBar } from "expo-status-bar";
import { Text, View, Image } from "react-native";
import AnimatedButton from "../../components/AnimatedButton";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";

export default function Index() {
  return (
    <View className="flex-1 bg-primary ">
      <Header title="FORGE" />
      <Spacer height={20} />
      <View>
        <Text className="text-slate-400">MONDAY, JULY 1 2026</Text>
        <Text className="text-white">Good Afternoon Roni!</Text>
      </View>
      <View className="flex-row items-end bg-tertiary p-2 rounded-2xl space-x-3">
        {/* Character Image Container */}

        <View className="items-center justify-end">
          <Image
            className="relative left-0"
            source={require("../../assets/images/Sigmale.png")}
            style={{ height: 130, width: 130 }} // Slightly scaled down for better proportions
            resizeMode="contain"
          />
        </View>

        {/* Speech Bubble / Dialogue Box */}
        <View className="flex-1 bg-primary p-4 rounded-2xl rounded-bl-none relative">
          {/* Optional: Tiny chat bubble tail (pure CSS feel) */}
          <Text className="font-spaceBold text-white text-xs uppercase tracking-wider mb-1 opacity-75">
            Sigma
          </Text>

          <Text className="font-spaceRegular text-white text-sm leading-relaxed">
            "Motivation gets you started, but discipline keeps you going. 💪
            Don't wait to feel like working out. Do it anyway. What's the game
            plan for today?"
          </Text>
        </View>

        <Spacer height={20} />
        <View className="bg-secondary "></View>
      </View>
    </View>
  );
}

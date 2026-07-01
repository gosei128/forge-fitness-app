import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import Header from "../../components/Header";
const Workouts = () => {
    const insets = useSafeAreaInsets();
  return (
      <>
        <View className="flex-1 bg-primary">
            <Header title="Workouts" />

          <Text className={"text-3xl font-spaceBold text-white"}>Workouts</Text>
        </View>
      </>
  );
};
export default Workouts;
const styles = StyleSheet.create({});

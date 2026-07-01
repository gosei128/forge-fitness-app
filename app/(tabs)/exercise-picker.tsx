import { StyleSheet, Text, View } from "react-native";
import React from "react";

const ExercisePicker = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Picker</Text>
    </View>
  );
};

export default ExercisePicker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
});

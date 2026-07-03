import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";

const WorkoutLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="exercise-picker"
        options={{ headerShown: true, title: "Exercise Picker" }}
      />
      <Stack.Screen
        name="active-session"
        options={{
          headerShown: true,
          title: "Create new session",
          headerStyle: { backgroundColor: "#131316" },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontFamily: "SpaceGrotesk-Bold",
          },
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="edit-workout/[id]"
        options={{ headerShown: false, title: "Edit Workout" }}
      />
    </Stack>
  );
};
export default WorkoutLayout;
const styles = StyleSheet.create({});

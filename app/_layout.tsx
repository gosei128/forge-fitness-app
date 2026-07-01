import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import migration from "../drizzle/migrations";
import { db } from "../db";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import "../global.css";
import { seedExercises } from "../db/seed";
import { exercises } from "../db/schema";

const RootLayout = () => {
  const { success, error } = useMigrations(db, migration);

  return (
    <>
      <Stack>
        <Stack.Screen name={"(tabs)"} options={{ headerShown: false }} />
      </Stack>
    </>
  );
};
export default RootLayout;
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import migration from "../drizzle/migrations";
import { db } from "../db";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import "../global.css";
import { exercises } from "../db/schema";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { seedExercises } from "../db/seed";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const { success: migrationsSuccess, error: migrationsError } = useMigrations(
    db,
    migration,
  );

  const [fontsLoaded, fontsError] = useFonts({
    "SpaceGrotesk-Light": require("../assets/fonts/static/SpaceGrotesk-Light.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/static/SpaceGrotesk-Regular.ttf"),
    "SpaceGrotesk-Medium": require("../assets/fonts/static/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/static/SpaceGrotesk-SemiBold.ttf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/static/SpaceGrotesk-Bold.ttf"),
  });

  useEffect(() => {
    if (migrationsSuccess) {
      seedExercises()
        .then(() => console.log("Database seeded successfully"))
        .catch((err) => console.error("Database seeding failed:", err));
    }
  }, [migrationsSuccess]);

  useEffect(() => {
    if ((fontsLoaded || fontsError) && (migrationsSuccess || migrationsError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError, migrationsSuccess, migrationsError]);

  if (
    (!fontsLoaded && !fontsError) ||
    (!migrationsSuccess && !migrationsError)
  ) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name={"(tabs)"} options={{ headerShown: false }} />
        <Stack.Screen name={"(workouts)"} options={{ headerShown: false }} />
        <Stack.Screen
          name={"(workouts)/active-session"}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={"(workouts)/add-exercise"}
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
};
export default RootLayout;

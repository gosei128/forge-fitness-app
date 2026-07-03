import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import migration from "../drizzle/migrations";
import { db } from "../db";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import "../global.css";
import { exercises, user } from "../db/schema";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { seedExercises } from "../db/seed";
import Onboarding from "../components/Onboarding";
import { useState } from "react";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { WorkoutSessionProvider } from "../context/WorkoutSessionContext";
import ActiveWorkoutFloatingBar from "../components/ActiveWorkoutFloatingBar";

const RootLayout = () => {
  const { success: migrationsSuccess, error: migrationsError } = useMigrations(
    db,
    migration,
  );

  const [hasUser, setHasUser] = useState<boolean | null>(null);

  const [fontsLoaded, fontsError] = useFonts({
    "SpaceGrotesk-Light": require("../assets/fonts/static/SpaceGrotesk-Light.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/static/SpaceGrotesk-Regular.ttf"),
    "SpaceGrotesk-Medium": require("../assets/fonts/static/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/static/SpaceGrotesk-SemiBold.ttf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/static/SpaceGrotesk-Bold.ttf"),
  });

  useEffect(() => {
    let isMounted = true;

    if (migrationsSuccess) {
      seedExercises()
        .then(() => {
          console.log("Database seeded successfully");
          return db.select().from(user).limit(1);
        })
        .then((users) => {
          if (isMounted) {
            setHasUser(users.length > 0);
          }
        })
        .catch((err) => {
          console.error("Database seeding/user check failed:", err);
          if (isMounted) {
            setHasUser(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [migrationsSuccess]);

  useEffect(() => {
    if (
      (fontsLoaded || fontsError) &&
      (migrationsSuccess || migrationsError) &&
      hasUser !== null
    ) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError, migrationsSuccess, migrationsError, hasUser]);

  if (
    (!fontsLoaded && !fontsError) ||
    (!migrationsSuccess && !migrationsError) ||
    hasUser === null
  ) {
    return null;
  }

  if (!hasUser) {
    return <Onboarding onComplete={() => setHasUser(true)} />;
  }

  return (
    <WorkoutSessionProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: "#131316" },
          }}
        >
          <Stack.Screen name={"(tabs)"} options={{ headerShown: false }} />
          <Stack.Screen name={"(workouts)"} options={{ headerShown: false }} />
          <Stack.Screen name={"(exercises)"} options={{ headerShown: false }} />
        </Stack>
        <ActiveWorkoutFloatingBar />
      </View>
    </WorkoutSessionProvider>
  );
};
export default RootLayout;

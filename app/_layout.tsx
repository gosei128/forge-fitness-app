import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import migration from "../drizzle/migrations";
import { db } from "../db";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack, router } from "expo-router";
import "../global.css";
import { exercises, user } from "../db/schema";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { seedExercises, seedRanks } from "../db/seed";
import Onboarding from "../components/Onboarding";
import { useState } from "react";
import { generateMissions } from "../lib/missionEngine";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { WorkoutSessionProvider } from "../context/WorkoutSessionContext";
import ActiveWorkoutFloatingBar from "../components/ActiveWorkoutFloatingBar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { runSafeMigrations } from "../db/safeMigrator";

const RootLayout = () => {
  const [migrationsSuccess, setMigrationsSuccess] = useState(false);

  useEffect(() => {
    const success = runSafeMigrations();
    setMigrationsSuccess(success);
  }, []);

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
      Promise.all([seedExercises(), seedRanks()])
        .then(() => {
          console.log("Database seeded successfully");
          return db.select().from(user).limit(1);
        })
        .then(async (users) => {
          if (isMounted) {
            const exists = users.length > 0;
            setHasUser(exists);
            if (exists) {
              await generateMissions(users[0].id).catch((err) => {
                console.error("Missions generation on boot failed:", err);
              });
            }
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
    if ((fontsLoaded || fontsError) && migrationsSuccess && hasUser !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError, migrationsSuccess, hasUser]);

  if ((!fontsLoaded && !fontsError) || !migrationsSuccess || hasUser === null) {
    return null;
  }

  let content;
  if (!hasUser) {
    content = (
      <Onboarding
        onComplete={(navigateTo?: string) => {
          setHasUser(true);
          if (navigateTo) {
            setTimeout(() => {
              router.push(navigateTo as any);
            }, 50);
          }
        }}
      />
    );
  } else {
    content = (
      <WorkoutSessionProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: "#131316" },
            }}
          >
            <Stack.Screen name={"(tabs)"} options={{ headerShown: false }} />
            <Stack.Screen
              name={"(workouts)"}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={"(exercises)"}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={"archetypes"}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={"onboarding"}
              options={{ headerShown: false }}
            />
          </Stack>
          <ActiveWorkoutFloatingBar />
        </View>
      </WorkoutSessionProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {content}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
};
export default RootLayout;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Flame } from "lucide-react-native";
import { db } from "../db";
import { user, userStats } from "../db/schema";
import { desc } from "drizzle-orm";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<"splash" | "form">("splash");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  // Pulsing scale for splash logo
  const logoScale = useSharedValue(1);
  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
    };
  });

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      let userId: number;
      try {
        const insertedUser = await db.insert(user).values({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: "athlete@forge.com",
          remoteId: "default_user",
        }).returning({ id: user.id });
        userId = insertedUser[0].id;
      } catch (err) {
        await db.insert(user).values({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: "athlete@forge.com",
          remoteId: "default_user",
        });
        const users = await db.select().from(user).orderBy(desc(user.id)).limit(1);
        userId = users[0].id;
      }

      // 2. Initialize user stats
      await db.insert(userStats).values({
        userId,
        totalXp: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
      });

      // 3. Callback to update Root Layout state
      onComplete();
    } catch (e) {
      console.error("Error creating profile in onboarding:", e);
    } finally {
      setSaving(false);
    }
  };

  if (phase === "splash") {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(300)}
        className="flex-1 bg-primary justify-center items-center px-6"
      >
        <Animated.View style={logoAnimatedStyle} className="mb-6 items-center">
          <View className="bg-secondary/10 border-2 border-secondary p-6 rounded-full">
            <Flame color="#f3ff47" fill="#f3ff47" size={54} />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          className="text-white font-spaceBold text-5xl tracking-widest text-center"
        >
          FORGE
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(300).duration(500)}
          className="text-neutral-400 font-spaceRegular text-base text-center mt-4 mb-12 max-w-sm leading-relaxed"
        >
          Forge your ultimate physique with intelligent tracking, dynamic level ups, and automatic personal record recognition.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} className="w-full">
          <Pressable
            onPress={() => setPhase("form")}
            className="bg-secondary py-4 rounded-2xl items-center justify-center shadow-lg"
          >
            <Text className="text-black font-spaceBold text-lg uppercase tracking-wider">
              Get Started
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-primary"
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-8 items-center">
          <Text className="text-white font-spaceBold text-3xl text-center mb-2">
            Create Profile
          </Text>
          <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
            Enter your details to initialize your fitness statistics
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-neutral-400 font-spaceMedium text-xs uppercase mb-2 ml-1">
              First Name
            </Text>
            <TextInput
              placeholder="e.g. Roni"
              placeholderTextColor="#555"
              value={firstName}
              onChangeText={setFirstName}
              className="bg-tertiary border border-neutral-900 text-white rounded-2xl px-4 py-3.5 font-spaceBold text-base"
              editable={!saving}
            />
          </View>

          <View className="mt-4">
            <Text className="text-neutral-400 font-spaceMedium text-xs uppercase mb-2 ml-1">
              Last Name
            </Text>
            <TextInput
              placeholder="e.g. S."
              placeholderTextColor="#555"
              value={lastName}
              onChangeText={setLastName}
              className="bg-tertiary border border-neutral-900 text-white rounded-2xl px-4 py-3.5 font-spaceBold text-base"
              editable={!saving}
            />
          </View>
        </View>

        <View className="mt-10">
          <Pressable
            onPress={handleSaveProfile}
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className={`py-4 rounded-2xl items-center justify-center flex-row shadow-lg ${
              firstName.trim() && lastName.trim()
                ? "bg-secondary"
                : "bg-neutral-800 opacity-50"
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text className="text-black font-spaceBold text-lg uppercase tracking-wider">
                Complete Profile
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

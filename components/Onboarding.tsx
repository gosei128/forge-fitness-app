import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
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
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Flame } from "lucide-react-native";
import { db } from "../db";
import { user, userStats } from "../db/schema";
import { desc } from "drizzle-orm";
import {
  getAllArchetypes,
  type Archetype,
  selectArchetype,
} from "../lib/archetypes";

interface OnboardingProps {
  onComplete: (navigateTo?: string) => void;
}

// ─── Carousel Constants ──────────────────────────────────────
const CARD_HEIGHT = 170;
const CARD_GAP = 20;
const ITEM_SIZE = 100;

// ─── Character Image Map ─────────────────────────────────────
// Keyed by the `characterImage` field in archetypes.json.
// Metro requires static require() calls — paths must be literals.
const CHARACTER_IMAGES: Record<string, ReturnType<typeof require>> = {
  "character-achetypes/nightwing.png": require("../assets/character-achetypes/nightwing.png"),
  "character-achetypes/batman.png": require("../assets/character-achetypes/batman.png"),
  "character-achetypes/toji.png": require("../assets/character-achetypes/toji.png"),
};

// ─── Helpers ─────────────────────────────────────────────────
const getDifficultyColor = (diff: string) => {
  switch (diff.toLowerCase()) {
    case "beginner":
      return {
        text: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
      };
    case "intermediate":
      return {
        text: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
      };
    case "advanced":
      return {
        text: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
      };
    default:
      return {
        text: "text-neutral-400",
        bg: "bg-neutral-400/10",
        border: "border-neutral-400/20",
      };
  }
};

// ─── Carousel Card ───────────────────────────────────────────
function CarouselCard({
  item,
  index,
  scrollOffset,
  centerY,
}: {
  item: Archetype;
  index: number;
  scrollOffset: SharedValue<number>;
  centerY: SharedValue<number>;
}) {
  const diffColors = getDifficultyColor(item.difficulty);

  const animatedStyle = useAnimatedStyle(() => {
    const pos = index * ITEM_SIZE - scrollOffset.value;
    const absPos = Math.abs(pos);

    const scale = interpolate(
      absPos,
      [0, ITEM_SIZE],
      [1, 0.8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      absPos,
      [0, ITEM_SIZE, ITEM_SIZE * 2],
      [1, 0.35, 0.1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY: centerY.value + pos }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 200,
          left: 24,
          right: 24,
          height: "auto",
          zIndex: 5,
        },
        animatedStyle,
      ]}
    >
      <View className="bg-tertiary border border-neutral-700/60 rounded-3xl p-5  justify-between">
        <View>
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="text-white font-spaceBold text-3xl">
                {item.character}
              </Text>
              <Text className="text-neutral-400 font-spaceMedium text-xs mt-1">
                {item.archetype}
              </Text>
            </View>
            <View
              className={`px-2.5 py-1 rounded-full border ${diffColors.bg} ${diffColors.border}`}
            >
              <Text
                className={`font-spaceBold text-[10px] uppercase tracking-wider ${diffColors.text}`}
              >
                {item.difficulty}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Fade Gradient Overlay ───────────────────────────────────
function FadeOverlay({ position }: { position: "top" | "bottom" }) {
  const strips = 25;
  return (
    <View
      style={{
        position: "absolute",
        ...(position === "top" ? { top: 0 } : { bottom: 0 }),
        left: 0,
        right: 0,
        height: 180,
        zIndex: 15,
      }}
      pointerEvents="none"
    >
      {Array.from({ length: strips }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor:
              position === "top"
                ? `rgba(19, 19, 22, ${1 - i / strips})`
                : `rgba(19, 19, 22, ${i / strips})`,
          }}
        />
      ))}
    </View>
  );
}
// ─── Character Overlay Image ─────────────────────────────────
function CharacterOverlay({
  source,
}: {
  source: ReturnType<typeof require> | null;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(source ? 1 : 0, { duration: 400 });
  }, [source]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!source) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: -50,
        bottom: 100,
        width: 320,
        height: 700,
        opacity: 0.4,
        zIndex: 0,
      }}
    >
      <Animated.Image
        source={source}
        style={[{ width: "100%", height: "100%", opacity: 0.8 }, animStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

// ─── Main Onboarding ─────────────────────────────────────────
export default function Onboarding({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<"splash" | "form" | "character_select">(
    "splash",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const archetypes = getAllArchetypes();

  // ── Splash animation ──
  const logoScale = useSharedValue(1);
  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // ── Carousel gesture ──
  const scrollOffset = useSharedValue(0);
  const savedScrollOffset = useSharedValue(0);
  const centerY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      savedScrollOffset.value = scrollOffset.value;
    })
    .onUpdate((e) => {
      scrollOffset.value = savedScrollOffset.value - e.translationY;
    })
    .onEnd((e) => {
      const snapIndex = Math.round(scrollOffset.value / ITEM_SIZE);
      const clamped = Math.max(0, Math.min(snapIndex, archetypes.length - 1));
      scrollOffset.value = withSpring(clamped * ITEM_SIZE, {
        damping: 22,
        stiffness: 160,
        mass: 0.8,
      });
      runOnJS(setActiveIndex)(clamped);
    });

  const handleCarouselLayout = (e: any) => {
    centerY.value = e.nativeEvent.layout.height / 2 - CARD_HEIGHT / 2;
  };

  // ── Profile save ──
  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      try {
        await db
          .insert(user)
          .values({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: "athlete@forge.com",
            remoteId: "default_user",
          })
          .returning({ id: user.id });
      } catch (err) {
        await db.insert(user).values({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: "athlete@forge.com",
          remoteId: "default_user",
        });
      }

      const users = await db
        .select()
        .from(user)
        .orderBy(desc(user.id))
        .limit(1);
      const userId = users[0].id;

      await db.insert(userStats).values({
        userId,
        totalXp: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
      });

      setPhase("character_select");
    } catch (e) {
      console.error("Error creating profile in onboarding:", e);
    } finally {
      setSaving(false);
    }
  };

  // ─── SPLASH PHASE ──────────────────────────────────────────
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
          Forge your ultimate physique with intelligent tracking, dynamic level
          ups, and automatic personal record recognition.
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          className="w-full"
        >
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

  // ─── CHARACTER SELECT PHASE ──────────────────────────────────
  const activeArchetype = archetypes[activeIndex];
  const activeCharacterImage = activeArchetype?.characterImage
    ? CHARACTER_IMAGES[activeArchetype.characterImage]
    : null;

  if (phase === "character_select") {
    return (
      <View className="flex-1 bg-primary">
        <CharacterOverlay source={activeCharacterImage} />
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="pt-16 px-6 pb-2"
        >
          <Text className="text-white font-spaceBold text-3xl text-center mb-1">
            Choose Your Goal
          </Text>
          <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
            Your coach will build the path
          </Text>
        </Animated.View>

        {/* Carousel */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            entering={FadeIn.delay(200).duration(500)}
            style={{ flex: 1, overflow: "hidden" }}
            onLayout={handleCarouselLayout}
          >
            <FadeOverlay position="top" />

            {archetypes.map((item, index) => (
              <CarouselCard
                key={item.id}
                item={item}
                index={index}
                scrollOffset={scrollOffset}
                centerY={centerY}
              />
            ))}

            <FadeOverlay position="bottom" />
          </Animated.View>
        </GestureDetector>

        {/* Skip */}
        <Animated.View
          entering={FadeIn.delay(400).duration(400)}
          className="pb-10 pt-2 px-6"
        >
          <Pressable
            onPress={async () => {
              const activeItem = archetypes[activeIndex];
              if (activeItem) {
                try {
                  const users = await db
                    .select()
                    .from(user)
                    .orderBy(desc(user.id))
                    .limit(1);
                  if (users.length > 0) {
                    await selectArchetype(users[0].id, activeItem.id);
                  }
                } catch (err) {
                  console.error("Error saving selected archetype direct:", err);
                }
                onComplete();
              }
            }}
            className="bg-secondary py-4 rounded-2xl items-center justify-center shadow-lg mb-2"
          >
            <Text className="text-black font-spaceBold text-lg uppercase tracking-wider">
              Select
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onComplete()}
            className="py-4 items-center justify-center"
          >
            <Text className="text-neutral-500 font-spaceBold text-sm uppercase tracking-wider">
              Skip For Now
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ─── FORM PHASE ────────────────────────────────────────────
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

          <Pressable
            onPress={() => setPhase("character_select")}
            className="py-4 items-center justify-center mt-2"
          >
            <Text className="text-neutral-500 font-spaceBold text-sm uppercase tracking-wider">
              Skip For Now
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

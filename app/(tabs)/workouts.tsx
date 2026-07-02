import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import { PlusIcon, Trash2, Dumbbell, Sparkles } from "lucide-react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import { db } from "../../db";
import { exercises } from "../../db/schema";
import { inArray } from "drizzle-orm";
import ExerciseBottomSheet from "../../components/ExerciseBottomSheet";
import AnimatedButton from "../../components/AnimatedButton";
import { useWorkoutSession } from "../../context/WorkoutSessionContext";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
}

const TEMPLATES = [
  {
    id: "push",
    name: "Push Day",
    exercises: [
      "barbell bench press",
      "dumbbell seated shoulder press",
      "push-up",
    ],
    description: "Build chest, shoulders, and triceps strength",
  },
  {
    id: "pull",
    name: "Pull Day",
    exercises: ["pull-up", "barbell curl", "barbell deadlift"],
    description: "Focus on upper back, lats, and bicep thickness",
  },
  {
    id: "legs",
    name: "Leg Day",
    exercises: ["barbell full squat", "lever lying leg curl"],
    description: "Focus on quad power and hamstring development",
  },
];

const capitalize = (str: string) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const Workouts = () => {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const { isActive, startSession } = useWorkoutSession();

  // Tab State
  const [activeTab, setActiveTab] = useState<"templates" | "custom">(
    "templates",
  );
  const [tabContainerWidth, setTabContainerWidth] = useState(0);

  const activeTabOffset = useSharedValue(0);

  useEffect(() => {
    activeTabOffset.value = withSpring(activeTab === "templates" ? 0 : 1, {
      damping: 150,
      stiffness: 1200,
    });
  }, [activeTab]);

  const slidingPillStyle = useAnimatedStyle(() => {
    const padding = 6;
    const tabWidth =
      tabContainerWidth > 0 ? (tabContainerWidth - padding * 2) / 2 : 0;
    return {
      width: tabWidth,
      opacity: tabContainerWidth > 0 ? 1 : 0,
      transform: [
        {
          translateX: activeTabOffset.value * tabWidth,
        },
      ],
    };
  });

  // Custom Workout Builder State
  const [customTitle, setCustomTitle] = useState("");
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleOnPress = () => {
    // Starts or resumes an active session
    router.push("/(workouts)/active-session");
  };

  const handleStartTemplate = async (
    templateName: string,
    exerciseNames: string[],
  ) => {
    if (isActive) {
      Alert.alert(
        "Session in Progress",
        "You already have an active workout session running. Please finish or cancel it before starting a new template.",
        [
          { text: "View Active Session", onPress: () => router.push("/(workouts)/active-session") },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    try {
      const results = await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(inArray(exercises.name, exerciseNames));

      if (results.length === 0) {
        Alert.alert("Error", "No matching exercises found in the database.");
        return;
      }

      const ids = results.map((r) => r.id).join(",");
      router.push({
        pathname: "/(workouts)/active-session",
        params: { title: templateName, exerciseIds: ids },
      });
    } catch (e) {
      console.error("Error starting template:", e);
      Alert.alert("Error", "Could not start template session.");
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    // Add selected exercise to the custom template builder
    if (customExercises.some((ex) => ex.id === exercise.id)) {
      Alert.alert(
        "Already Added",
        `${exercise.name} is already in this session.`,
      );
      return;
    }
    setCustomExercises((prev) => [...prev, exercise]);
  };

  const handleRemoveCustomExercise = (id: number) => {
    setCustomExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleStartCustomSession = () => {
    if (customExercises.length === 0) {
      Alert.alert("No Exercises", "Please add at least one exercise to start.");
      return;
    }

    if (isActive) {
      Alert.alert(
        "Session in Progress",
        "You already have an active workout session running. Please finish or cancel it before starting a new custom session.",
        [
          { text: "View Active Session", onPress: () => router.push("/(workouts)/active-session") },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    const ids = customExercises.map((ex) => ex.id).join(",");
    router.push({
      pathname: "/(workouts)/active-session",
      params: { title: customTitle || "Custom Session", exerciseIds: ids },
    });

    // Reset fields on start
    setCustomTitle("");
    setCustomExercises([]);
  };

  return (
    <>
      <View className="flex-1 bg-primary">
        <Header title="Workouts" />
        <Spacer height={30} />
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View className="justify-between flex-row items-center mb-6">
            <Text className="text-3xl font-spaceBold text-white">Workouts</Text>
          </View>

          {/* Quick Start Button */}
          <Pressable
            onPress={handleOnPress}
            className="bg-secondary p-5 rounded-3xl mb-6 flex-row justify-between items-center"
          >
            <View>
              <Text className="text-black font-spaceBold text-xl mb-1">
                Quick Start
              </Text>
              <Text className="text-neutral-800 font-spaceRegular text-xs">
                Start an empty workout session
              </Text>
            </View>
            <View className="bg-black/10 p-3 rounded-full">
              <Dumbbell color="#000" size={24} />
            </View>
          </Pressable>

          {/* Tab Selector */}
          <View
            onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
            className="flex-row bg-tertiary p-1.5 rounded-2xl mb-6 border border-neutral-900 relative"
          >
            {/* Sliding background pill */}
            <Animated.View
              style={[
                slidingPillStyle,
                {
                  position: "absolute",
                  top: 6,
                  bottom: 6,
                  left: 6,
                },
              ]}
              className="bg-primary border border-neutral-850 rounded-xl"
            />

            <Pressable
              onPress={() => setActiveTab("templates")}
              className="flex-1 items-center py-3 rounded-xl z-10"
            >
              <Text
                className={`font-spaceBold text-sm ${
                  activeTab === "templates" ? "text-white" : "text-neutral-500"
                }`}
              >
                Templates
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("custom")}
              className="flex-1 items-center py-3 rounded-xl z-10"
            >
              <Text
                className={`font-spaceBold text-sm ${
                  activeTab === "custom" ? "text-white" : "text-neutral-500"
                }`}
              >
                Custom Builder
              </Text>
            </Pressable>
          </View>

          {/* Content Area */}
          {activeTab === "templates" ? (
            <Animated.View
              key="templates"
              entering={FadeInUp.duration(300)}
              className="pb-10"
            >
              {TEMPLATES.map((template) => (
                <View
                  key={template.id}
                  className="bg-tertiary border border-neutral-900 rounded-3xl p-5 mb-4"
                >
                  <Text className="text-white font-spaceBold text-xl mb-1">
                    {template.name}
                  </Text>
                  <Text className="text-neutral-400 font-spaceRegular text-xs mb-4">
                    {template.description}
                  </Text>

                  {/* Exercises List inside template */}
                  <View className="mb-4">
                    {template.exercises.map((ex, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center mb-2 ml-1"
                      >
                        <View className="w-1.5 h-1.5 rounded-full bg-secondary mr-3" />
                        <Text className="text-neutral-300 font-spaceMedium text-sm capitalize">
                          {ex}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={{ elevation: 5 }}
                    onPress={() =>
                      handleStartTemplate(template.name, template.exercises)
                    }
                    className="bg-secondary border border-secondary/20 active:bg-secondary py-3.5 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-tertiary font-spaceBold text-md">
                      Start Session
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          ) : (
            /* Custom Workout Builder Card */
            <Animated.View
              key="custom"
              entering={FadeInUp.duration(300)}
              className="bg-tertiary border border-neutral-900 rounded-3xl p-5 mb-10"
            >
              <View className="flex-row items-center gap-2 mb-4">
                <Sparkles size={16} color="#f3ff47" className="mr-2" />
                <Text className="text-white font-spaceBold text-lg">
                  Create Custom Session
                </Text>
              </View>

              {/* Title input */}
              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Session Title
              </Text>
              <TextInput
                placeholder="e.g. Heavy Upper Day"
                placeholderTextColor="#555"
                value={customTitle}
                onChangeText={setCustomTitle}
                className="bg-primary border border-neutral-900 text-white rounded-2xl px-4 py-3.5 font-spaceBold text-base mb-5"
              />

              {/* Exercises selector */}
              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Exercises
              </Text>

              {customExercises.length === 0 ? (
                <View className="bg-primary/20 border border-neutral-900 border-dashed rounded-2xl py-8 px-4 items-center justify-center mb-4">
                  <Text className="text-neutral-500 font-spaceRegular text-xs text-center">
                    No exercises added yet. Tap below to build your custom
                    routine.
                  </Text>
                </View>
              ) : (
                <View className="mb-4">
                  {customExercises.map((ex) => (
                    <View
                      key={ex.id}
                      className="flex-row justify-between items-center bg-primary/45 border border-neutral-900 rounded-2xl p-3.5 mb-2.5"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-white font-spaceBold text-sm">
                          {ex.name}
                        </Text>
                        <Text className="text-secondary font-spaceRegular text-[10px] capitalize mt-0.5">
                          {ex.muscleGroup}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveCustomExercise(ex.id)}
                        className="p-1"
                      >
                        <Trash2 size={16} color="#ff4a4a" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Exercise Dotted Button */}
              <Pressable
                onPress={() => setIsModalVisible(true)}
                className="border border-dashed border-neutral-700 active:border-secondary py-3.5 rounded-2xl items-center justify-center mb-5 flex-row"
              >
                <Text className="text-neutral-400 font-spaceBold text-sm">
                  + Add Exercise
                </Text>
              </Pressable>

              {/* Start Session Button */}
              <Pressable
                style={{ elevation: 5 }}
                onPress={handleStartCustomSession}
                className="bg-secondary py-4 rounded-2xl items-center justify-center flex-row active:opacity-90 shadow-lg"
              >
                <Text className="text-black font-spaceBold text-base">
                  Start Session
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
        <Spacer height={50} />
      </View>

      {/* Exercise Picker for Custom Builder */}
      <ExerciseBottomSheet
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectExercise={handleSelectExercise}
      />
    </>
  );
};

export default Workouts;

const styles = StyleSheet.create({});

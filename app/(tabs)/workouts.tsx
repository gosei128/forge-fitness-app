import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import Spacer from "../../components/Spacer";
import {
  PlusIcon,
  Trash2,
  Dumbbell,
  Sparkles,
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import { db } from "../../db";
import {
  exercises,
  user,
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sets,
} from "../../db/schema";
import { eq, desc, inArray } from "drizzle-orm";
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
    restTime: 60,
    weightUnit: "lbs",
  },
];

const capitalize = (str: string) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function formatDate(date: Date | null | number): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const Workouts = () => {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const { isActive } = useWorkoutSession();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "templates" | "custom" | "history"
  >("templates");
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const activeTabOffset = useSharedValue(0);

  // Dynamic Lists State
  const [loading, setLoading] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);

  // Custom Workout Builder State
  const [customTitle, setCustomTitle] = useState("");
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [customRest, setCustomRest] = useState(60);
  const [customUnit, setCustomUnit] = useState("lbs");
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    let tabIndex = 0;
    if (activeTab === "custom") tabIndex = 1;
    else if (activeTab === "history") tabIndex = 2;

    activeTabOffset.value = withSpring(tabIndex, {
      damping: 150,
      stiffness: 1200,
    });
  }, [activeTab]);

  const slidingPillStyle = useAnimatedStyle(() => {
    const padding = 6;
    const tabWidth =
      tabContainerWidth > 0 ? (tabContainerWidth - padding * 2) / 3 : 0;
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

  const handleOnPress = () => {
    // Starts an empty active session
    router.push("/(workouts)/active-session");
  };

  // Load custom templates and workout history from DB
  const loadTemplatesAndHistory = async () => {
    try {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) return;
      const userIdVal = users[0].id;

      // 1. Fetch custom templates
      const temps = await db
        .select()
        .from(workoutTemplates)
        .where(eq(workoutTemplates.userId, userIdVal));

      const templatesList = [];
      for (const temp of temps) {
        const tempExs = await db
          .select({ name: exercises.name })
          .from(templateExercises)
          .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
          .where(eq(templateExercises.templateId, temp.id))
          .orderBy(templateExercises.orderNumber);

        templatesList.push({
          id: `custom_${temp.id}`,
          dbId: temp.id,
          name: temp.name,
          exercises: tempExs.map((e) => e.name),
          restTime: temp.restTime,
          weightUnit: temp.weightUnit,
          description: `Custom Template · ${temp.weightUnit.toUpperCase()} · ${temp.restTime}s rest`,
          isCustom: true,
        });
      }
      setCustomTemplates(templatesList);

      // 2. Fetch completed workout history
      const historySessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userIdVal))
        .orderBy(desc(workoutSessions.completedAt));

      const sessionsWithSets = [];
      for (const sess of historySessions) {
        if (!sess.completedAt) continue;

        const sessionSets = await db
          .select({
            id: sets.id,
            weight: sets.weight,
            reps: sets.reps,
            setNumber: sets.setNumber,
            weightUnit: sets.weightUnit,
            exerciseName: exercises.name,
          })
          .from(sets)
          .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
          .where(eq(sets.sessionId, sess.id))
          .orderBy(sets.setNumber);

        // Group sets by exercise
        const groupedExercises: { [key: string]: typeof sessionSets } = {};
        for (const setRow of sessionSets) {
          if (!groupedExercises[setRow.exerciseName]) {
            groupedExercises[setRow.exerciseName] = [];
          }
          groupedExercises[setRow.exerciseName].push(setRow);
        }

        sessionsWithSets.push({
          ...sess,
          exercises: Object.entries(groupedExercises).map(
            ([name, setsList]) => ({
              name,
              sets: setsList,
            }),
          ),
        });
      }
      setWorkoutHistory(sessionsWithSets);
    } catch (e) {
      console.error("Error loading templates/history:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTemplatesAndHistory();
    }, []),
  );

  const handleStartTemplate = async (
    templateName: string,
    exerciseNames: string[],
    restTime: number = 60,
    weightUnit: string = "lbs",
  ) => {
    if (isActive) {
      Alert.alert(
        "Session in Progress",
        "You already have an active workout session running. Please finish or cancel it before starting a new template.",
        [
          {
            text: "View Active Session",
            onPress: () => router.push("/(workouts)/active-session"),
          },
          { text: "Cancel", style: "cancel" },
        ],
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
        params: {
          title: templateName,
          exerciseIds: ids,
          restTime: restTime.toString(),
          weightUnit: weightUnit,
        },
      });
    } catch (e) {
      console.error("Error starting template:", e);
      Alert.alert("Error", "Could not start template session.");
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
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

  const handleSaveCustomTemplate = async () => {
    if (!customTitle.trim()) {
      Alert.alert("Error", "Please enter a template title.");
      return;
    }
    if (customExercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise.");
      return;
    }

    try {
      const users = await db.select().from(user).limit(1);
      if (users.length === 0) return;
      const userIdVal = users[0].id;

      let templateIdVal: number;
      try {
        const inserted = await db
          .insert(workoutTemplates)
          .values({
            userId: userIdVal,
            name: customTitle.trim(),
            restTime: customRest,
            weightUnit: customUnit,
          })
          .returning({ id: workoutTemplates.id });
        templateIdVal = inserted[0].id;
      } catch (err) {
        await db.insert(workoutTemplates).values({
          userId: userIdVal,
          name: customTitle.trim(),
          restTime: customRest,
          weightUnit: customUnit,
        });
        const temps = await db
          .select()
          .from(workoutTemplates)
          .where(eq(workoutTemplates.userId, userIdVal))
          .orderBy(desc(workoutTemplates.createdAt))
          .limit(1);
        templateIdVal = temps[0].id;
      }

      for (let i = 0; i < customExercises.length; i++) {
        await db.insert(templateExercises).values({
          templateId: templateIdVal,
          exerciseId: customExercises[i].id,
          orderNumber: i + 1,
        });
      }

      Alert.alert(
        "Success",
        "Template created successfully! Tapping it under Templates will start your session.",
      );

      setCustomTitle("");
      setCustomExercises([]);
      setCustomRest(60);
      setCustomUnit("lbs");
      setActiveTab("templates");
      loadTemplatesAndHistory();
    } catch (e) {
      console.error("Error saving template:", e);
      Alert.alert("Error", "Could not save template.");
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this custom template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await db
                .delete(templateExercises)
                .where(eq(templateExercises.templateId, templateId));
              await db
                .delete(workoutTemplates)
                .where(eq(workoutTemplates.id, templateId));
              loadTemplatesAndHistory();
            } catch (err) {
              console.error("Error deleting template:", err);
            }
          },
        },
      ],
    );
  };

  const allTemplates = [...TEMPLATES, ...customTemplates];

  return (
    <>
      <View className="flex-1 bg-primary">
        <Header title="Workouts" />
        <Spacer height={30} />

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
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
                Builder
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("history")}
              className="flex-1 items-center py-3 rounded-xl z-10"
            >
              <Text
                className={`font-spaceBold text-sm ${
                  activeTab === "history" ? "text-white" : "text-neutral-500"
                }`}
              >
                History
              </Text>
            </Pressable>
          </View>

          {/* Content Area */}
          {loading ? (
            <View className="py-20 justify-center items-center">
              <ActivityIndicator size="large" color="#f3ff47" />
            </View>
          ) : activeTab === "templates" ? (
            <Animated.View
              key="templates"
              entering={FadeInUp.duration(300)}
              className="pb-10"
            >
              {allTemplates.map((template) => (
                <View
                  key={template.id}
                  className="bg-tertiary border border-neutral-900 rounded-3xl p-5 mb-4 relative"
                >
                  {/* Delete button for custom templates */}
                  {template.isCustom && (
                    <Pressable
                      onPress={() => handleDeleteTemplate(template.dbId)}
                      className="absolute top-5 right-5 p-1"
                    >
                      <Trash2 size={16} color="#ff4a4a" />
                    </Pressable>
                  )}

                  <Text className="text-white font-spaceBold text-xl mb-1">
                    {template.name}
                  </Text>
                  <Text className="text-neutral-400 font-spaceRegular text-xs mb-4">
                    {template.description}
                  </Text>

                  {/* Exercises List */}
                  <View className="mb-4">
                    {template.exercises.map((ex: string, idx: number) => (
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
                      handleStartTemplate(
                        template.name,
                        template.exercises,
                        template.restTime,
                        template.weightUnit,
                      )
                    }
                    className="bg-secondary active:opacity-90 py-3.5 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-tertiary font-spaceBold text-md">
                      Start Session
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          ) : activeTab === "custom" ? (
            /* Custom Template Builder */
            <Animated.View
              key="custom"
              entering={FadeInUp.duration(300)}
              className="bg-tertiary border border-neutral-900 rounded-3xl p-5 mb-10"
            >
              <View className="flex-row items-center gap-2 mb-4">
                <Sparkles size={16} color="#f3ff47" className="mr-2" />
                <Text className="text-white font-spaceBold text-lg">
                  Create Workout Template
                </Text>
              </View>

              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Template Name
              </Text>
              <TextInput
                placeholder="e.g. Strength Chest Day"
                placeholderTextColor="#555"
                value={customTitle}
                onChangeText={setCustomTitle}
                className="bg-primary border border-neutral-900 text-white rounded-2xl px-4 py-3.5 font-spaceBold text-base mb-5"
              />

              {/* Configurable Rest Time */}
              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Rest Timer (seconds)
              </Text>
              <View className="flex-row gap-2 mb-5">
                {[30, 60, 90, 120].map((sec) => (
                  <Pressable
                    key={sec}
                    onPress={() => setCustomRest(sec)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      customRest === sec
                        ? "bg-secondary/15 border-secondary"
                        : "bg-primary border-neutral-900"
                    }`}
                  >
                    <Text
                      className={`font-spaceBold text-xs ${
                        customRest === sec
                          ? "text-secondary font-bold"
                          : "text-neutral-400"
                      }`}
                    >
                      {sec}s
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Weight Unit Selection */}
              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Weight Unit Option
              </Text>
              <View className="flex-row gap-2 mb-6">
                {["lbs", "kg", "bodyweight"].map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setCustomUnit(unit)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      customUnit === unit
                        ? "bg-secondary/15 border-secondary"
                        : "bg-primary border-neutral-900"
                    }`}
                  >
                    <Text
                      className={`font-spaceBold text-xs uppercase ${
                        customUnit === unit
                          ? "text-secondary font-bold"
                          : "text-neutral-400"
                      }`}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-neutral-500 font-spaceBold text-[10px] uppercase tracking-wider mb-2">
                Exercises
              </Text>

              {customExercises.length === 0 ? (
                <View className="bg-primary/20 border border-neutral-900 border-dashed rounded-2xl py-8 px-4 items-center justify-center mb-4">
                  <Text className="text-neutral-500 font-spaceRegular text-xs text-center">
                    No exercises added yet. Tap below to build your template.
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

              <Pressable
                onPress={() => setIsModalVisible(true)}
                className="border border-dashed border-neutral-700 active:border-secondary py-3.5 rounded-2xl items-center justify-center mb-6 flex-row"
              >
                <Text className="text-neutral-400 font-spaceBold text-sm">
                  + Add Exercise
                </Text>
              </Pressable>

              <Pressable
                style={{ elevation: 5 }}
                onPress={handleSaveCustomTemplate}
                className="bg-secondary py-4 rounded-2xl items-center justify-center flex-row active:opacity-90 shadow-lg"
              >
                <Text className="text-black font-spaceBold text-base uppercase tracking-wider">
                  Save as Template
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            /* Workout History Viewer */
            <Animated.View
              key="history"
              entering={FadeInUp.duration(300)}
              className="pb-12"
            >
              {workoutHistory.length === 0 ? (
                <View className="bg-tertiary border border-neutral-900 border-dashed rounded-3xl p-8 items-center justify-center">
                  <Dumbbell size={36} color="#444" className="mb-2" />
                  <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
                    No workout sessions recorded yet. Finish a workout to log
                    history!
                  </Text>
                </View>
              ) : (
                workoutHistory.map((session) => (
                  <View
                    key={session.id}
                    className="bg-tertiary border border-neutral-900 rounded-3xl p-5 mb-4"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-white font-spaceBold text-lg">
                          {session.name || "Workout Session"}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <Calendar size={12} color="#888" />
                          <Text className="text-neutral-500 font-spaceMedium text-[10px]">
                            {formatDate(session.completedAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                        <Text className="text-secondary font-spaceBold text-[10px]">
                          +{session.totalXpEarned} XP
                        </Text>
                      </View>
                    </View>

                    {/* Rest Time */}
                    <View className="flex-row items-center gap-1.5 mb-4 border-b border-neutral-900 pb-3">
                      <Clock size={12} color="#888" />
                      <Text className="text-neutral-500 font-spaceMedium text-[10px]">
                        Rest duration: {session.restTime} seconds
                      </Text>
                    </View>

                    {/* Grouped Exercises */}
                    <View className="space-y-3">
                      {session.exercises.map((ex: any, idx: number) => (
                        <View key={idx}>
                          <Text className="text-white font-spaceBold text-sm capitalize mb-1">
                            {ex.name}
                          </Text>
                          <View className="flex-row flex-wrap gap-2 ml-1">
                            {ex.sets.map((set: any, sIdx: number) => (
                              <View
                                key={set.id}
                                className="bg-primary border border-neutral-850 px-2 py-1 rounded-lg"
                              >
                                <Text className="text-neutral-400 font-spaceRegular text-[10px]">
                                  Set {sIdx + 1}:{" "}
                                  <Text className="text-secondary font-spaceBold">
                                    {set.weight} {set.weightUnit}
                                  </Text>{" "}
                                  x {set.reps} reps
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </Animated.View>
          )}
        </ScrollView>
        <Spacer height={70} />
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

import React, { useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Trash2, Check, Dumbbell, Play, X } from "lucide-react-native";
import { db } from "../../db";
import { user, workoutSessions, sets, exercises } from "../../db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import AnimatedButton from "../../components/AnimatedButton";
import ExerciseBottomSheet from "../../components/ExerciseBottomSheet";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
}

interface LoggedSet {
  id: number;
  weight: string;
  reps: string;
  isCompleted: boolean;
}

interface SelectedExercise extends Exercise {
  sets: LoggedSet[];
}

const capitalize = (str: string) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ActiveSession() {
  const params = useLocalSearchParams();
  const { title, exerciseIds } = params;

  const [sessionName, setSessionName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(new Date());

  // Setup default session name based on time of day or params
  useEffect(() => {
    if (title && typeof title === "string") {
      setSessionName(title);
    } else {
      const hours = new Date().getHours();
      let timeOfDay = "Workout";
      if (hours < 12) timeOfDay = "Morning Workout";
      else if (hours < 17) timeOfDay = "Afternoon Workout";
      else timeOfDay = "Evening Workout";

      setSessionName(timeOfDay);
    }
  }, [title]);

  // Preload exercises if passed in search parameters
  useEffect(() => {
    if (exerciseIds && typeof exerciseIds === "string") {
      const ids = exerciseIds.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) {
        const fetchPreloadedExercises = async () => {
          try {
            const results = await db
              .select()
              .from(exercises)
              .where(inArray(exercises.id, ids));

            const loaded = ids
              .map((id) => {
                const ex = results.find((r) => r.id === id);
                if (ex) {
                  return {
                    ...ex,
                    sets: [
                      {
                        id: Date.now() + Math.random(),
                        weight: "",
                        reps: "",
                        isCompleted: false,
                      },
                    ],
                  };
                }
                return null;
              })
              .filter(Boolean) as SelectedExercise[];

            setSelectedExercises(loaded);
          } catch (e) {
            console.error("Error preloading exercises:", e);
          }
        };

        fetchPreloadedExercises();
      }
    }
  }, [exerciseIds]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectExercise = (exercise: Exercise) => {
    // Add exercise with an initial set
    setSelectedExercises((prev) => [
      ...prev,
      {
        ...exercise,
        sets: [{ id: Date.now(), weight: "", reps: "", isCompleted: false }],
      },
    ]);
  };

  const handleAddSet = (exerciseId: number) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: Date.now(),
                // Pre-fill weight and reps from the last set for better UX
                weight: lastSet ? lastSet.weight : "",
                reps: lastSet ? lastSet.reps : "",
                isCompleted: false,
              },
            ],
          };
        }
        return ex;
      })
    );
  };

  const handleUpdateSet = (
    exerciseId: number,
    setId: number,
    fields: Partial<LoggedSet>
  ) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === setId ? { ...s, ...fields } : s
            ),
          };
        }
        return ex;
      })
    );
  };

  const handleRemoveSet = (exerciseId: number, setId: number) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.filter((s) => s.id !== setId),
          };
        }
        return ex;
      })
    );
  };

  const handleRemoveExercise = (exerciseId: number) => {
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise and all its sets?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedExercises((prev) =>
              prev.filter((ex) => ex.id !== exerciseId)
            );
          },
        },
      ]
    );
  };

  const ensureUser = async () => {
    const users = await db.select().from(user).limit(1);
    if (users.length > 0) {
      return users[0].id;
    }

    // Insert a default user
    await db.insert(user).values({
      firstName: "Forge",
      lastName: "Athlete",
      email: "athlete@forge.com",
      remoteId: "default_user",
    });

    const updatedUsers = await db.select().from(user).limit(1);
    return updatedUsers[0].id;
  };

  const handleFinishSession = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert("Empty Workout", "Please add at least one exercise before saving.");
      return;
    }

    const completedSetsCount = selectedExercises.reduce(
      (acc, curr) => acc + curr.sets.filter((s) => s.isCompleted).length,
      0
    );

    if (completedSetsCount === 0) {
      Alert.alert(
        "No Sets Completed",
        "You haven't marked any sets as completed. Save anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Anyway", onPress: () => saveSessionToDb() },
        ]
      );
    } else {
      saveSessionToDb();
    }
  };

  const saveSessionToDb = async () => {
    try {
      const userIdVal = await ensureUser();
      const completedSetsCount = selectedExercises.reduce(
        (acc, curr) => acc + curr.sets.filter((s) => s.isCompleted).length,
        0
      );
      const xpEarned = completedSetsCount * 10; // 10 XP per completed set

      // Insert workout session
      let sessionIdVal: number;
      try {
        const inserted = await db
          .insert(workoutSessions)
          .values({
            name: sessionName || "Workout Session",
            userId: userIdVal,
            startedAt: startTime,
            completedAt: new Date(),
            totalXpEarned: xpEarned,
          })
          .returning({ id: workoutSessions.id });
        sessionIdVal = inserted[0].id;
      } catch (err) {
        // Fallback query if returning is not supported by driver
        await db.insert(workoutSessions).values({
          name: sessionName || "Workout Session",
          userId: userIdVal,
          startedAt: startTime,
          completedAt: new Date(),
          totalXpEarned: xpEarned,
        });

        const sessions = await db
          .select()
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, userIdVal))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(1);
        sessionIdVal = sessions[0].id;
      }

      // Insert all completed sets
      for (const ex of selectedExercises) {
        // We log all sets, but we can prioritize weight/reps values or check completion
        const setsToInsert = ex.sets.map((s, index) => ({
          sessionId: sessionIdVal,
          exerciseId: ex.id,
          weight: parseInt(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          setNumber: index + 1,
          isPr: false,
          createdAt: new Date(),
        }));

        if (setsToInsert.length > 0) {
          await db.insert(sets).values(setsToInsert);
        }
      }

      Alert.alert("Workout Saved", `Completed successfully! Earned ${xpEarned} XP.`, [
        {
          text: "Done",
          onPress: () => {
            router.replace("/(tabs)/workouts");
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving workout session:", error);
      Alert.alert("Error", "Failed to save workout session. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-primary"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={handleFinishSession}
              className="bg-secondary px-4 py-2 rounded-full"
            >
              <Text className="text-black font-spaceBold text-sm">Finish</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 px-5 pt-4">
        {/* Workout Info Box */}
        <View className="bg-tertiary border border-neutral-900 rounded-2xl p-5 mb-5">
          <TextInput
            placeholder="New Session Name"
            placeholderTextColor="#888"
            value={sessionName}
            onChangeText={setSessionName}
            className="text-white font-spaceBold text-2xl mb-2"
          />
          <View className="flex-row items-center">
            <Play size={14} color="#f3ff47" className="mr-1.5" />
            <Text className="text-secondary font-spaceBold text-sm">
              {formatTime(elapsedTime)}
            </Text>
            <Text className="text-neutral-500 font-spaceRegular text-xs ml-3">
              Active Session
            </Text>
          </View>
        </View>

        {/* Exercises List */}
        {selectedExercises.length === 0 ? (
          <View className="items-center justify-center py-16 px-4 bg-tertiary/20 rounded-3xl border border-neutral-900/50 border-dashed mb-5">
            <Dumbbell size={48} color="#444" className="mb-3" />
            <Text className="text-white font-spaceBold text-lg mb-1">
              Add Exercises
            </Text>
            <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
              Your workout is empty. Tap the button below to select exercises from the database.
            </Text>
          </View>
        ) : (
          selectedExercises.map((exercise) => (
            <View
              key={exercise.id}
              className="bg-tertiary border border-neutral-900 rounded-2xl p-4 mb-4"
            >
              {/* Exercise Header */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-white font-spaceBold text-lg">
                    {exercise.name}
                  </Text>
                  <View className="bg-secondary/15 px-2 py-0.5 rounded self-start mt-1">
                    <Text className="text-secondary font-spaceMedium text-[10px]">
                      {capitalize(exercise.muscleGroup)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRemoveExercise(exercise.id)}
                  className="p-1"
                >
                  <Trash2 size={18} color="#ff4a4a" />
                </Pressable>
              </View>

              {/* Table Column Headers */}
              <View className="flex-row items-center mb-2 px-1">
                <Text className="text-neutral-500 font-spaceBold text-xs w-[40px] text-center">
                  SET
                </Text>
                <Text className="text-neutral-500 font-spaceBold text-xs flex-1 text-center">
                  LBS
                </Text>
                <Text className="text-neutral-500 font-spaceBold text-xs flex-1 text-center">
                  REPS
                </Text>
                <Text className="text-neutral-500 font-spaceBold text-xs w-[50px] text-center">
                  DONE
                </Text>
              </View>

              {/* Set Rows */}
              {exercise.sets.map((set, index) => (
                <View
                  key={set.id}
                  className="flex-row items-center mb-2 px-1"
                >
                  {/* Set number */}
                  <View className="w-[40px] items-center">
                    <Text className="text-white font-spaceMedium text-sm">
                      {index + 1}
                    </Text>
                  </View>

                  {/* Weight input */}
                  <TextInput
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={set.weight}
                    onChangeText={(val) =>
                      handleUpdateSet(exercise.id, set.id, { weight: val })
                    }
                    className="bg-primary flex-1 mx-1.5 py-1.5 rounded-lg text-white text-center font-spaceBold text-sm border border-neutral-900"
                  />

                  {/* Reps input */}
                  <TextInput
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={set.reps}
                    onChangeText={(val) =>
                      handleUpdateSet(exercise.id, set.id, { reps: val })
                    }
                    className="bg-primary flex-1 mx-1.5 py-1.5 rounded-lg text-white text-center font-spaceBold text-sm border border-neutral-900"
                  />

                  {/* Complete Checkbox & Delete */}
                  <View className="w-[50px] flex-row justify-center items-center">
                    <Pressable
                      onPress={() =>
                        handleUpdateSet(exercise.id, set.id, {
                          isCompleted: !set.isCompleted,
                        })
                      }
                      className={`w-6 h-6 rounded-full items-center justify-center border ${
                        set.isCompleted
                          ? "bg-secondary border-secondary"
                          : "border-neutral-700 bg-primary"
                      }`}
                    >
                      {set.isCompleted && <Check size={14} color="#000" />}
                    </Pressable>
                    {exercise.sets.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveSet(exercise.id, set.id)}
                        className="ml-2"
                      >
                        <X size={14} color="#ff4a4a" />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}

              {/* Add Set Text Button */}
              <Pressable
                onPress={() => handleAddSet(exercise.id)}
                className="mt-2 self-start"
              >
                <Text className="text-secondary font-spaceBold text-sm">
                  + Add Set
                </Text>
              </Pressable>
            </View>
          ))
        )}

        {/* Add Exercise Trigger Button */}
        <AnimatedButton
          title="ADD EXERCISE"
          onPress={() => setIsModalVisible(true)}
          className="bg-transparent border border-white/20 py-4 rounded-2xl items-center justify-center mb-10 flex-row"
          textClassName="text-white font-spaceBold text-lg"
          icon={<PlusIcon color="white" size={20} />}
        />
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExerciseBottomSheet
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectExercise={handleSelectExercise}
      />
    </KeyboardAvoidingView>
  );
}

// Quick helper to cover styling or icon dependencies without import error
const PlusIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
    <Text style={{ color, fontSize: size, fontWeight: "bold", top: -1 }}>+</Text>
  </View>
);

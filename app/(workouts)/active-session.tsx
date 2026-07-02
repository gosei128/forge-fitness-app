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
import { Stack, useLocalSearchParams, useNavigation } from "expo-router";
import {
  Trash2,
  Check,
  Dumbbell,
  Play,
  X,
  ChevronDown,
  Coffee,
  Clock,
} from "lucide-react-native";
import AnimatedButton from "../../components/AnimatedButton";
import ExerciseBottomSheet from "../../components/ExerciseBottomSheet";
import { useWorkoutSession } from "../../context/WorkoutSessionContext";

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
  const navigation = useNavigation();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    isActive,
    sessionName,
    setSessionName,
    elapsedTime,
    selectedExercises,
    startSession,
    collapseSession,
    finishSession,
    cancelSession,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    restTimeLeft,
    customRestDuration,
    isRestActive,
    setCustomRestDuration,
    stopRestTimer,
  } = useWorkoutSession();

  // Initialize session in global context on mount if it's not already active
  useEffect(() => {
    if (!isActive) {
      const titleStr = typeof title === "string" ? title : "";
      const idsStr = typeof exerciseIds === "string" ? exerciseIds : "";
      startSession(titleStr, idsStr);
    }
  }, [isActive, title, exerciseIds]);

  // Block exiting the screen during an active workout session
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isActive) {
        // Prevent default navigation back/exit behavior
        e.preventDefault();
        Alert.alert(
          "Active Session Running",
          "You cannot exit the workout screen. Tap the down arrow in the top-left to minimize the session and browse the app, or Finish/Cancel the session.",
          [{ text: "OK", style: "cancel" }],
        );
      }
    });

    return unsubscribe;
  }, [navigation, isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-primary"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: sessionName || "Active Session",
          headerRight: () => {
            const hasCompletedExercise = selectedExercises.some((ex) =>
              ex.sets.some((s) => s.isCompleted),
            );
            return (
              <Pressable
                onPress={finishSession}
                disabled={!hasCompletedExercise}
                className={`px-4 py-2 rounded-full ${
                  hasCompletedExercise
                    ? "bg-secondary"
                    : "bg-neutral-800 opacity-50"
                }`}
              >
                <Text
                  className={`font-spaceBold text-sm ${
                    hasCompletedExercise ? "text-black" : "text-neutral-500"
                  }`}
                >
                  Finish
                </Text>
              </Pressable>
            );
          },
          headerLeft: () => (
            <Pressable
              onPress={collapseSession}
              className="bg-tertiary border border-neutral-800 p-2 rounded-full mr-2"
            >
              <ChevronDown size={18} color="#fff" />
            </Pressable>
          ),
          gestureEnabled: false, // Disable gesture swiping back on iOS
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
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-2 items-center">
              <Clock size={14} color="#f3ff47" className="mr-1.5" />
              <Text className="text-secondary font-spaceBold text-sm">
                {formatTime(elapsedTime)}
              </Text>
              <Text className="text-neutral-500 font-spaceRegular text-xs ml-3">
                Active Session
              </Text>
            </View>
          </View>

          {/* Rest Duration Setting Row */}
          <View className="mt-4 pt-4 border-t border-neutral-850 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-neutral-400 font-spaceMedium text-xs">
                Rest Timer: {customRestDuration}s
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              {[30, 60, 90, 120].map((sec) => (
                <Pressable
                  key={sec}
                  onPress={() => setCustomRestDuration(sec)}
                  className={`px-2.5 py-1 rounded-lg border ${
                    customRestDuration === sec
                      ? "bg-secondary/40 border-secondary"
                      : "bg-primary border-neutral-900"
                  }`}
                >
                  <Text
                    className={`font-spaceBold text-[10px] ${
                      customRestDuration === sec
                        ? "text-secondary font-bold"
                        : "text-neutral-400"
                    }`}
                  >
                    {sec}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Active Rest Countdown Box */}
          {isRestActive && restTimeLeft > 0 && (
            <View className="mt-4 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Coffee size={16} color="#f59e0b" className="mr-2" />
                <View>
                  <Text className="text-white font-spaceBold text-sm leading-tight">
                    Resting...
                  </Text>
                  <Text className="text-neutral-500 font-spaceRegular text-[10px] mt-0.5">
                    Prepare for the next set
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-amber-500 font-spaceBold text-lg mr-3">
                  {restTimeLeft}s
                </Text>
                <Pressable
                  onPress={stopRestTimer}
                  className="bg-neutral-900 border border-neutral-850 px-2.5 py-1 rounded-lg"
                >
                  <Text className="text-white font-spaceBold text-[10px]">
                    SKIP
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Exercises List */}
        {selectedExercises.length === 0 ? (
          <View className="items-center justify-center py-16 px-4 bg-tertiary/20 rounded-3xl border border-neutral-900/50 border-dashed mb-5">
            <Dumbbell size={48} color="#444" className="mb-3" />
            <Text className="text-white font-spaceBold text-lg mb-1">
              Add Exercises
            </Text>
            <Text className="text-neutral-500 font-spaceRegular text-sm text-center">
              Your workout is empty. Tap the button below to select exercises
              from the database.
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
                  onPress={() => removeExercise(exercise.id)}
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
                <View key={set.id} className="flex-row items-center mb-2 px-1">
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
                      updateSet(exercise.id, set.id, { weight: val })
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
                      updateSet(exercise.id, set.id, { reps: val })
                    }
                    className="bg-primary flex-1 mx-1.5 py-1.5 rounded-lg text-white text-center font-spaceBold text-sm border border-neutral-900"
                  />

                  {/* Complete Checkbox & Delete */}
                  <View className="w-[50px] flex-row justify-center items-center">
                    <Pressable
                      onPress={() =>
                        updateSet(exercise.id, set.id, {
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
                        onPress={() => removeSet(exercise.id, set.id)}
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
                onPress={() => addSet(exercise.id)}
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
          className="bg-transparent border border-white/20 py-4 rounded-2xl items-center justify-center mb-6 flex-row"
          textClassName="text-white font-spaceBold text-lg"
          icon={<PlusIcon color="white" size={20} />}
        />

        {/* Cancel Workout Button */}
        <Pressable
          onPress={cancelSession}
          className="bg-red-500/10 border border-red-500/20 py-4 rounded-2xl items-center justify-center mb-16"
        >
          <Text className="text-red-500 font-spaceBold text-md">
            CANCEL WORKOUT
          </Text>
        </Pressable>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExerciseBottomSheet
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectExercise={addExercise}
      />
    </KeyboardAvoidingView>
  );
}

// Quick helper to cover styling or icon dependencies without import error
const PlusIcon = ({ color, size }: { color: string; size: number }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ color, fontSize: size, fontWeight: "bold", top: -1 }}>
      +
    </Text>
  </View>
);

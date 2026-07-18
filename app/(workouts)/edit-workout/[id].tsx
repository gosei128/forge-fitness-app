import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  SlideOutDown,
  FadeIn,
  FadeOut,
  Layout,
  SlideInDown,
} from "react-native-reanimated";
import React, { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  Clock3,
  Dumbbell,
  MoreVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react-native";
import Header from "../../../components/Header";
import ExerciseBottomSheet from "../../../components/ExerciseBottomSheet";
import UnitDropdownMenu from "../../../components/UnitDropdownMenu";
import { db } from "../../../db";
import { eq } from "drizzle-orm";
import {
  exercises,
  templateExercises,
  workoutTemplates,
} from "../../../db/schema";
import Spacer from "../../../components/Spacer";

interface ExerciseOption {
  id: number;
  name: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
}

interface TemplateSetEntry {
  id: number;
  weight: string;
  reps: string;
}

interface TemplateExerciseItem extends ExerciseOption {
  templateExerciseId?: number;
  weightUnit: string;
  sets: TemplateSetEntry[];
}

const DEFAULT_REST_OPTIONS = [30, 60, 90, 120];

const createBlankSet = (): TemplateSetEntry => ({
  id: Date.now() + Math.random(),
  weight: "",
  reps: "",
});

export default function EditTemplate() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [templateName, setTemplateName] = useState(name || "Untitled Template");
  const [templateRestTime, setTemplateRestTime] = useState(60);
  const [templateExercisesList, setTemplateExercisesList] = useState<
    TemplateExerciseItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [unitDropdown, setUnitDropdown] = useState<{
    exerciseId: number;
    currentUnit: string;
  } | null>(null);

  // Close dropdown when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        setUnitDropdown(null);
      };
    }, []),
  );

  const loadTemplate = useCallback(async () => {
    try {
      const templateRows = await db
        .select()
        .from(workoutTemplates)
        .where(eq(workoutTemplates.id, Number(id)))
        .limit(1);

      if (templateRows.length === 0) {
        setTemplateExercisesList([]);
        setTemplateName(name || "Untitled Template");
        setTemplateRestTime(60);
        return;
      }

      const template = templateRows[0];
      const rows = await db
        .select({
          templateExerciseId: templateExercises.id,
          exerciseId: exercises.id,
          name: exercises.name,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
          category: exercises.category,
          instructions: exercises.instructions,
          weightUnit: templateExercises.weightUnit,
          restTime: templateExercises.restTime,
          defaultSets: templateExercises.defaultSets,
        })
        .from(templateExercises)
        .leftJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
        .where(eq(templateExercises.templateId, template.id))
        .orderBy(templateExercises.orderNumber);

      const mapped = rows
        .filter((row) => row.exerciseId !== null)
        .map((row) => ({
          id: row.exerciseId!,
          templateExerciseId: row.templateExerciseId,
          name: row.name,
          muscleGroup: row.muscleGroup,
          equipment: row.equipment,
          category: row.category,
          instructions: row.instructions,
          weightUnit: row.weightUnit || "lbs",
          sets: (() => {
            if (!row.defaultSets) {
              return [createBlankSet()];
            }

            try {
              const parsed = JSON.parse(row.defaultSets as string);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((set: any, index: number) => ({
                  id: Date.now() + index + Math.random(),
                  weight: String(set?.weight ?? ""),
                  reps: String(set?.reps ?? ""),
                }));
              }
            } catch (error) {
              console.log("Failed to parse default sets", error);
            }

            return [createBlankSet()];
          })(),
        }));

      setTemplateName(template.name || name || "Untitled Template");
      setTemplateRestTime(template.restTime || 60);
      setTemplateExercisesList(mapped);
    } catch (error) {
      console.error("Error loading template:", error);
      Alert.alert("Error", "Could not load this template.");
    } finally {
      setLoading(false);
    }
  }, [id, name]);

  useEffect(() => {
    setLoading(true);
    loadTemplate().catch(console.error);
  }, [loadTemplate]);

  const handleSelectExercise = (exercise: ExerciseOption) => {
    if (templateExercisesList.some((item) => item.id === exercise.id)) {
      Alert.alert(
        "Already Added",
        `${exercise.name} is already in this template.`,
      );
      return;
    }

    setTemplateExercisesList((prev) => [
      ...prev,
      {
        ...exercise,
        weightUnit: "lbs",
        sets: [createBlankSet()],
      },
    ]);
  };

  const updateExerciseUnit = (exerciseId: number, unit: string) => {
    setTemplateExercisesList((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, weightUnit: unit }
          : exercise,
      ),
    );
  };

  const updateExerciseSet = (
    exerciseId: number,
    setId: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    setTemplateExercisesList((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  const addExerciseSet = (exerciseId: number) => {
    setTemplateExercisesList((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const lastSet = exercise.sets[exercise.sets.length - 1];
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              id: Date.now() + Math.random(),
              weight: lastSet ? lastSet.weight : "",
              reps: lastSet ? lastSet.reps : "",
            },
          ],
        };
      }),
    );
  };

  const removeExerciseSet = (exerciseId: number, setId: number) => {
    setTemplateExercisesList((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const nextSets = exercise.sets.filter((set) => set.id !== setId);
        return {
          ...exercise,
          sets: nextSets.length > 0 ? nextSets : [createBlankSet()],
        };
      }),
    );
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Error", "Please give this template a name.");
      return;
    }

    if (templateExercisesList.length === 0) {
      Alert.alert("Error", "Please add at least one exercise.");
      return;
    }

    setSaving(true);

    try {
      await db
        .update(workoutTemplates)
        .set({
          name: templateName.trim(),
          restTime: templateRestTime,
        })
        .where(eq(workoutTemplates.id, Number(id)));

      await db
        .delete(templateExercises)
        .where(eq(templateExercises.templateId, Number(id)));

      for (const [index, exercise] of templateExercisesList.entries()) {
        await db.insert(templateExercises).values({
          templateId: Number(id),
          exerciseId: exercise.id,
          orderNumber: index + 1,
          weightUnit: exercise.weightUnit || "lbs",
          restTime: templateRestTime || 60,
          defaultSets: JSON.stringify(exercise.sets || [createBlankSet()]),
        });
      }

      Alert.alert("Saved", "Your template has been updated.");
      router.back();
    } catch (error) {
      console.error("Error saving template:", error);
      Alert.alert("Error", "Could not save this template.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator size="large" color="#f3ff47" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-primary"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Header title="Edit Template" />
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        <View className=" rounded-2xl mb-4">
          <Text className="text-white font-spaceRegular text-md mb-2">
            Template Details
          </Text>
          <TextInput
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Template name"
            placeholderTextColor="#6b7280"
            className=" rounded-xl px-3 py-3 text-white font-spaceBold text-2xl mb-3"
          />

          <View className="flex-row items-center justify-between rounded-xl bg-tertiary/40 px-3 py-3">
            <View className="flex-row items-center">
              <Clock3 size={16} color="#fff" />
              <Text className="ml-2 text-white font-spaceMedium text-sm">
                Default rest timer
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              {DEFAULT_REST_OPTIONS.map((sec) => (
                <Pressable
                  key={sec}
                  onPress={() => setTemplateRestTime(sec)}
                  className={`rounded-lg px-2.5 py-1 border ${
                    templateRestTime === sec
                      ? "bg-secondary border-secondary/40"
                      : "bg-secondary/20 border-primary/40"
                  }`}
                >
                  <Text className="text-xs font-spaceBold text-black">
                    {sec}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-spaceBold text-lg">Exercises</Text>
            <Pressable
              onPress={() => setIsSheetVisible(true)}
              className="bg-secondary px-3 py-2 rounded-full flex-row items-center"
            >
              <Plus size={14} color="#000" />
              <Text className="ml-1 text-black font-spaceBold text-sm">
                Add exercise
              </Text>
            </Pressable>
          </View>

          {templateExercisesList.length === 0 ? (
            <View className="border border-dashed border-neutral-800 rounded-2xl p-6 items-center justify-center">
              <Dumbbell size={36} color="#6b7280" />
              <Text className="text-neutral-400 font-spaceMedium mt-2 text-center">
                No exercises yet. Add one to build this template.
              </Text>
            </View>
          ) : (
            templateExercisesList.map((exercise) => (
              <View
                key={exercise.id}
                className="bg-tertiary/40 rounded-2xl p-4 mb-3 border border-neutral-900"
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-white font-spaceBold text-base">
                      {exercise.name}
                    </Text>
                    <Text className="text-neutral-400 font-spaceRegular text-xs mt-1">
                      {exercise.muscleGroup}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() =>
                        setUnitDropdown({
                          exerciseId: exercise.id,
                          currentUnit: exercise.weightUnit,
                        })
                      }
                      className="mr-2 p-1"
                    >
                      <MoreVertical size={18} color="#f3ff47" />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setTemplateExercisesList((prev) =>
                          prev.filter((item) => item.id !== exercise.id),
                        )
                      }
                      className="p-1"
                    >
                      <Trash2 size={18} color="#ff4a4a" />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-row items-center mb-2 px-1">
                  <Text className="text-neutral-500 font-spaceBold text-xs w-[40px] text-center">
                    SET
                  </Text>
                  <Text className="text-neutral-500 font-spaceBold text-xs flex-1 text-center uppercase">
                    {exercise.weightUnit}
                  </Text>
                  <Text className="text-neutral-500 font-spaceBold text-xs flex-1 text-center">
                    REPS
                  </Text>
                  <Text className="text-neutral-500 font-spaceBold text-xs w-[40px] text-center">
                    DEL
                  </Text>
                </View>

                {exercise.sets.map((set, index) => (
                  <Animated.View
                    key={set.id}
                    entering={FadeIn.duration(140)}
                    exiting={FadeOut.duration(120)}
                    layout={Layout.springify()}
                    className="flex-row items-center mb-2 px-1"
                  >
                    <View className="w-[40px] items-center">
                      <Text className="text-white font-spaceMedium text-sm">
                        {index + 1}
                      </Text>
                    </View>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#555"
                      value={set.weight}
                      onChangeText={(value) =>
                        updateExerciseSet(exercise.id, set.id, "weight", value)
                      }
                      className="bg-primary flex-1 mx-1.5 py-1.5 rounded-lg text-white text-center font-spaceBold text-sm border border-neutral-900"
                    />
                    <TextInput
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#555"
                      value={set.reps}
                      onChangeText={(value) =>
                        updateExerciseSet(exercise.id, set.id, "reps", value)
                      }
                      className="bg-primary flex-1 mx-1.5 py-1.5 rounded-lg text-white text-center font-spaceBold text-sm border border-neutral-900"
                    />
                    <View className="w-[40px] items-center">
                      <Pressable
                        onPress={() => removeExerciseSet(exercise.id, set.id)}
                        disabled={exercise.sets.length === 1}
                      >
                        <X
                          size={14}
                          color={
                            exercise.sets.length === 1 ? "#4b5563" : "#ff4a4a"
                          }
                        />
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}

                <Pressable
                  onPress={() => addExerciseSet(exercise.id)}
                  className="mt-2 self-start"
                >
                  <Text className="text-secondary font-spaceBold text-sm">
                    + Add Set
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={handleSaveTemplate}
          disabled={saving}
          className={`rounded-2xl py-4 items-center justify-center flex-row ${
            saving ? "bg-neutral-800" : "bg-secondary"
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Save size={18} color="#000" />
          )}
          <Text className="ml-2 text-black font-spaceBold text-base">
            {saving ? "Saving..." : "Save Template"}
          </Text>
        </Pressable>
        <Spacer height={24} />
      </ScrollView>

      <ExerciseBottomSheet
        visible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onSelectExercise={handleSelectExercise}
      />

      <UnitDropdownMenu
        visible={unitDropdown !== null}
        currentUnit={unitDropdown?.currentUnit ?? "lbs"}
        onSelect={(unit) => {
          if (unitDropdown) {
            updateExerciseUnit(unitDropdown.exerciseId, unit);
          }
          setUnitDropdown(null);
        }}
        onClose={() => setUnitDropdown(null)}
      />
    </KeyboardAvoidingView>
  );
}

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { db } from "../db";
import { exercises } from "../db/schema";
import { like, eq, and } from "drizzle-orm";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
}

interface ExerciseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_GROUPS = [
  "All",
  "Waist",
  "Cardio",
  "Chest",
  "Back",
  "Shoulders",
  "Upper Legs",
  "Lower Legs",
  "Upper Arms",
  "Lower Arms",
];

const capitalize = (str: string) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ExerciseBottomSheet({
  visible,
  onClose,
  onSelectExercise,
}: ExerciseBottomSheetProps) {
  const [loading, setLoading] = useState(false);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) {
          Animated.timing(translateY, {
            toValue: Dimensions.get("window").height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!visible) return;

    const fetchExercises = async () => {
      setLoading(true);
      try {
        const conditions = [];

        if (searchQuery.trim()) {
          // sqlite LIKE is case-insensitive by default for ASCII
          conditions.push(like(exercises.name, `%${searchQuery.trim()}%`));
        }

        if (selectedCategory !== "All") {
          conditions.push(eq(exercises.muscleGroup, selectedCategory.toLowerCase()));
        }

        let results;
        if (conditions.length > 0) {
          results = await db
            .select()
            .from(exercises)
            .where(and(...conditions))
            .limit(50);
        } else {
          results = await db.select().from(exercises).limit(50);
        }

        setExerciseList(results as Exercise[]);
      } catch (error) {
        console.error("Error fetching exercises from DB:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce/delay fetching slightly if searching
    const delayDebounceFn = setTimeout(
      () => {
        fetchExercises();
      },
      searchQuery ? 150 : 0
    );

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory, visible]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/60"
      >
        {/* Clickable Backdrop overlay to close */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Sheet Container */}
        <Animated.View
          style={{ transform: [{ translateY }] }}
          className="bg-primary border-t border-tertiary rounded-t-[32px] h-[80%] px-5 pb-8"
        >
          {/* Drag Handle Indicator */}
          <View
            {...panResponder.panHandlers}
            className="w-full py-4 items-center"
          >
            <View className="bg-neutral-700 w-12 h-1.5 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-2xl font-spaceBold">
              Add Exercise
            </Text>
            <Pressable
              onPress={onClose}
              className="bg-tertiary p-2 rounded-full"
            >
              <X color="#fff" size={18} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-tertiary px-4 py-3 rounded-2xl mb-4 border border-neutral-800">
            <Search color="#888" size={20} className="mr-2" />
            <TextInput
              placeholder="Search exercise..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white font-spaceRegular text-base"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Muscle Group Pills Horizontal List */}
          <View className="mb-4">
            <FlatList
              horizontal
              data={MUSCLE_GROUPS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item;
                return (
                  <Pressable
                    onPress={() => setSelectedCategory(item)}
                    className={`px-4 py-2 rounded-full mr-2 border ${
                      isSelected
                        ? "bg-secondary border-secondary"
                        : "bg-tertiary border-neutral-800"
                    }`}
                  >
                    <Text
                      className={`font-spaceMedium text-sm ${
                        isSelected ? "text-black" : "text-neutral-400"
                      }`}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* List of Exercises */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#f3ff47" />
            </View>
          ) : exerciseList.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-neutral-500 font-spaceRegular text-base">
                No exercises found
              </Text>
            </View>
          ) : (
            <FlatList
              data={exerciseList}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelectExercise(item);
                    onClose();
                  }}
                  className="bg-tertiary/40 border border-neutral-900 rounded-2xl p-4 mb-3 flex-row justify-between items-center"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-white font-spaceBold text-base mb-1">
                      {item.name}
                    </Text>
                    <View className="flex-row flex-wrap gap-1">
                      <View className="bg-secondary/15 px-2 py-0.5 rounded">
                        <Text className="text-secondary font-spaceMedium text-[11px]">
                          {capitalize(item.muscleGroup)}
                        </Text>
                      </View>
                      {item.equipment && (
                        <View className="bg-neutral-800 px-2 py-0.5 rounded">
                          <Text className="text-neutral-400 font-spaceMedium text-[11px]">
                            {capitalize(item.equipment)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="bg-secondary/20 p-2 rounded-full">
                    <Text className="text-secondary text-lg font-spaceBold">
                      +
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

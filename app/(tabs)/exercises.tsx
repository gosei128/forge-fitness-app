import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Spacer from "../../components/Spacer";
import Header from "../../components/Header";
import { db } from "../../db";
import { exercises } from "../../db/schema";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlidersHorizontal, X, Check, Search } from "lucide-react-native";

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
};

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#EF4444",
  Back: "#3B82F6",
  Legs: "#22C55E",
  Shoulders: "#F59E0B",
  Arms: "#A855F7",
  Core: "#EC4899",
  Biceps: "#A855F7",
  Triceps: "#A855F7",
  Glutes: "#22C55E",
  Hamstrings: "#22C55E",
  Quadriceps: "#22C55E",
};

const getMuscleColor = (muscle: string) => MUSCLE_COLORS[muscle] ?? "#7C3AED";

// ─── Filter Bottom Sheet ─────────────────────────────────────────────────────
const FilterSheet = React.memo(
  ({
    visible,
    groups,
    active,
    onSelect,
    onClose,
  }: {
    visible: boolean;
    groups: string[];
    active: string | null;
    onSelect: (group: string | null) => void;
    onClose: () => void;
  }) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(
      new Animated.Value(Dimensions.get("window").height),
    ).current;

    useEffect(() => {
      Animated.spring(translateY, {
        toValue: visible ? 0 : Dimensions.get("window").height,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();
    }, [visible]);

    const handleSelect = (group: string | null) => {
      onSelect(group);
      onClose();
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={onClose} />

          <Animated.View
            style={{
              transform: [{ translateY }],
              paddingBottom: insets.bottom + 16,
            }}
            className="bg-primary border-t border-white/10 rounded-t-[28px] px-5 pt-5"
          >
            {/* Drag handle */}
            <View className="items-center mb-5">
              <View className="bg-neutral-700 w-10 h-1 rounded-full" />
            </View>

            {/* Header row */}
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-white font-spaceBold text-xl">
                Filter by Muscle
              </Text>
              <Pressable
                onPress={onClose}
                className="bg-neutral-800 p-2 rounded-full"
              >
                <X color="#fff" size={16} />
              </Pressable>
            </View>

            {/* "All" option */}
            <Pressable
              onPress={() => handleSelect(null)}
              className="flex-row items-center justify-between p-4 mb-2 rounded-2xl border border-neutral-800 bg-neutral-900/60"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-3 h-3 rounded-full bg-secondary/60" />
                <Text className="text-white font-spaceMedium text-base">
                  All Muscles
                </Text>
              </View>
              {active === null && <Check color="#7C3AED" size={18} />}
            </Pressable>

            {/* Muscle group options */}
            {groups.map((group) => {
              const color = getMuscleColor(group);
              const isActive = active === group;
              return (
                <Pressable
                  key={group}
                  onPress={() => handleSelect(group)}
                  style={{
                    borderColor: isActive ? `#f3ff47` : "#262626",
                    backgroundColor: isActive ? `#f3ff4720` : "#111111",
                  }}
                  className="flex-row items-center justify-between p-4 mb-2 rounded-2xl border"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-3 h-3 rounded-full bg-secondary/70" />
                    <Text
                      style={{ color: isActive ? "#f3ff47" : "#fff" }}
                      className="font-spaceMedium text-base"
                    >
                      {group}
                    </Text>
                  </View>
                  {isActive && <Check color={"#f3ff47"} size={18} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    );
  },
);

// ─── Exercise Card ───────────────────────────────────────────────────────────
const ExerciseCard = React.memo(
  ({ item, onPress }: { item: Exercise; onPress: (id: number) => void }) => {
    const accentColor = getMuscleColor(item.muscleGroup);
    return (
      <Pressable
        onPress={() => onPress(item.id)}
        className="bg-tertiary/20 border border-neutral-900 rounded-2xl p-4 mb-3 flex-row justify-between items-center active:opacity-70"
      >
        {/* <View
          className="w-1 self-stretch rounded-full mr-3"
          style={{ backgroundColor: `${accentColor}60` }}
        /> */}
        <View className="flex-1 mr-3">
          <Text className="text-white font-spaceBold text-base mb-1">
            {item.name}
          </Text>
          <View className="flex-row flex-wrap gap-1">
            <View className="px-2 py-0.5 rounded bg-secondary/20">
              <Text className="font-spaceMedium text-secondary text-[11px]">
                {item.muscleGroup}
              </Text>
            </View>
            {item.equipment ? (
              <View className="bg-neutral-800 px-2 py-0.5 rounded">
                <Text className="text-neutral-400 font-spaceMedium text-[11px]">
                  {item.equipment}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="bg-secondary/20 p-2.5 rounded-full">
          <Text className="text-secondary text-lg font-spaceBold">›</Text>
        </View>
      </Pressable>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────────────────────
const Exercises = () => {
  const router = useRouter();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchExercises = async () => {
      const data = await db.select().from(exercises);
      setAllExercises(data);
      setIsLoading(false);
    };
    fetchExercises();
  }, []);

  const muscleGroups = useMemo(
    () => Array.from(new Set(allExercises.map((e) => e.muscleGroup))).sort(),
    [allExercises],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allExercises.filter((e) => {
      const matchesMuscle =
        activeFilter === null || e.muscleGroup === activeFilter;
      const matchesSearch = q === "" || e.name.toLowerCase().includes(q);
      return matchesMuscle && matchesSearch;
    });
  }, [allExercises, activeFilter, searchQuery]);

  const handlePress = useCallback(
    (id: number) => {
      router.push({
        pathname: "/(exercises)/[id]",
        params: { id },
      });
    },
    [router],
  );

  return (
    <View className="flex-1 bg-primary">
      <Header title="Exercises" />
      <Spacer height={16} />

      {/* Title + filter button row */}
      <View className="px-5 mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-spaceBold text-white">Exercises</Text>
          <Text className="text-neutral-500 font-spaceMedium text-sm mt-0.5">
            {filtered.length > 0
              ? `${filtered.length} exercise${filtered.length !== 1 ? "s" : ""}${activeFilter ? ` · ${activeFilter}` : ""}`
              : ""}
          </Text>
        </View>

        {/* Filter button */}
        <Pressable
          onPress={() => setSheetOpen(true)}
          className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
            activeFilter
              ? "bg-secondary/30 border-secondary/60"
              : "bg-primary border-neutral-800"
          }`}
        >
          <SlidersHorizontal
            color={activeFilter ? "#f3ff47" : "#737373"}
            size={15}
          />
          <Text
            className={`font-spaceSemiBold text-sm ${activeFilter ? "text-secondary" : "text-neutral-500"}`}
          >
            {activeFilter ?? "Filter"}
          </Text>
          {activeFilter && (
            <Pressable hitSlop={8} onPress={() => setActiveFilter(null)}>
              <X color={"#f3ff47"} size={13} />
            </Pressable>
          )}
        </Pressable>
      </View>

      {/* Search bar */}
      <View className="px-5 mb-4 flex-row items-center gap-3 bg-neutral-900 mx-5 rounded-2xl border border-neutral-800">
        <Search color="#525252" size={16} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search exercises..."
          placeholderTextColor="#525252"
          className="flex-1 py-3.5 text-white font-spaceMedium text-sm"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable hitSlop={8} onPress={() => setSearchQuery("")}>
            <X color="#525252" size={15} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-neutral-500 font-spaceMedium text-sm text-center">
            No exercises found
            {searchQuery ? (
              <>
                {" "}
                for{" "}
                <Text className="text-white font-spaceBold">
                  "{searchQuery}"
                </Text>
              </>
            ) : null}
            {activeFilter ? (
              <>
                {" "}
                in{" "}
                <Text className="text-white font-spaceBold">
                  {activeFilter}
                </Text>
              </>
            ) : null}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ExerciseCard item={item} onPress={handlePress} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterSheet
        visible={sheetOpen}
        groups={muscleGroups}
        active={activeFilter}
        onSelect={setActiveFilter}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

export default Exercises;

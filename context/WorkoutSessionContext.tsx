import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert, Vibration } from "react-native";
import { router } from "expo-router";

// Dynamically import Audio from expo-av to prevent crashes on start if the native module is not compiled/built
let Audio: any = null;
try {
  const expoAV = require("expo-av");
  Audio = expoAV.Audio;
} catch (e) {
  console.log("[WorkoutSession] expo-av native module not available. Rest timer sound will be disabled.");
}
import { db } from "../db";
import { user, workoutSessions, sets, exercises as dbExercises } from "../db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export interface LoggedSet {
  id: number;
  weight: string;
  reps: string;
  isCompleted: boolean;
}

export interface SelectedExercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
  sets: LoggedSet[];
}

interface WorkoutSessionContextType {
  isActive: boolean;
  isCollapsed: boolean;
  sessionName: string;
  elapsedTime: number;
  selectedExercises: SelectedExercise[];
  restTimeLeft: number;
  customRestDuration: number;
  isRestActive: boolean;
  startTime: Date | null;
  startSession: (title: string, exerciseIds?: string) => Promise<void>;
  collapseSession: () => void;
  expandSession: () => void;
  finishSession: () => Promise<void>;
  cancelSession: () => void;
  setSessionName: (name: string) => void;
  addExercise: (exercise: any) => void;
  removeExercise: (exerciseId: number) => void;
  addSet: (exerciseId: number) => void;
  updateSet: (exerciseId: number, setId: number, fields: Partial<LoggedSet>) => void;
  removeSet: (exerciseId: number, setId: number) => void;
  setCustomRestDuration: (seconds: number) => void;
  startRestTimer: () => void;
  stopRestTimer: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

export const WorkoutSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sessionName, setSessionNameState] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Rest Timer States
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [customRestDuration, setCustomRestDuration] = useState(60); // default 60s
  const [isRestActive, setIsRestActive] = useState(false);

  // Active session timer effect
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Rest timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isRestActive && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRestActive(false);
            triggerRestCompleteFeedback();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restTimeLeft === 0) {
      setIsRestActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestActive, restTimeLeft]);

  const triggerRestCompleteFeedback = async () => {
    // Vibrate device
    Vibration.vibrate([0, 500, 200, 500]);
    
    // Play sound beep if Audio is available
    if (Audio) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav" }
        );
        await sound.playAsync();

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        console.error("Could not play sound: ", e);
      }
    }
  };

  const startSession = async (title: string, exerciseIds?: string) => {
    setStartTime(new Date());
    setElapsedTime(0);
    setIsCollapsed(false);
    setRestTimeLeft(0);
    setIsRestActive(false);

    if (title) {
      setSessionNameState(title);
    } else {
      const hours = new Date().getHours();
      let timeOfDay = "Workout";
      if (hours < 12) timeOfDay = "Morning Workout";
      else if (hours < 17) timeOfDay = "Afternoon Workout";
      else timeOfDay = "Evening Workout";
      setSessionNameState(timeOfDay);
    }

    if (exerciseIds) {
      const ids = exerciseIds.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) {
        try {
          const results = await db
            .select()
            .from(dbExercises)
            .where(inArray(dbExercises.id, ids));

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
          console.error("Error preloading exercises in context:", e);
        }
      }
    } else {
      setSelectedExercises([]);
    }

    setIsActive(true);
  };

  const setSessionName = (name: string) => {
    setSessionNameState(name);
  };

  const collapseSession = () => {
    setIsCollapsed(true);
    // Go to main tabs workouts page when collapsing
    router.navigate("/(tabs)/workouts");
  };

  const expandSession = () => {
    setIsCollapsed(false);
    router.navigate("/(workouts)/active-session");
  };

  const ensureUser = async () => {
    const users = await db.select().from(user).limit(1);
    if (users.length > 0) {
      return users[0].id;
    }

    await db.insert(user).values({
      firstName: "Forge",
      lastName: "Athlete",
      email: "athlete@forge.com",
      remoteId: "default_user",
    });

    const updatedUsers = await db.select().from(user).limit(1);
    return updatedUsers[0].id;
  };

  const saveSessionToDb = async () => {
    try {
      const userIdVal = await ensureUser();
      const completedSetsCount = selectedExercises.reduce(
        (acc, curr) => acc + curr.sets.filter((s) => s.isCompleted).length,
        0
      );
      const xpEarned = completedSetsCount * 10;

      let sessionIdVal: number;
      try {
        const inserted = await db
          .insert(workoutSessions)
          .values({
            name: sessionName || "Workout Session",
            userId: userIdVal,
            startedAt: startTime || new Date(),
            completedAt: new Date(),
            totalXpEarned: xpEarned,
          })
          .returning({ id: workoutSessions.id });
        sessionIdVal = inserted[0].id;
      } catch (err) {
        await db.insert(workoutSessions).values({
          name: sessionName || "Workout Session",
          userId: userIdVal,
          startedAt: startTime || new Date(),
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

      for (const ex of selectedExercises) {
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
            setIsActive(false);
            setSelectedExercises([]);
            setSessionNameState("");
            setElapsedTime(0);
            setIsCollapsed(false);
            router.replace("/(tabs)/workouts");
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving workout session in context:", error);
      Alert.alert("Error", "Failed to save workout session. Please try again.");
    }
  };

  const finishSession = async () => {
    // Check if at least one exercise is completed (finished)
    // A finished/completed exercise must have at least one completed set.
    const hasCompletedExercise = selectedExercises.some((ex) =>
      ex.sets.some((s) => s.isCompleted)
    );

    if (!hasCompletedExercise) {
      Alert.alert(
        "Cannot Finish",
        "You must complete at least one set of an exercise to finish the session."
      );
      return;
    }

    await saveSessionToDb();
  };

  const cancelSession = () => {
    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel this workout? All progress will be lost.",
      [
        { text: "Keep Workout", style: "cancel" },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: () => {
            setIsActive(false);
            setSelectedExercises([]);
            setSessionNameState("");
            setElapsedTime(0);
            setIsCollapsed(false);
            setRestTimeLeft(0);
            setIsRestActive(false);
            router.replace("/(tabs)/workouts");
          },
        },
      ]
    );
  };

  const addExercise = (exercise: any) => {
    setSelectedExercises((prev) => {
      // Check if exercise is already added
      if (prev.some((ex) => ex.id === exercise.id)) {
        Alert.alert("Already Added", `${exercise.name} is already in this session.`);
        return prev;
      }
      return [
        ...prev,
        {
          ...exercise,
          sets: [{ id: Date.now(), weight: "", reps: "", isCompleted: false }],
        },
      ];
    });
  };

  const removeExercise = (exerciseId: number) => {
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise and all its sets?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
          },
        },
      ]
    );
  };

  const addSet = (exerciseId: number) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: Date.now() + Math.random(),
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

  const updateSet = (exerciseId: number, setId: number, fields: Partial<LoggedSet>) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                const updatedSet = { ...s, ...fields };
                // Trigger rest timer only when isCompleted switches from false to true
                if (fields.isCompleted === true && !s.isCompleted) {
                  setRestTimeLeft(customRestDuration);
                  setIsRestActive(true);
                }
                return updatedSet;
              }
              return s;
            }),
          };
        }
        return ex;
      })
    );
  };

  const removeSet = (exerciseId: number, setId: number) => {
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

  const startRestTimer = () => {
    if (customRestDuration > 0) {
      setRestTimeLeft(customRestDuration);
      setIsRestActive(true);
    }
  };

  const stopRestTimer = () => {
    setIsRestActive(false);
    setRestTimeLeft(0);
  };

  return (
    <WorkoutSessionContext.Provider
      value={{
        isActive,
        isCollapsed,
        sessionName,
        elapsedTime,
        selectedExercises,
        restTimeLeft,
        customRestDuration,
        isRestActive,
        startTime,
        startSession,
        collapseSession,
        expandSession,
        finishSession,
        cancelSession,
        setSessionName,
        addExercise,
        removeExercise,
        addSet,
        updateSet,
        removeSet,
        setCustomRestDuration,
        startRestTimer,
        stopRestTimer,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
};

export const useWorkoutSession = () => {
  const context = useContext(WorkoutSessionContext);
  if (context === undefined) {
    throw new Error("useWorkoutSession must be used within a WorkoutSessionProvider");
  }
  return context;
};

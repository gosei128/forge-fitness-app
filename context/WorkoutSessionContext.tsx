import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Vibration } from "react-native";
import { router } from "expo-router";
// Dynamically import from expo-audio to prevent crashes on start if native module is not compiled/built
let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;
try {
  const expoAudio = require("expo-audio");
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  console.log(
    "[WorkoutSession] expo-audio native module not available. Sound effects will be disabled.",
  );
}
import { db } from "../db";
import {
  user,
  workoutSessions,
  sets,
  exercises as dbExercises,
  templateExercises,
} from "../db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { completeWorkoutSession } from "../lib/sessionCompletion";
import {
  startWorkoutNotification,
  stopWorkoutNotification,
  updateWorkoutNotification,
} from "../lib/notificationService";
import { queryClient } from "../lib/queryClient";
import {
  persistWorkout,
  clearPersistedWorkout,
  loadPersistedWorkout,
  computeElapsedSeconds,
  computeChronometerTimestamp,
  PersistedWorkoutState,
} from "../lib/workoutPersistence";

export interface LoggedSet {
  id: number;
  weight: string;
  reps: string;
  isCompleted: boolean;
  setType?: "working" | "warmup" | "drop" | "failure";
  rir?: number;
}

export interface SelectedExercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  category: string | null;
  instructions: string | null;
  weightUnit: string;
  sets: LoggedSet[];
}

interface WorkoutSessionContextType {
  isActive: boolean;
  isCollapsed: boolean;
  sessionName: string;
  currentExerciseName: string;
  elapsedTime: number;
  selectedExercises: SelectedExercise[];
  restTimeLeft: number;
  restDuration: number;
  customRestDuration: number;
  isRestActive: boolean;
  startTime: Date | null;
  startSession: (
    title: string,
    exerciseIds?: string,
    defaultRestDuration?: number,
    exerciseUnitsList?: string,
    templateId?: number,
  ) => Promise<void>;
  collapseSession: () => void;
  expandSession: () => void;
  finishSession: () => Promise<void>;
  cancelSession: () => void;
  setSessionName: (name: string) => void;
  addExercise: (exercise: any, unit?: string) => Promise<void>;
  removeExercise: (exerciseId: number) => void;
  addSet: (exerciseId: number) => void;
  updateSet: (
    exerciseId: number,
    setId: number,
    fields: Partial<LoggedSet>,
  ) => void;
  removeSet: (exerciseId: number, setId: number) => void;
  updateExerciseUnit: (exerciseId: number, unit: string) => void;
  isPaused: boolean;
  pauseSession: () => void;
  resumeSession: () => void;
  setCustomRestDuration: (seconds: number) => void;
  startRestTimer: () => void;
  stopRestTimer: () => void;
}

const WorkoutSessionContext = createContext<
  WorkoutSessionContextType | undefined
>(undefined);

export const WorkoutSessionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sessionName, setSessionNameState] = useState("");
  const [currentExerciseName, setCurrentExerciseName] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);

  // Rest Timer States
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(0);
  const [customRestDuration, setCustomRestDuration] = useState(60); // default 60s
  const [isRestActive, setIsRestActive] = useState(false);
  const [isRestComplete, setIsRestComplete] = useState(false);
  const restCompleteHandledRef = useRef(false);

  // Sync refs for notification updates to prevent interval rebuilds
  const sessionNameRef = useRef(sessionName);
  const currentExerciseNameRef = useRef(currentExerciseName);
  const isRestActiveRef = useRef(isRestActive);
  const isRestCompleteRef = useRef(isRestComplete);
  const isPausedRef = useRef(isPaused);
  const startTimeRef = useRef(startTime);
  const totalPausedMsRef = useRef(totalPausedMs);
  const pausedAtRef = useRef(pausedAt);

  useEffect(() => { sessionNameRef.current = sessionName; }, [sessionName]);
  useEffect(() => { currentExerciseNameRef.current = currentExerciseName; }, [currentExerciseName]);
  useEffect(() => { isRestActiveRef.current = isRestActive; }, [isRestActive]);
  useEffect(() => { isRestCompleteRef.current = isRestComplete; }, [isRestComplete]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { totalPausedMsRef.current = totalPausedMs; }, [totalPausedMs]);
  useEffect(() => { pausedAtRef.current = pausedAt; }, [pausedAt]);

  const getElapsedSeconds = useCallback(() => {
    if (!startTime) {
      return 0;
    }
    const effectiveNow = isPaused && pausedAt != null ? pausedAt : Date.now();
    return Math.max(
      0,
      Math.floor((effectiveNow - startTime.getTime() - totalPausedMs) / 1000),
    );
  }, [isPaused, pausedAt, startTime, totalPausedMs]);

  const getRestSecondsLeft = useCallback(() => {
    if (!restStartTime || restDuration <= 0) {
      return 0;
    }

    return Math.max(
      0,
      restDuration - Math.floor((Date.now() - restStartTime) / 1000),
    );
  }, [restDuration, restStartTime]);

  const triggerRestCompleteFeedback = useCallback(async () => {
    // Vibrate device
    Vibration.vibrate([0, 500, 200, 500]);

    // Play sound beep if audio player is available
    if (createAudioPlayer) {
      try {
        if (setAudioModeAsync) {
          await setAudioModeAsync({
            playsInSilentMode: true,
          });
        }
        const player = createAudioPlayer(require("../assets/audio/notif.wav"));
        player.play();
      } catch (e) {
        console.error("Could not play sound: ", e);
      }
    }
  }, []);

  const syncTimers = useCallback(() => {
    if (!isActive || isPausedRef.current) {
      return;
    }

    const nextElapsedTime = getElapsedSeconds();
    setElapsedTime(nextElapsedTime);

    const startTimeMs = startTimeRef.current?.getTime() ?? Date.now();
    const chronometerTimestamp = startTimeMs + totalPausedMsRef.current;

    if (!isRestActiveRef.current) {
      updateWorkoutNotification({
        sessionName: sessionNameRef.current,
        elapsedTime: nextElapsedTime,
        currentExerciseName: currentExerciseNameRef.current,
        restComplete: isRestCompleteRef.current,
        chronometerTimestamp,
        isPaused: false,
      });
      return;
    }

    const nextRestTimeLeft = getRestSecondsLeft();
    setRestTimeLeft(nextRestTimeLeft);

    if (nextRestTimeLeft <= 0) {
      setIsRestActive(false);
      setRestTimeLeft(0);
      setIsRestComplete(true);

      if (!restCompleteHandledRef.current) {
        restCompleteHandledRef.current = true;
        triggerRestCompleteFeedback();
      }
    }

    updateWorkoutNotification({
      sessionName: sessionNameRef.current,
      elapsedTime: nextElapsedTime,
      restTimeLeft: nextRestTimeLeft,
      currentExerciseName: currentExerciseNameRef.current,
      restComplete: nextRestTimeLeft <= 0,
      chronometerTimestamp,
      isPaused: false,
    });
  }, [
    getElapsedSeconds,
    getRestSecondsLeft,
    isActive,
    triggerRestCompleteFeedback,
  ]);

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    syncTimers();
    const interval = setInterval(syncTimers, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, isPaused, syncTimers]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        // Sync MMKV state on foreground in case actions were triggered via notification
        const persisted = loadPersistedWorkout();
        if (persisted) {
          setIsPaused(persisted.isPaused);
          setPausedAt(persisted.pausedAt);
          setTotalPausedMs(persisted.totalPausedMs);
        }
        syncTimers();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncTimers]);

  const startSession = async (
    title: string,
    exerciseIds?: string,
    defaultRestDuration?: number,
    exerciseUnitsList?: string,
    templateId?: number,
  ) => {
    const startedAt = new Date();
    setStartTime(startedAt);
    setElapsedTime(0);
    setIsPaused(false);
    setPausedAt(null);
    setTotalPausedMs(0);
    setIsCollapsed(false);
    setRestTimeLeft(0);
    setRestStartTime(null);
    setRestDuration(0);
    setIsRestActive(false);
    setIsRestComplete(false);
    setCurrentExerciseName("");
    restCompleteHandledRef.current = false;
    setCustomRestDuration(defaultRestDuration ?? 60);

    const userIdVal = await ensureUser();

    let nextSessionName = title;
    if (!nextSessionName) {
      const hours = new Date().getHours();
      let timeOfDay = "Workout";
      if (hours < 12) timeOfDay = "Morning Workout";
      else if (hours < 17) timeOfDay = "Afternoon Workout";
      else timeOfDay = "Evening Workout";
      nextSessionName = timeOfDay;
    }
    setSessionNameState(nextSessionName);

    // Persist workout state to MMKV
    persistWorkout({
      workoutName: nextSessionName,
      workoutStartTimestamp: startedAt.getTime(),
      pausedAt: null,
      totalPausedMs: 0,
      restStartTimestamp: null,
      restDurationSeconds: 0,
      currentExerciseName: "",
      customRestDuration: defaultRestDuration ?? 60,
      isActive: true,
      isPaused: false,
    });

    if (templateId) {
      try {
        const results = await db
          .select({
            templateExerciseId: templateExercises.id,
            exerciseId: dbExercises.id,
            name: dbExercises.name,
            muscleGroup: dbExercises.muscleGroup,
            equipment: dbExercises.equipment,
            category: dbExercises.category,
            instructions: dbExercises.instructions,
            weightUnit: templateExercises.weightUnit,
            defaultSets: templateExercises.defaultSets,
            orderNumber: templateExercises.orderNumber,
          })
          .from(templateExercises)
          .innerJoin(
            dbExercises,
            eq(templateExercises.exerciseId, dbExercises.id),
          )
          .where(eq(templateExercises.templateId, templateId))
          .orderBy(templateExercises.orderNumber);

        const loadedList: SelectedExercise[] = [];

        for (const row of results) {
          const id = row.exerciseId;

          // Parse template defaultSets
          let templateSets: any[] = [];
          if (row.defaultSets) {
            try {
              const parsed = JSON.parse(row.defaultSets);
              if (Array.isArray(parsed)) {
                templateSets = parsed;
              }
            } catch (e) {
              console.error("Failed to parse template defaultSets", e);
            }
          }

          // Find the most recent session that logged this exercise for this user
          const lastSetRow = await db
            .select({ sessionId: sets.sessionId })
            .from(sets)
            .innerJoin(workoutSessions, eq(sets.sessionId, workoutSessions.id))
            .where(
              and(
                eq(sets.exerciseId, id),
                eq(workoutSessions.userId, userIdVal),
              ),
            )
            .orderBy(desc(sets.id))
            .limit(1);

          let prevSets: any[] = [];
          if (lastSetRow.length > 0) {
            prevSets = await db
              .select()
              .from(sets)
              .where(
                and(
                  eq(sets.exerciseId, id),
                  eq(sets.sessionId, lastSetRow[0].sessionId),
                ),
              )
              .orderBy(sets.setNumber);
          }

          let initialSets: LoggedSet[] = [];

          if (templateSets.length > 0) {
            initialSets = templateSets.map((ts, index): LoggedSet => {
              const prevSet = prevSets[index];

              let weight = "";
              if (prevSet && prevSet.weight !== undefined) {
                weight = prevSet.weight.toString();
              } else if (ts.weight) {
                weight = ts.weight.toString();
              }

              let reps = "";
              if (ts.reps) {
                reps = ts.reps.toString();
              } else if (prevSet && prevSet.reps !== undefined) {
                reps = prevSet.reps.toString();
              }

              return {
                id: Date.now() + index + Math.random(),
                weight,
                reps,
                isCompleted: false,
              };
            });
          } else if (prevSets.length > 0) {
            initialSets = prevSets.map(
              (ps, index): LoggedSet => ({
                id: Date.now() + index + Math.random(),
                weight: ps.weight.toString(),
                reps: ps.reps.toString(),
                isCompleted: false,
              }),
            );
          } else {
            initialSets = [
              {
                id: Date.now() + Math.random(),
                weight: "",
                reps: "",
                isCompleted: false,
              },
            ];
          }

          loadedList.push({
            id: row.exerciseId,
            name: row.name || "",
            muscleGroup: row.muscleGroup || "",
            equipment: row.equipment,
            category: row.category,
            instructions: row.instructions,
            weightUnit: row.weightUnit || "lbs",
            sets: initialSets,
          });
        }

        setSelectedExercises(loadedList);
      } catch (e) {
        console.error("Error preloading template exercises in context:", e);
      }
    } else if (exerciseIds) {
      const ids = exerciseIds.split(",").map(Number).filter(Boolean);
      const units = exerciseUnitsList ? exerciseUnitsList.split(",") : [];

      if (ids.length > 0) {
        try {
          const results = await db
            .select()
            .from(dbExercises)
            .where(inArray(dbExercises.id, ids));

          const loadedList: SelectedExercise[] = [];

          for (let index = 0; index < ids.length; index++) {
            const id = ids[index];
            const ex = results.find((r) => r.id === id);
            if (!ex) continue;

            const unit: string = units[index] || "lbs";

            // Find the most recent session that logged this exercise for this user
            const lastSetRow = await db
              .select({ sessionId: sets.sessionId })
              .from(sets)
              .innerJoin(
                workoutSessions,
                eq(sets.sessionId, workoutSessions.id),
              )
              .where(
                and(
                  eq(sets.exerciseId, id),
                  eq(workoutSessions.userId, userIdVal),
                ),
              )
              .orderBy(desc(sets.id))
              .limit(1);

            let initialSets: LoggedSet[] = [];

            if (lastSetRow.length > 0) {
              const prevSets = await db
                .select()
                .from(sets)
                .where(
                  and(
                    eq(sets.exerciseId, id),
                    eq(sets.sessionId, lastSetRow[0].sessionId),
                  ),
                )
                .orderBy(sets.setNumber);

              // Pre-fill previous weights & reps — not marked completed
              initialSets = prevSets.map(
                (ps): LoggedSet => ({
                  id: Date.now() + Math.random(),
                  weight: ps.weight.toString(),
                  reps: ps.reps.toString(),
                  isCompleted: false,
                }),
              );
            }

            // Fallback: one blank set if no prior history
            if (initialSets.length === 0) {
              initialSets = [
                {
                  id: Date.now() + Math.random(),
                  weight: "",
                  reps: "",
                  isCompleted: false,
                },
              ];
            }

            loadedList.push({ ...ex, weightUnit: unit, sets: initialSets });
          }

          setSelectedExercises(loadedList);
        } catch (e) {
          console.error("Error preloading exercises in context:", e);
        }
      }
    } else {
      setSelectedExercises([]);
    }

    setIsActive(true);
    await startWorkoutNotification(nextSessionName, 0, "", startedAt.getTime());
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
      email: "athlete@forge.com",
      remoteId: "default_user",
    });

    const updatedUsers = await db.select().from(user).limit(1);
    return updatedUsers[0].id;
  };

  const saveSessionToDb = async () => {
    try {
      const userIdVal = await ensureUser();

      let sessionIdVal: number;
      try {
        const inserted = await db
          .insert(workoutSessions)
          .values({
            name: sessionName || "Workout Session",
            userId: userIdVal,
            startedAt: startTime || new Date(),
            completedAt: null, // Will be set in completeWorkoutSession
            totalXpEarned: 0, // Will be set in completeWorkoutSession
            restTime: customRestDuration,
          })
          .returning({ id: workoutSessions.id });
        sessionIdVal = inserted[0].id;
      } catch (err) {
        await db.insert(workoutSessions).values({
          name: sessionName || "Workout Session",
          userId: userIdVal,
          startedAt: startTime || new Date(),
          completedAt: null,
          totalXpEarned: 0,
          restTime: customRestDuration,
        });

        const sessions = await db
          .select()
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, userIdVal))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(1);
        sessionIdVal = sessions[0].id;
      }

      // Filter and insert only COMPLETED sets into the database
      for (const ex of selectedExercises) {
        const completedSets = ex.sets.filter((s) => s.isCompleted);
        const setsToInsert = completedSets.map((s, index) => ({
          sessionId: sessionIdVal,
          exerciseId: ex.id,
          weight: parseInt(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          setNumber: index + 1,
          isPr: false,
          weightUnit: ex.weightUnit || "lbs",
          setType: s.setType || "working",
          rir: s.rir !== undefined ? s.rir : null,
          createdAt: new Date(),
        }));

        if (setsToInsert.length > 0) {
          await db.insert(sets).values(setsToInsert);
        }
      }

      // Complete the workout session: check PRs, calculate XP, and update userStats / streak
      const completionResult = await completeWorkoutSession(
        sessionIdVal,
        userIdVal,
      );
      const prsCount = completionResult.isPRs.filter(Boolean).length;

      let message = `Completed successfully! Earned ${completionResult.totalXP} XP.`;
      if (prsCount > 0) {
        message += `\n\n🔥 ${prsCount} Personal Record${prsCount > 1 ? "s" : ""} achieved!`;
      }
      if (completionResult.leveledUp) {
        message += `\n\n🎉 LEVEL UP! You reached Level ${completionResult.newLevel}! 🎉`;
        // Play level-up sound
        if (createAudioPlayer) {
          try {
            const player = createAudioPlayer(
              require("../assets/audio/notif.wav"),
            );
            player.play();
          } catch (e) {
            console.warn("[WorkoutSession] Failed to play level-up sound:", e);
          }
        }
      }

      // Invalidate cached data across all screens
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
      queryClient.invalidateQueries({ queryKey: ["profileData"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["exerciseDetail"] });

      Alert.alert("Workout Saved", message, [
        {
          text: "Done",
          onPress: () => {
            setIsActive(false);
            setSelectedExercises([]);
            setSessionNameState("");
            setCurrentExerciseName("");
            setElapsedTime(0);
            setIsPaused(false);
            setPausedAt(null);
            setTotalPausedMs(0);
            setIsCollapsed(false);
            setRestTimeLeft(0);
            setRestStartTime(null);
            setRestDuration(0);
            setIsRestActive(false);
            setIsRestComplete(false);
            clearPersistedWorkout();
            stopWorkoutNotification();
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
      ex.sets.some((s) => s.isCompleted),
    );

    if (!hasCompletedExercise) {
      Alert.alert(
        "Cannot Finish",
        "You must complete at least one set of an exercise to finish the session.",
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
            setCurrentExerciseName("");
            setElapsedTime(0);
            setIsPaused(false);
            setPausedAt(null);
            setTotalPausedMs(0);
            setIsCollapsed(false);
            setRestTimeLeft(0);
            setRestStartTime(null);
            setRestDuration(0);
            setIsRestActive(false);
            setIsRestComplete(false);
            clearPersistedWorkout();
            stopWorkoutNotification();
            router.replace("/(tabs)/workouts");
          },
        },
      ],
    );
  };

  const addExercise = async (exercise: any, unit: string = "lbs") => {
    const userIdVal = await ensureUser();

    // Find the most recent session that logged this exercise for this user
    const lastSetRow = await db
      .select({ sessionId: sets.sessionId })
      .from(sets)
      .innerJoin(workoutSessions, eq(sets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(sets.exerciseId, exercise.id),
          eq(workoutSessions.userId, userIdVal),
        ),
      )
      .orderBy(desc(sets.id))
      .limit(1);

    let initialSets: LoggedSet[] = [];

    if (lastSetRow.length > 0) {
      const prevSets = await db
        .select()
        .from(sets)
        .where(
          and(
            eq(sets.exerciseId, exercise.id),
            eq(sets.sessionId, lastSetRow[0].sessionId),
          ),
        )
        .orderBy(sets.setNumber);

      // Pre-fill previous weights & reps — not marked completed
      initialSets = prevSets.map(
        (ps): LoggedSet => ({
          id: Date.now() + Math.random(),
          weight: ps.weight.toString(),
          reps: ps.reps.toString(),
          isCompleted: false,
        }),
      );
    }

    if (initialSets.length === 0) {
      initialSets = [
        {
          id: Date.now() + Math.random(),
          weight: "",
          reps: "",
          isCompleted: false,
        },
      ];
    }

    setSelectedExercises((prev) => {
      // Check if exercise is already added
      if (prev.some((ex) => ex.id === exercise.id)) {
        Alert.alert(
          "Already Added",
          `${exercise.name} is already in this session.`,
        );
        return prev;
      }
      return [
        ...prev,
        {
          ...exercise,
          weightUnit: unit,
          sets: initialSets,
        },
      ];
    });
  };

  const updateExerciseUnit = (exerciseId: number, unit: string) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return { ...ex, weightUnit: unit };
        }
        return ex;
      }),
    );
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
            setSelectedExercises((prev) =>
              prev.filter((ex) => ex.id !== exerciseId),
            );
          },
        },
      ],
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
      }),
    );
  };

  const updateSet = (
    exerciseId: number,
    setId: number,
    fields: Partial<LoggedSet>,
  ) => {
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
                  setCurrentExerciseName(ex.name);
                  setRestStartTime(Date.now());
                  setRestDuration(customRestDuration);
                  setRestTimeLeft(customRestDuration);
                  setIsRestActive(true);
                  setIsRestComplete(false);
                  restCompleteHandledRef.current = false;
                }
                return updatedSet;
              }
              return s;
            }),
          };
        }
        return ex;
      }),
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
      }),
    );
  };

  const pauseSession = useCallback(() => {
    if (!isActive || isPaused) return;
    const now = Date.now();
    setIsPaused(true);
    setPausedAt(now);

    const persisted = loadPersistedWorkout();
    if (persisted) {
      const updated: PersistedWorkoutState = {
        ...persisted,
        isPaused: true,
        pausedAt: now,
      };
      persistWorkout(updated);
      const elapsed = computeElapsedSeconds(updated);
      setElapsedTime(elapsed);

      const chronometerTimestamp = computeChronometerTimestamp(updated);
      updateWorkoutNotification({
        sessionName,
        elapsedTime: elapsed,
        currentExerciseName,
        chronometerTimestamp,
        isPaused: true,
      });
    }
  }, [currentExerciseName, isActive, isPaused, sessionName]);

  const resumeSession = useCallback(() => {
    if (!isActive || !isPaused || pausedAt == null) return;
    const now = Date.now();
    const pausedMs = now - pausedAt;
    const nextTotalPausedMs = totalPausedMs + pausedMs;

    setIsPaused(false);
    setPausedAt(null);
    setTotalPausedMs(nextTotalPausedMs);

    const persisted = loadPersistedWorkout();
    if (persisted) {
      const updated: PersistedWorkoutState = {
        ...persisted,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: nextTotalPausedMs,
      };
      persistWorkout(updated);
      const elapsed = computeElapsedSeconds(updated);
      setElapsedTime(elapsed);

      const chronometerTimestamp = computeChronometerTimestamp(updated);
      updateWorkoutNotification({
        sessionName,
        elapsedTime: elapsed,
        currentExerciseName,
        chronometerTimestamp,
        isPaused: false,
      });
    }
  }, [currentExerciseName, isActive, isPaused, pausedAt, sessionName, totalPausedMs]);

  const startRestTimer = () => {
    if (customRestDuration > 0) {
      setRestStartTime(Date.now());
      setRestDuration(customRestDuration);
      setRestTimeLeft(customRestDuration);
      setIsRestActive(true);
      setIsRestComplete(false);
      restCompleteHandledRef.current = false;
    }
  };

  const stopRestTimer = () => {
    setIsRestActive(false);
    setRestTimeLeft(0);
    setRestStartTime(null);
    setRestDuration(0);
    setIsRestComplete(false);
  };

  return (
    <WorkoutSessionContext.Provider
      value={{
        isActive,
        isCollapsed,
        sessionName,
        currentExerciseName,
        elapsedTime,
        selectedExercises,
        restTimeLeft,
        restDuration,
        customRestDuration,
        isRestActive,
        startTime,
        isPaused,
        pauseSession,
        resumeSession,
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
        updateExerciseUnit,
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
    throw new Error(
      "useWorkoutSession must be used within a WorkoutSessionProvider",
    );
  }
  return context;
};

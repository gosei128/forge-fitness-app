import { registerWorkoutNotificationHandlers, updateWorkoutNotification, stopWorkoutNotification } from "./lib/notificationService";
import { persistWorkout, loadPersistedWorkout, clearPersistedWorkout, computeElapsedSeconds, computeChronometerTimestamp } from "./lib/workoutPersistence";
import { Platform } from "react-native";

registerWorkoutNotificationHandlers();

if (Platform.OS === "android") {
  try {
    const notifyKit = require("react-native-notify-kit");
    const notifee = notifyKit.default || notifyKit;
    const EventType = notifyKit.EventType;

    notifee.onBackgroundEvent(async ({ type, detail }: any) => {
      if (type !== EventType.ACTION_PRESS) return;

      const actionId = detail?.pressAction?.id;
      if (!actionId) return;

      const persisted = loadPersistedWorkout();
      if (!persisted) return;

      const now = Date.now();

      if (actionId === "pause-workout" && !persisted.isPaused) {
        const updated = {
          ...persisted,
          isPaused: true,
          pausedAt: now,
        };
        persistWorkout(updated);
        const elapsed = computeElapsedSeconds(updated);
        const chronometerTimestamp = computeChronometerTimestamp(updated);

        await updateWorkoutNotification({
          sessionName: updated.workoutName,
          elapsedTime: elapsed,
          currentExerciseName: updated.currentExerciseName,
          chronometerTimestamp,
          isPaused: true,
        });
      } else if (actionId === "resume-workout" && persisted.isPaused && persisted.pausedAt != null) {
        const pausedMs = now - persisted.pausedAt;
        const updated = {
          ...persisted,
          isPaused: false,
          pausedAt: null,
          totalPausedMs: persisted.totalPausedMs + pausedMs,
        };
        persistWorkout(updated);
        const elapsed = computeElapsedSeconds(updated);
        const chronometerTimestamp = computeChronometerTimestamp(updated);

        await updateWorkoutNotification({
          sessionName: updated.workoutName,
          elapsedTime: elapsed,
          currentExerciseName: updated.currentExerciseName,
          chronometerTimestamp,
          isPaused: false,
        });
      } else if (actionId === "finish-workout") {
        clearPersistedWorkout();
        await stopWorkoutNotification();
      }
    });
  } catch (e) {
    console.warn("[BackgroundHandler] Failed to register background event listener:", e);
  }
}

import "expo-router/entry";

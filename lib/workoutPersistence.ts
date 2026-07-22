import { MMKV } from "react-native-mmkv";

export const workoutStorage = new MMKV({ id: "forge-workout" });

export interface PersistedWorkoutState {
  workoutName: string;
  /**
   * Unix ms when workout started — single source of truth for elapsed time.
   * Never changes after startSession(), not even on pause.
   */
  workoutStartTimestamp: number;
  /**
   * Unix ms when the workout was paused. null if currently running.
   */
  pausedAt: number | null;
  /**
   * Total milliseconds accumulated across all pause periods.
   * Elapsed = (now - workoutStartTimestamp - totalPausedMs) / 1000
   */
  totalPausedMs: number;
  restStartTimestamp: number | null;
  restDurationSeconds: number;
  currentExerciseName: string;
  customRestDuration: number;
  isActive: boolean;
  isPaused: boolean;
}

const STORAGE_KEY = "active-workout";

export const persistWorkout = (state: PersistedWorkoutState): void => {
  workoutStorage.set(STORAGE_KEY, JSON.stringify(state));
};

export const loadPersistedWorkout = (): PersistedWorkoutState | null => {
  const raw = workoutStorage.getString(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedWorkoutState;
  } catch {
    return null;
  }
};

export const clearPersistedWorkout = (): void => {
  workoutStorage.delete(STORAGE_KEY);
};

/**
 * Computes accurate elapsed seconds accounting for all pauses.
 * Works correctly whether the app is running, paused, or recovering from a process kill.
 */
export const computeElapsedSeconds = (s: PersistedWorkoutState): number => {
  const effectiveNow =
    s.isPaused && s.pausedAt != null ? s.pausedAt : Date.now();
  return Math.max(
    0,
    Math.floor(
      (effectiveNow - s.workoutStartTimestamp - s.totalPausedMs) / 1000,
    ),
  );
};

/**
 * Returns the effective Chronometer timestamp to pass to the notification.
 * Shifting by totalPausedMs makes the native Android chronometer display net
 * active workout time rather than wall-clock time since start.
 */
export const computeChronometerTimestamp = (
  s: PersistedWorkoutState,
): number => {
  return s.workoutStartTimestamp + s.totalPausedMs;
};

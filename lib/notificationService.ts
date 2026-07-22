import { Platform } from "react-native";
import { router } from "expo-router";
import type { Notification } from "react-native-notify-kit";

const CHANNEL_ID = "workout-timer";
const NOTIFICATION_ID = "active-workout-session";
const NOTIFICATION_TITLE_FALLBACK = "Active Workout";

let notifyKit: typeof import("react-native-notify-kit").default | null = null;
let notifyKitModule: typeof import("react-native-notify-kit") | null = null;
let channelReady = false;
let handlersRegistered = false;

const getNotifyKit = () => {
  if (Platform.OS !== "android") {
    return null;
  }

  if (!notifyKit || !notifyKitModule) {
    try {
      const loadedModule =
        require("react-native-notify-kit") as typeof import("react-native-notify-kit");
      notifyKitModule = loadedModule;
      notifyKit = loadedModule.default;
    } catch (error) {
      console.warn(
        "[WorkoutNotification] react-native-notify-kit is unavailable. Use a development build.",
        error,
      );
      return null;
    }
  }

  return notifyKit;
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const ensureChannel = async () => {
  const notifee = getNotifyKit();
  if (!notifee || !notifyKitModule || channelReady) {
    return;
  }

  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Workout Timer",
    importance: notifyKitModule.AndroidImportance.HIGH,
    vibration: false,
  });
  channelReady = true;
};

const buildNotification = ({
  sessionName,
  elapsedTime,
  restTimeLeft,
  currentExerciseName,
  restComplete,
  chronometerTimestamp,
  isPaused,
}: {
  sessionName: string;
  elapsedTime: number;
  restTimeLeft?: number;
  currentExerciseName?: string;
  restComplete?: boolean;
  chronometerTimestamp?: number;
  isPaused?: boolean;
}): Notification => {
  const title = sessionName || NOTIFICATION_TITLE_FALLBACK;
  const exerciseLabel = currentExerciseName ? ` · ${currentExerciseName}` : "";

  let body: string;
  if (isPaused) {
    body = `⏸ Paused — ${formatDuration(elapsedTime)}${exerciseLabel}`;
  } else if (restComplete === true) {
    body = `REST COMPLETE — Ready for next set${exerciseLabel}`;
  } else if (restTimeLeft && restTimeLeft > 0) {
    body = `Resting ${formatDuration(restTimeLeft)}${exerciseLabel}`;
  } else {
    body = `Elapsed ${formatDuration(elapsedTime)}${exerciseLabel}`;
  }

  // Effective timestamp for chronometer: accounts for all accumulated pause time
  const timestamp =
    chronometerTimestamp ??
    Date.now() - Math.max(0, elapsedTime) * 1000;

  return {
    id: NOTIFICATION_ID,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      category: notifyKitModule?.AndroidCategory.SERVICE,
      color: "#f3ff47",
      colorized: false,
      ongoing: true,
      onlyAlertOnce: true,
      pressAction: {
        id: "default",
        launchActivity: "default",
      },
      // showChronometer renders a native Android Chronometer — zero JS overhead,
      // survives process kills and lock screen. This is how Strava does it.
      showChronometer: !isPaused,
      timestamp,
      foregroundServiceTypes: [
        notifyKitModule?.AndroidForegroundServiceType
          .FOREGROUND_SERVICE_TYPE_HEALTH,
      ].filter(Boolean) as number[],
      actions: [
        {
          title: isPaused ? "▶  Resume" : "⏸  Pause",
          pressAction: {
            id: isPaused ? "resume-workout" : "pause-workout",
          },
        },
        {
          title: "✓  Finish",
          pressAction: { id: "finish-workout" },
        },
      ],
    },
    data: {
      route: "/(workouts)/active-session",
    },
  };
};

export const registerWorkoutNotificationHandlers = () => {
  const notifee = getNotifyKit();
  if (!notifee || !notifyKitModule || handlersRegistered) {
    return;
  }

  handlersRegistered = true;

  notifee.registerForegroundService(
    async () => new Promise<void>(() => {}),
  );

  notifee.onForegroundEvent(({ type, detail }) => {
    if (
      type === notifyKitModule?.EventType.PRESS &&
      detail.notification?.id === NOTIFICATION_ID
    ) {
      router.navigate("/(workouts)/active-session");
    }
    // Foreground action presses are handled by onForegroundActionPress in index.ts
  });
};

export const startWorkoutNotification = async (
  sessionName: string,
  elapsedTime = 0,
  currentExerciseName?: string,
  chronometerTimestamp?: number,
  isPaused = false,
) => {
  const notifee = getNotifyKit();
  if (!notifee) {
    return;
  }

  try {
    await ensureChannel();
    registerWorkoutNotificationHandlers();
    await notifee.displayNotification(
      buildNotification({
        sessionName,
        elapsedTime,
        currentExerciseName,
        chronometerTimestamp,
        isPaused,
      }),
    );
  } catch (error) {
    console.warn("[WorkoutNotification] Failed to start notification.", error);
  }
};

export const updateWorkoutNotification = async ({
  sessionName,
  elapsedTime,
  restTimeLeft,
  currentExerciseName,
  restComplete,
  chronometerTimestamp,
  isPaused,
}: {
  sessionName: string;
  elapsedTime: number;
  restTimeLeft?: number;
  currentExerciseName?: string;
  restComplete?: boolean;
  chronometerTimestamp?: number;
  isPaused?: boolean;
}) => {
  const notifee = getNotifyKit();
  if (!notifee) {
    return;
  }

  try {
    await ensureChannel();
    await notifee.displayNotification(
      buildNotification({
        sessionName,
        elapsedTime,
        restTimeLeft,
        currentExerciseName,
        restComplete,
        chronometerTimestamp,
        isPaused,
      }),
    );
  } catch (error) {
    console.warn("[WorkoutNotification] Failed to update notification.", error);
  }
};

export const stopWorkoutNotification = async () => {
  const notifee = getNotifyKit();
  if (!notifee) {
    return;
  }

  try {
    await notifee.stopForegroundService();
  } catch (error) {
    console.warn("[WorkoutNotification] Failed to stop notification.", error);
  }
};


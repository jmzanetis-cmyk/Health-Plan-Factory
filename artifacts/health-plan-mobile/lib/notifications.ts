import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyCheckIn(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Wellness Check-In",
      body: "How are you feeling today? Log a quick journal entry to keep your streak going.",
      data: { screen: "journal" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleWeeklyReview(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Weekly Plan Review",
      body: "Time to review your wellness plan and celebrate your wins this week!",
      data: { screen: "plan" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 9,
      minute: 0,
    },
  });
}

export async function scheduleStreakAtRisk(currentStreak: number): Promise<void> {
  if (Platform.OS === "web" || currentStreak < 2) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Don't break your ${currentStreak}-day streak!`,
      body: "Log a check-in before midnight to keep your wellness streak alive.",
      data: { screen: "journal" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 30,
    },
  });
}

export async function scheduleSessionReminder(
  modalityName: string,
  sessionDate: Date
): Promise<void> {
  if (Platform.OS === "web") return;
  const reminderTime = new Date(sessionDate.getTime() - 60 * 60 * 1000);
  if (reminderTime <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${modalityName} session in 1 hour`,
      body: "Your wellness session is coming up. Make sure you're prepared!",
      data: { screen: "discover" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });
}

export async function scheduleBuddyCheckIn(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Buddy Check-In",
      body: "Your accountability buddy shared their progress. Tap to respond!",
      data: { screen: "accountability" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 4,
      hour: 18,
      minute: 0,
    },
  });
}

export async function scheduleTrialCountdown(daysLeft: number): Promise<void> {
  if (Platform.OS === "web" || daysLeft > 3 || daysLeft <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial`,
      body: "Upgrade to Plus to keep your AI coach and unlimited plan reveals.",
      data: { screen: "accountability" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setupNotifications(opts?: {
  streak?: number;
  trialDaysLeft?: number;
}): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await cancelAllNotifications();
  await scheduleDailyCheckIn();
  await scheduleWeeklyReview();
  await scheduleBuddyCheckIn();

  if (opts?.streak) await scheduleStreakAtRisk(opts.streak);
  if (opts?.trialDaysLeft !== undefined) await scheduleTrialCountdown(opts.trialDaysLeft);

  return true;
}

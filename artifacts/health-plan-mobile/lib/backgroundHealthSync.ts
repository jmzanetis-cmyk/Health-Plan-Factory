import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { Platform } from "react-native";
import { loadConnectionState, syncHealthData } from "./healthSync";
import * as SecureStore from "expo-secure-store";

export const HEALTH_SYNC_TASK = "HEALTH_SYNC_BACKGROUND";

TaskManager.defineTask(HEALTH_SYNC_TASK, async () => {
  try {
    const profileId = await SecureStore.getItemAsync("health_sync_profile_id");
    if (!profileId) return BackgroundFetch.BackgroundFetchResult.NoData;

    const state = await loadConnectionState(profileId);
    const isConnected = state.appleHealth || state.googleFit;
    if (!isConnected) return BackgroundFetch.BackgroundFetchResult.NoData;

    const metrics = await syncHealthData(profileId);
    if (metrics) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundHealthSync(profileId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.setItemAsync("health_sync_profile_id", profileId);
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(HEALTH_SYNC_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {}
}

export async function unregisterBackgroundHealthSync(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(HEALTH_SYNC_TASK);
    }
  } catch {}
}

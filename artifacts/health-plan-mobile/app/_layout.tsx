import * as Sentry from "@sentry/react-native";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { applyStoredLanguage } from "@/lib/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/lib/auth";
import "@/lib/backgroundHealthSync";
import { registerBackgroundHealthSync } from "@/lib/backgroundHealthSync";
import { getApiBaseUrl } from "@/lib/apiBase";
import {
  initializeRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
} from "@/lib/revenuecat";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  environment: __DEV__ ? "development" : "production",
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
});

const apiBase = getApiBaseUrl();
if (apiBase) {
  setBaseUrl(apiBase);
}
setAuthTokenGetter(() => SecureStore.getItemAsync("hpf_access_token"));

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Initialize RevenueCat once on module load
try {
  initializeRevenueCat();
} catch (err) {
  console.warn("[RevenueCat] Init:", err);
}

function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inTabs = segments[0] === "(tabs)";
    const inSettings = segments[0] === "settings";
    const onLogin = segments[0] === "login";
    const onOnboarding = segments[0] === "onboarding";
    const needsAuth = inTabs || inSettings;

    if (!isAuthenticated && needsAuth) {
      // Check if first-time user before deciding where to send them
      AsyncStorage.getItem("hpf_onboarding_complete").then((done) => {
        if (!done) {
          router.replace("/onboarding");
        } else {
          router.replace("/login");
        }
      });
    } else if (isAuthenticated && (onLogin || onOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerBackgroundHealthSync(user.id).catch(() => {});
      loginRevenueCat(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Wire logout
  useEffect(() => {
    if (!isAuthenticated) {
      logoutRevenueCat();
    }
  }, [isAuthenticated]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="health-connect" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="intake" options={{ headerShown: false, presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    applyStoredLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Dynamic Expo config — replaces app.json so we can read env vars at build time.
// See .env.example for required environment variables.

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const origin = apiUrl || (domain ? `https://${domain}` : "https://healthplanfactory.com");

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Health Plan Factory",
  slug: "healthplanfactory",
  owner: "jzanetis",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "healthplanfactory",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1a2e4a",
  },
  ios: {
    bundleIdentifier: "com.healthplanfactory.mobile",
    buildNumber: "1",
    supportsTablet: false,
    infoPlist: {
      NSHealthShareUsageDescription:
        "Health Plan Factory reads your steps, sleep, active energy, and mindfulness sessions to update your wellness score and habit tracking.",
      NSHealthUpdateUsageDescription:
        "Health Plan Factory does not write data to Apple Health.",
      NSMotionUsageDescription:
        "Health Plan Factory uses motion data to count your steps and active minutes.",
    },
    entitlements: {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.access": [],
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["C617.1"],
        },
      ],
    },
  },
  android: {
    package: "com.healthplanfactory.mobile",
    permissions: [
      "android.permission.ACTIVITY_RECOGNITION",
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_SLEEP",
      "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
      "android.permission.health.READ_EXERCISE",
    ],
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin,
      },
    ],
    "expo-font",
    "expo-web-browser",
    "react-native-health",
    "expo-background-fetch",
    "expo-task-manager",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG ?? "healthplanfactory",
        project: process.env.SENTRY_PROJECT ?? "health-plan-mobile",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "a49a8d86-1232-4de6-81c8-4c0b434e8f76",
    },
  },
};

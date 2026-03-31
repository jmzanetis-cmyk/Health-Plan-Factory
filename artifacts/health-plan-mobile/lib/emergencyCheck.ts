import { Alert, Linking } from "react-native";

const EMERGENCY_KEYWORDS = [
  "suicid",
  "kill myself",
  "end my life",
  "self-harm",
  "hurt myself",
  "overdose",
  "don't want to live",
  "want to die",
  "crisis",
];

const COOLDOWN_MS = 30_000;
let lastAlertTime = 0;
let alertVisible = false;

export function containsEmergencyKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function showEmergencyAlert(): void {
  const now = Date.now();
  if (alertVisible || now - lastAlertTime < COOLDOWN_MS) return;

  alertVisible = true;
  lastAlertTime = now;

  Alert.alert(
    "We care about you",
    "If you are in crisis or need immediate help, please reach out:\n\n988 Suicide & Crisis Lifeline: Call or text 988\nEmergency Services: Call 911\nCrisis Text Line: Text HOME to 741741",
    [
      { text: "Call 988", onPress: () => { alertVisible = false; Linking.openURL("tel:988"); }, style: "default" },
      { text: "Dismiss", onPress: () => { alertVisible = false; }, style: "cancel" },
    ]
  );
}

export function interceptEmergencyText(text: string): void {
  if (containsEmergencyKeyword(text)) {
    showEmergencyAlert();
  }
}

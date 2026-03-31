import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { interceptEmergencyText } from "@/lib/emergencyCheck";

export function EmergencyTextInput({ onChangeText, ...props }: TextInputProps) {
  function handleChange(text: string) {
    interceptEmergencyText(text);
    onChangeText?.(text);
  }
  return <TextInput {...props} onChangeText={handleChange} />;
}

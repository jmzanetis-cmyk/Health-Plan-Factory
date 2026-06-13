import React from "react";
import { WorkerCharacter, WorkerProps, CharacterConfig } from "./BaseCharacter";

const config: CharacterConfig = {
  skinColor: "#e0aa70",
  uniformColor: "#3d6b52",
  pantsColor: "#2e5040",
  shoesColor: "#1e3028",
  hatColor: "#3d6b52",
  hatType: "cap",
  hairColor: "#5a3a1a",
};

export function Arnold(props: WorkerProps) {
  return <WorkerCharacter config={config} {...props} />;
}

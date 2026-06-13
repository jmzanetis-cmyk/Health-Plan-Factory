import React from "react";
import { WorkerCharacter, WorkerProps, CharacterConfig } from "./BaseCharacter";

const config: CharacterConfig = {
  skinColor: "#c8956b",
  uniformColor: "#1b2d4f",
  pantsColor: "#1b2d4f",
  shoesColor: "#0d1a2e",
  hatType: "none",
  hairColor: "#1a1a1a",
  hasGlasses: true,
};

export function Franco(props: WorkerProps) {
  return <WorkerCharacter config={config} {...props} />;
}

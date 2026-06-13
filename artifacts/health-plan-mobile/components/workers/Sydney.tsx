import React from "react";
import { WorkerCharacter, WorkerProps, CharacterConfig } from "./BaseCharacter";

const config: CharacterConfig = {
  skinColor: "#f4c28f",
  uniformColor: "#fafaf8",
  uniformTrim: "#D4227E",
  pantsColor: "#e8e0d0",
  shoesColor: "#5a3e28",
  hatColor: "#D4227E",
  hatType: "hardhat",
  hairColor: "#3d2b1f",
};

export function Sydney(props: WorkerProps) {
  return <WorkerCharacter config={config} {...props} />;
}

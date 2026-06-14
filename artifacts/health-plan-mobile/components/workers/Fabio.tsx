import React from "react";
import { WorkerCharacter, WorkerProps, CharacterConfig } from "./BaseCharacter";

const config: CharacterConfig = {
  skinColor: "#d4a96a",
  uniformColor: "#D4227E",
  pantsColor: "#D4227E",
  shoesColor: "#3d2b1f",
  hatColor: "#1b2d4f",
  hatType: "hardhat",
  hairColor: "#2a1a0a",
  imageSource: require("../../assets/images/workers/fabio.png"),
};

export function Fabio(props: WorkerProps) {
  return <WorkerCharacter config={config} {...props} />;
}

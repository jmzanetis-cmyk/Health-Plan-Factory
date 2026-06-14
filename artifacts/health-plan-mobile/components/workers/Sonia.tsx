import React from "react";
import { WorkerCharacter, WorkerProps, CharacterConfig } from "./BaseCharacter";

const config: CharacterConfig = {
  skinColor: "#e8b88a",
  uniformColor: "#4a9b8e",
  uniformTrim: "#3a7b6e",
  pantsColor: "#4a9b8e",
  shoesColor: "#2a4a44",
  hatType: "none",
  hairColor: "#b8892a",
  imageSource: require("../../assets/images/workers/sonia.png"),
  accentColor: "#4a9b8e",
};

export function Sonia(props: WorkerProps) {
  return <WorkerCharacter config={config} {...props} />;
}

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Rect, Line, Path, G } from "react-native-svg";
import { FONTS } from "@/constants/theme";

export type Pose =
  | "default"
  | "waving"
  | "thumbsup"
  | "pointing"
  | "clipboard"
  | "celebrating"
  | "thinking";

export type BubblePosition = "right" | "left" | "above";

export interface WorkerProps {
  pose?: Pose;
  size?: number;
  speechBubble?: string;
  bubblePosition?: BubblePosition;
  isTyping?: boolean;
}

// ── Speech bubble ──────────────────────────────────────────────────────────

function TypingDots() {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const dot = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const anims = [dot(a, 0), dot(b, 200), dot(c, 400)];
    anims.forEach((anim) => anim.start());
    return () => anims.forEach((anim) => anim.stop());
  }, [a, b, c]);

  return (
    <View style={styles.dots}>
      {[a, b, c].map((val, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: val }]} />
      ))}
    </View>
  );
}

function SpeechBubble({
  text,
  isTyping,
  position,
}: {
  text?: string;
  isTyping?: boolean;
  position: BubblePosition;
}) {
  if (!text && !isTyping) return null;

  const tailStyle =
    position === "right"
      ? styles.tailLeft
      : position === "left"
      ? styles.tailRight
      : styles.tailBelow;

  return (
    <View style={[styles.bubbleOuter, position === "above" && { alignItems: "center" }]}>
      {position === "above" && <View style={[styles.tailAboveConnector]} />}
      <View style={styles.bubble}>
        {tailStyle !== styles.tailBelow && <View style={tailStyle} />}
        {isTyping ? <TypingDots /> : <Text style={styles.bubbleText}>{text}</Text>}
      </View>
      {position === "above" && null}
    </View>
  );
}

// ── Arm path helpers ───────────────────────────────────────────────────────

function Arms({ pose, armColor }: { pose: Pose; armColor: string }) {
  const sw = 8; // strokeWidth
  const cap = "round";

  switch (pose) {
    case "waving":
      return (
        <G>
          <Line x1={25} y1={50} x2={8} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={46} x2={90} y2={28} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
        </G>
      );
    case "thumbsup":
      return (
        <G>
          <Line x1={25} y1={50} x2={8} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={46} x2={80} y2={30} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          {/* thumb */}
          <Circle cx={78} cy={26} r={4} fill={armColor} />
        </G>
      );
    case "pointing":
      return (
        <G>
          <Line x1={25} y1={50} x2={8} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={48} x2={97} y2={36} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Circle cx={98} cy={35} r={3} fill={armColor} />
        </G>
      );
    case "celebrating":
      return (
        <G>
          <Line x1={25} y1={46} x2={12} y2={28} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={46} x2={88} y2={28} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
        </G>
      );
    case "clipboard":
      return (
        <G>
          <Line x1={25} y1={52} x2={42} y2={62} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={52} x2={58} y2={62} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          {/* clipboard */}
          <Rect x={38} y={58} width={24} height={28} rx={2} fill="#fff" stroke="#1b2d4f" strokeWidth={2} />
          <Line x1={43} y1={65} x2={57} y2={65} stroke="#1b2d4f" strokeWidth={1.5} />
          <Line x1={43} y1={70} x2={57} y2={70} stroke="#1b2d4f" strokeWidth={1.5} />
          <Line x1={43} y1={75} x2={52} y2={75} stroke="#1b2d4f" strokeWidth={1.5} />
        </G>
      );
    case "thinking":
      return (
        <G>
          <Line x1={25} y1={50} x2={8} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={48} x2={70} y2={36} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={70} y1={36} x2={60} y2={30} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
        </G>
      );
    default:
      return (
        <G>
          <Line x1={25} y1={50} x2={8} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
          <Line x1={75} y1={50} x2={92} y2={54} stroke={armColor} strokeWidth={sw} strokeLinecap={cap} />
        </G>
      );
  }
}

// ── Character config ───────────────────────────────────────────────────────

export interface CharacterConfig {
  skinColor: string;
  uniformColor: string;
  uniformTrim?: string;
  pantsColor: string;
  shoesColor: string;
  hatColor?: string;
  hatType?: "hardhat" | "cap" | "none";
  hairColor?: string;
  hasGlasses?: boolean;
  showTablet?: boolean;
}

// ── Core character SVG ─────────────────────────────────────────────────────

function CharacterSVG({ config, pose, size }: { config: CharacterConfig; pose: Pose; size: number }) {
  const {
    skinColor,
    uniformColor,
    uniformTrim,
    pantsColor,
    shoesColor,
    hatColor,
    hatType = "none",
    hairColor,
    hasGlasses,
    showTablet,
  } = config;

  const armColor = uniformColor;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Hair / back (for Sonia) */}
      {hairColor && hatType === "none" && (
        <G>
          <Path
            d="M 37 24 Q 32 44 33 60 L 37 60 Q 38 42 41 26 Z"
            fill={hairColor}
          />
          <Path
            d="M 63 24 Q 68 44 67 60 L 63 60 Q 62 42 59 26 Z"
            fill={hairColor}
          />
        </G>
      )}

      {/* Head */}
      <Circle cx={50} cy={24} r={13} fill={skinColor} />

      {/* Eyes */}
      <Circle cx={45} cy={21} r={1.8} fill="#1b2d4f" />
      <Circle cx={55} cy={21} r={1.8} fill="#1b2d4f" />

      {/* Glasses (Franco) */}
      {hasGlasses && (
        <G>
          <Circle cx={45} cy={21} r={4} fill="none" stroke="#1b2d4f" strokeWidth={1.5} />
          <Circle cx={55} cy={21} r={4} fill="none" stroke="#1b2d4f" strokeWidth={1.5} />
          <Line x1={49} y1={21} x2={51} y2={21} stroke="#1b2d4f" strokeWidth={1.5} />
          <Line x1={37} y1={21} x2={41} y2={21} stroke="#1b2d4f" strokeWidth={1.2} />
          <Line x1={59} y1={21} x2={63} y2={21} stroke="#1b2d4f" strokeWidth={1.2} />
        </G>
      )}

      {/* Smile */}
      <Path
        d="M 44 27 Q 50 33 56 27"
        stroke="#1b2d4f"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />

      {/* Hat */}
      {hatType === "hardhat" && hatColor && (
        <G>
          {/* Brim */}
          <Rect x={33} y={16} width={34} height={4} rx={2} fill={hatColor} />
          {/* Dome */}
          <Path d="M 37 16 Q 50 2 63 16 Z" fill={hatColor} />
        </G>
      )}
      {hatType === "cap" && hatColor && (
        <G>
          {/* Cap body */}
          <Path d="M 38 16 Q 50 4 62 16 Z" fill={hatColor} />
          {/* Brim */}
          <Rect x={33} y={14} width={20} height={4} rx={2} fill={hatColor} />
        </G>
      )}

      {/* Hair top (visible below hat for non-Sonia) */}
      {hairColor && hatType !== "none" && (
        <G>
          <Rect x={39} y={34} width={22} height={5} rx={2} fill={hairColor} />
        </G>
      )}

      {/* Neck */}
      <Rect x={47} y={36} width={6} height={6} fill={skinColor} />

      {/* Arms */}
      <Arms pose={showTablet ? "clipboard" : pose} armColor={armColor} />

      {/* Body (torso) */}
      <Rect x={26} y={42} width={48} height={27} rx={4} fill={uniformColor} />
      {uniformTrim && <Rect x={26} y={42} width={48} height={6} rx={4} fill={uniformTrim} />}

      {/* Pants/legs */}
      <Rect x={29} y={69} width={16} height={22} rx={3} fill={pantsColor} />
      <Rect x={55} y={69} width={16} height={22} rx={3} fill={pantsColor} />

      {/* Shoes */}
      <Rect x={26} y={89} width={20} height={8} rx={3} fill={shoesColor} />
      <Rect x={54} y={89} width={20} height={8} rx={3} fill={shoesColor} />
    </Svg>
  );
}

// ── Exported composite component ───────────────────────────────────────────

export function WorkerCharacter({
  config,
  pose = "default",
  size = 80,
  speechBubble,
  bubblePosition = "right",
  isTyping,
}: WorkerProps & { config: CharacterConfig }) {
  const hasBubble = !!(speechBubble || isTyping);
  const isAbove = bubblePosition === "above";
  const isLeft = bubblePosition === "left";

  return (
    <View style={[styles.wrapper, isAbove ? styles.wrapperCol : styles.wrapperRow]}>
      {isAbove && hasBubble && (
        <SpeechBubble text={speechBubble} isTyping={isTyping} position="above" />
      )}
      {isLeft && hasBubble && (
        <SpeechBubble text={speechBubble} isTyping={isTyping} position="left" />
      )}
      <CharacterSVG config={config} pose={pose} size={size} />
      {!isAbove && !isLeft && hasBubble && (
        <SpeechBubble text={speechBubble} isTyping={isTyping} position="right" />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const BUBBLE_MAX_WIDTH = 170;

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  wrapperRow: { flexDirection: "row", gap: 6 },
  wrapperCol: { flexDirection: "column", alignItems: "center", gap: 4 },

  bubbleOuter: {},
  bubble: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D4227E",
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: BUBBLE_MAX_WIDTH,
  },
  bubbleText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "#1b2d4f",
    lineHeight: 15,
  },

  // Tail triangles (CSS border trick)
  tailLeft: {
    position: "absolute",
    left: -7,
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#D4227E",
  },
  tailRight: {
    position: "absolute",
    right: -7,
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#D4227E",
  },
  tailBelow: {},
  tailAboveConnector: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#D4227E",
    alignSelf: "center",
    marginBottom: -1,
  },

  // Typing dots
  dots: { flexDirection: "row", gap: 4, paddingHorizontal: 4, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D4227E" },
});

import React from "react";
import Svg, { Path } from "react-native-svg";

type BirdIconProps = {
  color?: string;
  size?: number;
};

// Lucide "bird" icon.
export default function BirdIcon({ color = "#374151", size = 20 }: BirdIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M16 7h.01" />
      <Path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
      <Path d="m20 7 2 .5-2 .5" />
      <Path d="M10 18v3" />
      <Path d="M14 17.75V21" />
      <Path d="M7 18a6 6 0 0 0 3.84-10.61" />
    </Svg>
  );
}

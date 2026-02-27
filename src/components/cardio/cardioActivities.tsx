import {
  Bike, PersonStanding, Waves, Footprints, Dumbbell, Mountain,
  Zap, Swords, Trophy, Goal, CircleDot, Activity,
  HeartPulse, StretchHorizontal, Music, Timer, Flame, Wind,
  type LucideIcon,
} from "lucide-react";

export type TargetType = "distance" | "time" | "none";

// All available icons a trainer can pick from when adding an activity
export const ICON_OPTIONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "activity", icon: Activity, label: "Activity" },
  { name: "bike", icon: Bike, label: "Bike" },
  { name: "circle-dot", icon: CircleDot, label: "Ball" },
  { name: "dumbbell", icon: Dumbbell, label: "Dumbbell" },
  { name: "flame", icon: Flame, label: "Flame" },
  { name: "footprints", icon: Footprints, label: "Footprints" },
  { name: "goal", icon: Goal, label: "Goal/Net" },
  { name: "heart-pulse", icon: HeartPulse, label: "Heart" },
  { name: "mountain", icon: Mountain, label: "Mountain" },
  { name: "music", icon: Music, label: "Music" },
  { name: "person-standing", icon: PersonStanding, label: "Person" },
  { name: "stretch-horizontal", icon: StretchHorizontal, label: "Stretch" },
  { name: "swords", icon: Swords, label: "Combat" },
  { name: "timer", icon: Timer, label: "Timer" },
  { name: "trophy", icon: Trophy, label: "Trophy" },
  { name: "waves", icon: Waves, label: "Water" },
  { name: "wind", icon: Wind, label: "Wind" },
  { name: "zap", icon: Zap, label: "Lightning" },
];

const iconMap: Record<string, LucideIcon> = {};
ICON_OPTIONS.forEach((o) => { iconMap[o.name] = o.icon; });

export function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || Activity;
}

// Default seed activities with best-matching icons
export const DEFAULT_ACTIVITIES = [
  { name: "American football", icon_name: "trophy" },
  { name: "Australian football", icon_name: "trophy" },
  { name: "Badminton", icon_name: "wind" },
  { name: "Baseball", icon_name: "circle-dot" },
  { name: "Basketball", icon_name: "circle-dot" },
  { name: "Core training", icon_name: "heart-pulse" },
  { name: "Cricket", icon_name: "circle-dot" },
  { name: "CrossFit", icon_name: "dumbbell" },
  { name: "Cycling", icon_name: "bike" },
  { name: "Dancing", icon_name: "music" },
  { name: "Elliptical", icon_name: "activity" },
  { name: "Flexibility", icon_name: "stretch-horizontal" },
  { name: "Golf", icon_name: "circle-dot" },
  { name: "Hiking", icon_name: "mountain" },
  { name: "HIIT", icon_name: "zap" },
  { name: "Jump rope", icon_name: "timer" },
  { name: "Kickboxing", icon_name: "swords" },
  { name: "Pilates", icon_name: "stretch-horizontal" },
  { name: "Rowing", icon_name: "waves" },
  { name: "Running", icon_name: "footprints" },
  { name: "Soccer", icon_name: "goal" },
  { name: "Stair climbing", icon_name: "flame" },
  { name: "Swimming", icon_name: "waves" },
  { name: "Tennis", icon_name: "circle-dot" },
  { name: "Walking", icon_name: "person-standing" },
  { name: "Yoga", icon_name: "heart-pulse" },
  { name: "General", icon_name: "activity" },
];

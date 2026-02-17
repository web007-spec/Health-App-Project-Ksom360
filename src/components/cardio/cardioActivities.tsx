import {
  Bike, PersonStanding, Waves, Footprints, Dumbbell, Mountain,
  Zap, Swords, Trophy, Goal, CircleDot, Activity,
  HeartPulse, StretchHorizontal, Music, Timer,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

export type TargetType = "distance" | "time" | "none";

export interface CardioActivity {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CARDIO_ACTIVITIES: CardioActivity[] = [
  { id: "american_football", label: "American football", icon: Trophy },
  { id: "australian_football", label: "Australian football", icon: Trophy },
  { id: "badminton", label: "Badminton", icon: Activity },
  { id: "baseball", label: "Baseball", icon: CircleDot },
  { id: "basketball", label: "Basketball", icon: Goal },
  { id: "core_training", label: "Core training", icon: HeartPulse },
  { id: "cricket", label: "Cricket", icon: CircleDot },
  { id: "crossfit", label: "CrossFit", icon: Dumbbell },
  { id: "cycling", label: "Cycling", icon: Bike },
  { id: "dancing", label: "Dancing", icon: Music },
  { id: "elliptical", label: "Elliptical", icon: Activity },
  { id: "flexibility", label: "Flexibility", icon: StretchHorizontal },
  { id: "golf", label: "Golf", icon: CircleDot },
  { id: "hiking", label: "Hiking", icon: Mountain },
  { id: "hiit", label: "HIIT", icon: Zap },
  { id: "jump_rope", label: "Jump rope", icon: Timer },
  { id: "kickboxing", label: "Kickboxing", icon: Swords },
  { id: "pilates", label: "Pilates", icon: StretchHorizontal },
  { id: "rowing", label: "Rowing", icon: Waves },
  { id: "running", label: "Running", icon: Footprints },
  { id: "soccer", label: "Soccer", icon: Goal },
  { id: "stair_climbing", label: "Stair climbing", icon: Activity },
  { id: "swimming", label: "Swimming", icon: Waves },
  { id: "tennis", label: "Tennis", icon: CircleDot },
  { id: "walking", label: "Walking", icon: PersonStanding },
  { id: "yoga", label: "Yoga", icon: HeartPulse },
  { id: "general", label: "General", icon: Activity },
];

export function getActivity(id: string) {
  return CARDIO_ACTIVITIES.find((a) => a.id === id) || { id, label: id, icon: Activity };
}

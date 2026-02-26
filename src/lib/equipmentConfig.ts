import {
  Dumbbell,
  PersonStanding,
  Circle,
  Cable,
  Footprints,
  Grip,
  Target,
  Box,
  ArrowUpDown,
  Rotate3d,
  Weight,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface EquipmentItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const EQUIPMENT_LIBRARY: EquipmentItem[] = [
  { id: "bodyweight", label: "Bodyweight", icon: PersonStanding },
  { id: "dumbbell", label: "Dumbbell", icon: Dumbbell },
  { id: "barbell", label: "Barbell", icon: Grip },
  { id: "bench", label: "Bench", icon: ArrowUpDown },
  { id: "plate", label: "Plate", icon: Circle },
  { id: "kettlebell", label: "Kettlebell", icon: Weight },
  { id: "cable", label: "Cable Machine", icon: Cable },
  { id: "resistance_band", label: "Resistance Band", icon: Rotate3d },
  { id: "pull_up_bar", label: "Pull-up Bar", icon: Grip },
  { id: "medicine_ball", label: "Medicine Ball", icon: Target },
  { id: "box", label: "Box / Step", icon: Box },
  { id: "jump_rope", label: "Jump Rope", icon: Footprints },
  { id: "foam_roller", label: "Foam Roller", icon: Grip },
  { id: "trx", label: "TRX / Suspension", icon: Cable },
  { id: "mat", label: "Mat", icon: Box },
  { id: "smith_machine", label: "Smith Machine", icon: ArrowUpDown },
  { id: "ez_bar", label: "EZ Curl Bar", icon: Grip },
  { id: "trap_bar", label: "Trap Bar", icon: Grip },
  { id: "battle_rope", label: "Battle Rope", icon: Cable },
  { id: "sled", label: "Sled", icon: Box },
  { id: "rowing_machine", label: "Rowing Machine", icon: Timer },
  { id: "bike", label: "Stationary Bike", icon: Timer },
  { id: "treadmill", label: "Treadmill", icon: Footprints },
];

export function getEquipmentItem(id: string): EquipmentItem | undefined {
  return EQUIPMENT_LIBRARY.find((e) => e.id === id);
}

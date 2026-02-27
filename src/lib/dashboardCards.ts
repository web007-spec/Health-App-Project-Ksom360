export interface DashboardCardConfig {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_CARD_ORDER: DashboardCardConfig[] = [
  { key: "calendar", label: "Calendar Strip", visible: true },
  { key: "workouts", label: "Today's Workout", visible: true },
  { key: "fasting", label: "Fasting Protocol", visible: true },
  { key: "restore", label: "Restore Recovery", visible: true },
  { key: "engine_cards", label: "Focus / Check-in / Readiness", visible: true },
  { key: "coach_tip", label: "Coach Tip & Progress", visible: true },
  { key: "habits", label: "Habits", visible: true },
  { key: "nutrition", label: "Nutrition / Macros", visible: true },
  { key: "food_journal", label: "Food Journal", visible: true },
  { key: "step_tracker", label: "Step Tracker", visible: true },
  { key: "tasks", label: "Tasks", visible: true },
  { key: "progress", label: "My Progress", visible: true },
  { key: "game_stats", label: "Game Stats", visible: true },
  { key: "cardio", label: "Cardio Activity", visible: true },
];

export function mergeWithDefaults(saved: DashboardCardConfig[] | null): DashboardCardConfig[] {
  if (!saved || saved.length === 0) return [...DEFAULT_CARD_ORDER];
  
  // Build map from saved
  const savedMap = new Map(saved.map(c => [c.key, c]));
  
  // Start with saved order, then append any new defaults not in saved
  const result: DashboardCardConfig[] = [];
  for (const card of saved) {
    const def = DEFAULT_CARD_ORDER.find(d => d.key === card.key);
    if (def) {
      result.push({ ...def, visible: card.visible });
    }
  }
  
  // Add any new cards that weren't in the saved config
  for (const def of DEFAULT_CARD_ORDER) {
    if (!savedMap.has(def.key)) {
      result.push({ ...def });
    }
  }
  
  return result;
}

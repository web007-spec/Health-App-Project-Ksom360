// Custom copy for specific protocol detail pages
// Keyed by protocol ID

export interface ProtocolDetailCopy {
  statsLabel?: string; // e.g. "12–13h" instead of computed "14h"
  howItWorks: string[];
  progression?: {
    label: string;
    fastHours: string;
    eatHours: string;
  }[];
  progressionNote?: string;
  schedule: {
    stopEating: string;
    breakFast: string;
  };
  scheduleMeals: string[];
  scheduleNote?: string;
  mealStrategy: string[];
  whatToExpect: string[];
  whatToExpectNote?: string;
  coachGuidance: string[];
  whoThisIsFor: string[];
}

export const PROTOCOL_DETAIL_COPY: Record<string, ProtocolDetailCopy> = {
  // 7-Day Fasting Kickstart
  "ed8e5c8c-fa9f-4465-88a9-af8dbcdca42e": {
    statsLabel: "12–13h",
    howItWorks: [
      "The 7-Day Fasting Kickstart introduces fasting gradually to help your body adjust without stress.",
      "This protocol focuses on consistency, hydration, and meal timing rather than long fasting windows.",
      "The goal is to build confidence and routine.",
    ],
    progression: [
      { label: "Days 1–3", fastHours: "12h", eatHours: "12h" },
      { label: "Days 4–7", fastHours: "13h", eatHours: "11h" },
    ],
    progressionNote: "This gradual increase helps the body adapt comfortably.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "8:00–9:00 AM",
    },
    scheduleMeals: ["Breakfast", "Lunch", "Dinner"],
    scheduleNote: "No calorie restriction required — focus on timing.",
    mealStrategy: [
      "Eat balanced meals that include protein, healthy fats, and whole foods.",
      "Avoid frequent snacking and late-night eating.",
      "Hydration is important during fasting hours.",
    ],
    whatToExpect: [
      "Mild hunger adjustments during the first few days",
      "Improved awareness of hunger patterns",
      "Better sleep from consistent meal timing",
    ],
    whatToExpectNote: "By the end of the week, fasting should feel natural.",
    coachGuidance: [
      "Consistency matters more than perfection.",
      "If you miss a day, restart the next day.",
      "Drink water during fasting hours.",
      "Focus on meal timing before food quality.",
    ],
    whoThisIsFor: [
      "Clients new to fasting or returning after a long break.",
      "Ideal starting point before progressing to longer fasting windows.",
    ],
  },
};

// Custom copy for specific protocol detail pages
// Keyed by protocol ID

export interface ProtocolDetailCopy {
  statsLabel?: string; // e.g. "12–13h" instead of computed "14h"
  difficultyLabel?: string; // e.g. "Beginner–Intermediate"
  descriptionOverride?: string;
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

  // 14-Day Weight Kickstart
  "cfee737d-5eba-4806-809d-b4a0d940449f": {
    difficultyLabel: "Beg–Int",
    descriptionOverride: "A structured two-week fasting program designed to jumpstart metabolism and establish consistent fat-burning routines.",
    statsLabel: "14h",
    howItWorks: [
      "The 14-Day Weight Kickstart builds on the foundations of fasting by introducing a consistent 14-hour fasting window.",
      "At this length, the body begins to regularly deplete liver glycogen stores, encouraging the use of stored body fat for energy.",
      "The focus is on consistency and metabolic rhythm.",
    ],
    progression: [
      { label: "Days 1–4", fastHours: "13h", eatHours: "11h" },
      { label: "Days 5–14", fastHours: "14h", eatHours: "10h" },
    ],
    progressionNote: "This gradual progression improves adherence while preparing the body for longer fasting windows.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "10:00 AM",
    },
    scheduleMeals: ["Late breakfast or early lunch", "Dinner", "Optional protein snack"],
    scheduleNote: "Avoid late-night eating.",
    mealStrategy: [
      "Start meals with protein to stabilize appetite and energy.",
      "Focus on: protein-rich foods, vegetables, healthy fats, and moderate carbohydrates.",
      "Avoid sugar-heavy foods during this protocol.",
    ],
    whatToExpect: [
      "First few days: Mild hunger adjustments",
      "By week one: More stable morning energy",
      "By week two: Reduced cravings and improved appetite control",
    ],
    whatToExpectNote: "Many clients begin noticing early weight loss during this protocol.",
    coachGuidance: [
      "Stay hydrated during fasting hours.",
      "Keep meals simple and consistent.",
      "Avoid compensating by overeating during the eating window.",
      "Daily walking supports fat-loss progress.",
    ],
    whoThisIsFor: [
      "Clients ready to move beyond beginner fasting.",
      "Ideal after completing the 7-Day Kickstart or for those familiar with intermittent fasting.",
    ],
  },

  // 28-Day Metabolic Reset
  "997fa6e0-2992-4a1a-a92d-2c111389131b": {
    statsLabel: "16–18h",
    difficultyLabel: "Inter",
    descriptionOverride: "A structured four-week fasting protocol designed to improve insulin sensitivity, stabilize appetite, and restore metabolic rhythm.",
    howItWorks: [
      "The 28-Day Metabolic Reset gradually increases fasting duration to improve metabolic efficiency and appetite regulation.",
      "By extending fasting windows over four weeks, the body becomes more comfortable using stored fat for energy while maintaining stable blood sugar levels.",
      "This protocol focuses on consistency, meal quality, and metabolic rhythm.",
    ],
    progression: [
      { label: "Week 1", fastHours: "14h", eatHours: "10h" },
      { label: "Week 2", fastHours: "16h", eatHours: "8h" },
      { label: "Week 3", fastHours: "16h", eatHours: "8h" },
      { label: "Week 4", fastHours: "18h", eatHours: "6h" },
    ],
    progressionNote: "The progression allows the body to adapt while strengthening fat-burning efficiency.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "12:00–2:00 PM",
    },
    scheduleMeals: ["Lunch", "Dinner", "Optional protein snack"],
    scheduleNote: "Late-night eating should be avoided during this protocol.",
    mealStrategy: [
      "Start meals with protein to support muscle maintenance and appetite regulation.",
      "Focus on: protein-rich meals, vegetables, healthy fats, and lower-carbohydrate foods.",
      "Avoid processed foods and frequent snacking.",
    ],
    whatToExpect: [
      "Week 1: Routine adjustment",
      "Week 2: Improved energy stability",
      "Week 3: Appetite regulation",
      "Week 4: Stronger fat-burning rhythm",
    ],
    whatToExpectNote: "Many clients experience noticeable body-composition changes during this protocol.",
    coachGuidance: [
      "Stay hydrated during fasting hours.",
      "Keep meals nutrient-dense and simple.",
      "Avoid overeating during the eating window.",
      "Prioritize sleep and light daily movement.",
      "Consistency across the full 28 days matters more than perfection.",
    ],
    whoThisIsFor: [
      "Clients ready for a structured metabolic reset.",
      "Ideal after completing the 21-Day Fat Loss Ladder or for those experienced with intermittent fasting.",
    ],
  },
};

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

  // 7-Day Energy Reset
  "81ee7723-9a87-4fd6-bc4c-1e1ceac2e009": {
    statsLabel: "13–14h",
    descriptionOverride: "A gentle fasting protocol designed to stabilize blood sugar, reduce energy crashes, and restore daily rhythm.",
    howItWorks: [
      "The 7-Day Energy Reset focuses on stabilizing energy levels through consistent fasting windows and balanced meals.",
      "Instead of pushing longer fasts, this protocol prioritizes metabolic rhythm, hydration, and meal timing to reduce fatigue and improve daily focus.",
      "This is often used as a reset after inconsistent eating patterns.",
    ],
    progression: [
      { label: "Days 1–3", fastHours: "13h", eatHours: "11h" },
      { label: "Days 4–7", fastHours: "14h", eatHours: "10h" },
    ],
    progressionNote: "The small increase supports steady energy without stress.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "9:00–10:00 AM",
    },
    scheduleMeals: ["Breakfast or late breakfast", "Lunch", "Dinner"],
    scheduleNote: "Avoid late-night snacking during this protocol.",
    mealStrategy: [
      "Focus on steady energy meals.",
      "Prioritize: protein, healthy fats, whole foods, and fiber-rich vegetables.",
      "Avoid: sugar-heavy foods, large late-night meals, and frequent snacking.",
    ],
    whatToExpect: [
      "First few days: More awareness of hunger timing",
      "Mid-week: Reduced afternoon energy crashes",
      "End of week: More stable daily energy and improved focus",
    ],
    whatToExpectNote: "Many clients notice better sleep patterns during this protocol.",
    coachGuidance: [
      "Hydration is essential during fasting hours.",
      "Keep meal timing consistent each day.",
      "Avoid skipping meals during the eating window.",
      "Light movement supports energy regulation.",
      "This protocol is about rhythm, not restriction.",
    ],
    whoThisIsFor: [
      "Clients experiencing energy crashes or inconsistent eating patterns.",
      "Ideal for beginners or as a reset between more intensive protocols.",
    ],
  },

  // 14-Day Steady Energy
  "ab37e5dd-d08b-4806-b09a-aaab1e2db101": {
    statsLabel: "14–15h",
    difficultyLabel: "Beg–Int",
    descriptionOverride: "A two-week fasting protocol designed to stabilize energy levels, improve digestion, and support consistent daily rhythm.",
    howItWorks: [
      "The 14-Day Steady Energy protocol builds consistent fasting habits that help regulate blood sugar and reduce energy fluctuations throughout the day.",
      "By gradually increasing fasting duration and maintaining consistent meal timing, the body becomes more efficient at maintaining stable energy levels between meals.",
      "This protocol focuses on rhythm, digestion, and sustainable energy.",
    ],
    progression: [
      { label: "Week 1", fastHours: "14h", eatHours: "10h" },
      { label: "Week 2", fastHours: "15h", eatHours: "9h" },
    ],
    progressionNote: "This progression encourages metabolic stability without aggressive fasting.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "10:00–11:00 AM",
    },
    scheduleMeals: ["Late breakfast or lunch", "Dinner", "Optional protein snack"],
    scheduleNote: "Consistency in timing is more important than exact clock times.",
    mealStrategy: [
      "Focus on meals that support steady energy.",
      "Prioritize: protein-rich meals, healthy fats, vegetables, and whole foods.",
      "Avoid: high-sugar foods, frequent snacking, and late-night eating.",
      "Balanced meals help maintain stable blood sugar during fasting periods.",
    ],
    whatToExpect: [
      "Week 1: More consistent hunger timing and improved digestion",
      "Week 2: Reduced cravings and steadier daily energy",
    ],
    whatToExpectNote: "Many clients notice improved focus and fewer afternoon energy dips.",
    coachGuidance: [
      "Stay hydrated throughout the day.",
      "Keep meal timing consistent.",
      "Start meals with protein.",
      "Avoid overeating during the eating window.",
      "Light daily movement supports energy stability.",
      "This protocol builds sustainable metabolic rhythm.",
    ],
    whoThisIsFor: [
      "Clients who want more stable daily energy and improved focus.",
      "Ideal after completing the 7-Day Energy Reset or for those comfortable with moderate fasting windows.",
    ],
  },

  // 21-Day Rhythm Restore
  "ae849c0a-c0e9-4697-970c-a0df6c1f394e": {
    statsLabel: "15–16h",
    difficultyLabel: "Inter",
    descriptionOverride: "A structured fasting protocol designed to restore circadian rhythm, reduce evening cravings, and support metabolic timing.",
    howItWorks: [
      "The 21-Day Rhythm Restore protocol focuses on aligning meal timing with the body's natural daily rhythm.",
      "By reducing late-night eating and gradually extending fasting windows, this protocol helps regulate appetite hormones, stabilize insulin levels, and improve sleep quality.",
      "The goal is to restore metabolic rhythm through consistency.",
    ],
    progression: [
      { label: "Week 1", fastHours: "15h", eatHours: "9h" },
      { label: "Week 2", fastHours: "16h", eatHours: "8h" },
      { label: "Week 3", fastHours: "16h", eatHours: "8h" },
    ],
    progressionNote: "The consistent fasting window reinforces appetite regulation and metabolic timing.",
    schedule: {
      stopEating: "7:00–8:00 PM",
      breakFast: "11:00 AM–12:00 PM",
    },
    scheduleMeals: ["Lunch", "Dinner", "Optional protein snack"],
    scheduleNote: "Earlier dinner timing is encouraged during this protocol.",
    mealStrategy: [
      "Prioritize meals earlier in the day when possible.",
      "Focus on: protein-rich meals, vegetables, healthy fats, and whole foods.",
      "Limit: late-night eating, sugary snacks, and highly processed foods.",
      "Evening meal timing plays an important role in this protocol.",
    ],
    whatToExpect: [
      "Week 1: Adjusting meal timing and reducing late-night hunger",
      "Week 2: Improved sleep and appetite stability",
      "Week 3: More predictable hunger patterns and steady energy",
    ],
    whatToExpectNote: "Many clients notice improved sleep quality during this protocol.",
    coachGuidance: [
      "Finish eating earlier in the evening when possible.",
      "Stay hydrated during fasting hours.",
      "Start meals with protein.",
      "Keep daily routines consistent.",
      "Prioritize sleep during this protocol.",
      "Consistency in timing drives results.",
    ],
    whoThisIsFor: [
      "Clients looking to improve sleep, appetite control, and daily rhythm.",
      "Ideal after completing Steady Energy or for clients struggling with late-night eating.",
    ],
  },

  // Health Foundations
  "bc838199-903d-40c7-98e6-3d6434edf4c9": {
    statsLabel: "13–14h",
    descriptionOverride: "A gentle fasting protocol designed to support metabolic health, digestion, and long-term consistency.",
    howItWorks: [
      "The Health Foundations protocol introduces fasting as a daily wellness habit rather than a weight-loss tool.",
      "By maintaining moderate fasting windows and consistent meal timing, the body can support digestion, insulin regulation, and overall metabolic balance.",
      "This protocol focuses on long-term health and sustainability.",
    ],
    progression: [
      { label: "Week 1", fastHours: "13h", eatHours: "11h" },
      { label: "Week 2", fastHours: "14h", eatHours: "10h" },
    ],
    progressionNote: "The gradual progression supports comfort and consistency.",
    schedule: {
      stopEating: "8:00 PM",
      breakFast: "9:00–10:00 AM",
    },
    scheduleMeals: ["Breakfast or late breakfast", "Lunch", "Dinner"],
    scheduleNote: "Consistency is more important than exact timing.",
    mealStrategy: [
      "Focus on nutrient-dense meals that support overall health.",
      "Prioritize: protein-rich foods, vegetables, healthy fats, and whole foods.",
      "Avoid: frequent snacking, highly processed foods, and late-night eating.",
    ],
    whatToExpect: [
      "Week 1: Improved awareness of hunger and meal timing",
      "Week 2: More stable digestion and energy",
    ],
    whatToExpectNote: "Many clients notice improved sleep and reduced evening cravings.",
    coachGuidance: [
      "Hydration supports digestion and fasting comfort.",
      "Keep meals simple and balanced.",
      "Focus on consistency rather than perfection.",
      "Light daily movement supports metabolic health.",
      "This protocol builds long-term habits.",
    ],
    whoThisIsFor: [
      "Clients focused on long-term health rather than aggressive fat loss.",
      "Ideal starting point for beginners or clients returning to structure.",
    ],
  },
};

import { expectedPct, daysTotal, dayNumber } from "./goalDates";

export type PaceStatus = "ahead" | "on_pace" | "behind";

/**
 * Progress % for a weight-loss/gain goal.
 * progressPct = ((startWeight - todayWeight) / (startWeight - goalWeight)) * 100
 * Clamped 0–100.
 */
export function weightProgressPct(
  startWeight: number,
  todayWeight: number,
  goalWeight: number
): number {
  const totalChange = startWeight - goalWeight;
  if (totalChange === 0) return 100;
  const currentChange = startWeight - todayWeight;
  return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
}

/**
 * Determine if the client is ahead, on pace, or behind schedule.
 */
export function paceStatus(
  progressPct: number,
  startDate: string,
  targetDate: string
): PaceStatus {
  const expected = expectedPct(startDate, targetDate);
  const diff = progressPct - expected;
  if (diff >= 2) return "ahead";
  if (diff <= -2) return "behind";
  return "on_pace";
}

/**
 * Required weight tomorrow to be back on pace.
 * tomorrow's expectedPct = (dayNumber(startDate) + 1) / daysTotal(startDate, targetDate) * 100
 * requiredWeight = startWeight - (expectedPctTomorrow / 100) * (startWeight - goalWeight)
 */
export function requiredWeightTomorrow(
  startWeight: number,
  goalWeight: number,
  startDate: string,
  targetDate: string
): number {
  const total = daysTotal(startDate, targetDate);
  const tomorrowDay = dayNumber(startDate) + 1;
  const expectedPctTomorrow = Math.min(100, (tomorrowDay / total) * 100);
  const requiredWeight = startWeight - (expectedPctTomorrow / 100) * (startWeight - goalWeight);
  return Math.round(requiredWeight * 10) / 10;
}

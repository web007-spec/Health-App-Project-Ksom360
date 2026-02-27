import { differenceInCalendarDays, parseISO, addDays } from "date-fns";

/**
 * Inclusive day count between two dates.
 * startDate = day 1.
 */
export function daysTotal(startDate: string, targetDate: string): number {
  return differenceInCalendarDays(parseISO(targetDate), parseISO(startDate)) + 1;
}

/**
 * Inclusive days since start date. startDate = day 1.
 */
export function dayNumber(startDate: string): number {
  return differenceInCalendarDays(new Date(), parseISO(startDate)) + 1;
}

/**
 * Expected completion % based on time elapsed.
 */
export function expectedPct(startDate: string, targetDate: string): number {
  const total = daysTotal(startDate, targetDate);
  const current = dayNumber(startDate);
  return Math.min(100, Math.max(0, (current / total) * 100));
}

/**
 * Days remaining until target date.
 */
export function daysRemaining(targetDate: string): number {
  return differenceInCalendarDays(parseISO(targetDate), new Date());
}

/**
 * Tomorrow's date string (yyyy-MM-dd)
 */
export function tomorrowDateStr(): string {
  return addDays(new Date(), 1).toISOString().split("T")[0];
}

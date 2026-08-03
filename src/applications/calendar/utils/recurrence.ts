import { CalendarEvent } from '../../../types';

/**
 * Checks if a given calendar event applies to targetDate ISO string (YYYY-MM-DD),
 * considering its recurrence rules ('none' | 'daily' | 'weekly' | 'monthly' | 'yearly').
 */
export function isEventOnDate(evt: CalendarEvent, targetDateISO: string): boolean {
  if (!evt.date) return false;
  
  // Exact match
  if (evt.date === targetDateISO) return true;

  // If no recurrence, only exact date match applies
  if (!evt.recurrence || evt.recurrence === 'none') return false;

  const eventDate = new Date(evt.date + 'T00:00:00');
  const targetDate = new Date(targetDateISO + 'T00:00:00');

  // Recurrence cannot trigger before the initial event date
  if (targetDate < eventDate) return false;

  switch (evt.recurrence) {
    case 'daily':
      return true;

    case 'weekly':
      return eventDate.getDay() === targetDate.getDay();

    case 'monthly':
      return eventDate.getDate() === targetDate.getDate();

    case 'yearly':
      return (
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getDate() === targetDate.getDate()
      );

    default:
      return false;
  }
}

/**
 * Expands a list of events for a date range, duplicating recurring events appropriately.
 */
export function getEventsForDate(
  events: CalendarEvent[],
  targetDateISO: string,
  enabledCategories: Record<string, boolean>
): CalendarEvent[] {
  return events.filter((evt) => {
    // Check category filter
    if (evt.category && enabledCategories[evt.category] === false) {
      return false;
    }
    return isEventOnDate(evt, targetDateISO);
  });
}

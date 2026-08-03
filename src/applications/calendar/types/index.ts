import { CalendarEvent } from '../../../types';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'agenda';

export type EventCategory = 'Personal' | 'Work' | 'Family' | 'Important';

export interface TeammateAvailability {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  busyHours: number[]; // Hours of the day that are busy, e.g. [9, 10, 14]
}

export const TIMEZONES = [
  { id: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: '-05:00' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', offset: '-08:00' },
  { id: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: '+00:00' },
  { id: 'Europe/London', label: 'Greenwich Mean Time (GMT/BST)', offset: '+00:00' },
  { id: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
  { id: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
  { id: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)', offset: '+10:00' },
];

export const DEFAULT_TEAMMATES: TeammateAvailability[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@driveosx.com', avatar: '👨‍💻', role: 'Lead Architect', busyHours: [9, 10, 14] },
  { id: '2', name: 'Sarah Miller', email: 'sarah@driveosx.com', avatar: '👩‍🎨', role: 'UX Designer', busyHours: [11, 12, 15] },
  { id: '3', name: 'Dev Team', email: 'dev@driveosx.com', avatar: '🚀', role: 'Engineering', busyHours: [10, 11, 16] },
  { id: '4', name: 'Product Lead', email: 'pm@driveosx.com', avatar: '📊', role: 'Product Manager', busyHours: [13, 14, 15] },
];

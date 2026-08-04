import { Contact } from '../../types';

export interface ContactGroup {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export type FilterCategory =
  | 'all'
  | 'favorites'
  | 'label'
  | 'company'
  | 'department'
  | 'team';

export interface ContactsFilterState {
  category: FilterCategory;
  selectedLabel?: string;
  selectedCompany?: string;
  selectedDepartment?: string;
  selectedTeam?: string;
  searchQuery: string;
}

export const DEFAULT_GROUPS: ContactGroup[] = [
  { id: 'work', name: 'Work', color: 'bg-blue-500 text-white' },
  { id: 'personal', name: 'Personal', color: 'bg-emerald-500 text-white' },
  { id: 'family', name: 'Family', color: 'bg-rose-500 text-white' },
  { id: 'vip', name: 'VIP', color: 'bg-amber-500 text-white' },
  { id: 'tech-team', name: 'Tech Team', color: 'bg-purple-500 text-white' },
  { id: 'marketing', name: 'Marketing', color: 'bg-cyan-500 text-white' },
];

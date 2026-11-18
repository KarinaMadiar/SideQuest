export type UserRole = 'student' | 'organizer' | 'admin';
export type VisibilitySetting = 'public' | 'campus_only' | 'hidden';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  auth_provider?: 'local' | 'google' | 'cognito' | string;
  cognito_sub?: string | null;
  avatar_url?: string | null;
  profile_description?: string | null;
  visibility_settings: VisibilitySetting;
  created_at: string;
  updated_at: string;
}

export interface UserBrief {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  visibility_settings: VisibilitySetting;
}

export type SideQuestCategory =
  | 'coffee'
  | 'sports'
  | 'walks'
  | 'study'
  | 'culture'
  | 'career'
  | 'volunteering'
  | 'other';

export type SideQuestStatus = 'open' | 'full' | 'canceled' | 'completed';

export interface SideQuestParticipant {
  id: string;
  user: UserBrief;
  joined_at: string;
}

export interface SideQuest {
  id: string;
  creator: UserBrief;
  title: string;
  description: string;
  category: SideQuestCategory;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  capacity: number;
  status: SideQuestStatus;
  participant_count: number;
  is_joined?: boolean;
  participants: SideQuestParticipant[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationBrief {
  id: string;
  name: string;
  type: string;
  logo_url?: string | null;
  verification_status: string;
}

export interface Speaker {
  id: string;
  name: string;
  short_bio: string;
  position?: string | null;
  linkedin_url?: string | null;
  display_order: number;
}

export interface Attendee {
  id: string;
  user: UserBrief;
  joined_at: string;
}

export type EventCategory =
  | 'lecture'
  | 'workshop'
  | 'conference'
  | 'career'
  | 'social'
  | 'culture'
  | 'other';

export type EventStatus = 'published' | 'canceled' | 'completed';

export interface Event {
  id: string;
  organization?: OrganizationBrief | null;
  creator: UserBrief;
  title: string;
  description: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string;
  location: string;
  registration_url?: string | null;
  why_attend?: string | null;
  preparation_notes?: string | null;
  status: EventStatus;
  speakers: Speaker[];
  attendee_count: number;
  is_attending?: boolean;
  attendees: Attendee[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

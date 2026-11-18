import {
  User,
  SideQuest,
  Event,
  OrganizationBrief,
  PaginatedResponse,
  SideQuestCategory,
  EventCategory,
  SideQuestStatus,
  EventStatus
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sidequest_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sidequest_token', token);
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sidequest_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined' && endpoint !== '/auth/login') {
        removeToken();
        window.dispatchEvent(new CustomEvent('sidequest:unauthorized'));
      }
      let message = 'Виникла помилка при зверненні до сервера';
      if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.errors) {
        message = Array.isArray(data.errors) ? data.errors.join(', ') : String(data.errors);
      }
      throw new ApiError(message, res.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Не вдалося з\'єднатися із сервером. Перевірте мережеве підключення.', 0);
  }
}

export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const res = await request<{ access_token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      setToken(res.access_token);
      return res;
    },
    register: async (payload: { email: string; password: string; name: string; role?: string }) => {
      const res = await request<{ access_token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setToken(res.access_token);
      return res;
    },
    syncCognitoSession: async (cognitoAccessToken: string) => {
      setToken(cognitoAccessToken);
      try {
        const user = await request<User>('/auth/cognito/sync', {
          method: 'POST',
        });
        return user;
      } catch (err) {
        removeToken();
        throw err;
      }
    },
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        removeToken();
      }
    },
  },

  // Users & Me
  users: {
    getMe: () => request<User>('/me'),
    updateMe: (data: Partial<Pick<User, 'name' | 'avatar_url' | 'profile_description' | 'visibility_settings'>>) =>
      request<User>('/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // SideQuests
  sidequests: {
    list: (params: {
      search?: string;
      category?: SideQuestCategory | string;
      status?: SideQuestStatus | string;
      creator_id?: string;
      page?: number;
      size?: number;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.category) q.append('category', params.category);
      if (params.status) q.append('status', params.status);
      if (params.creator_id) q.append('creator_id', params.creator_id);
      if (params.page) q.append('page', String(params.page));
      if (params.size) q.append('size', String(params.size));
      return request<PaginatedResponse<SideQuest>>(`/sidequests?${q.toString()}`);
    },
    getById: (id: string) => request<SideQuest>(`/sidequests/${id}`),
    create: (data: {
      title: string;
      description: string;
      category: string;
      starts_at: string;
      ends_at?: string | null;
      location: string;
      capacity: number;
    }) =>
      request<SideQuest>('/sidequests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{
      title: string;
      description: string;
      category: string;
      starts_at: string;
      ends_at: string;
      location: string;
      capacity: number;
      status: SideQuestStatus;
    }>) =>
      request<SideQuest>(`/sidequests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    cancel: (id: string) =>
      request<SideQuest>(`/sidequests/${id}`, {
        method: 'DELETE',
      }),
    join: (id: string) =>
      request<SideQuest>(`/sidequests/${id}/join`, {
        method: 'POST',
      }),
    leave: (id: string) =>
      request<SideQuest>(`/sidequests/${id}/join`, {
        method: 'DELETE',
      }),
    getMySidequests: (filterType: 'all' | 'created' | 'joined' = 'all', page = 1, size = 20) =>
      request<PaginatedResponse<SideQuest>>(`/me/sidequests?filter_type=${filterType}&page=${page}&size=${size}`),
  },

  // Events
  events: {
    list: (params: {
      search?: string;
      category?: EventCategory | string;
      status?: EventStatus | string;
      organization_id?: string;
      page?: number;
      size?: number;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.category) q.append('category', params.category);
      if (params.status) q.append('status', params.status);
      if (params.organization_id) q.append('organization_id', params.organization_id);
      if (params.page) q.append('page', String(params.page));
      if (params.size) q.append('size', String(params.size));
      return request<PaginatedResponse<Event>>(`/events?${q.toString()}`);
    },
    getById: (id: string) => request<Event>(`/events/${id}`),
    create: (data: {
      title: string;
      description: string;
      category: string;
      starts_at: string;
      ends_at: string;
      location: string;
      organization_id?: string | null;
      registration_url?: string | null;
      why_attend?: string | null;
      preparation_notes?: string | null;
      speakers?: Array<{
        name: string;
        short_bio: string;
        position?: string | null;
        linkedin_url?: string | null;
        display_order: number;
      }>;
    }) =>
      request<Event>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<Event>(`/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    attend: (id: string) =>
      request<Event>(`/events/${id}/attend`, {
        method: 'POST',
      }),
    leave: (id: string) =>
      request<Event>(`/events/${id}/attend`, {
        method: 'DELETE',
      }),
    getMyEvents: (page = 1, size = 20) =>
      request<PaginatedResponse<Event>>(`/me/events?page=${page}&size=${size}`),
  },

  // Organizations
  organizations: {
    list: () => request<OrganizationBrief[]>('/organizations'),
    getById: (id: string) => request<OrganizationBrief>(`/organizations/${id}`),
  },
};

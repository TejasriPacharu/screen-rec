// frontend/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  telegramChatId?: string;
}

export interface Recording {
  _id: string;
  userId: string;
  title: string;
  link: string;
  s3Key?: string;
  size?: number;
  duration?: number;
  views?: number;
  public?: boolean;
  createdAt: string;
  status?: 'PROCESSING' | 'TRANSCRIBED' | 'AI_GENERATED' | 'READY' | 'FAILED' | null;
  transcript?: string;
  error?: string;
  ai?: {
    title: string;
    summary: string;
    chapters: { timestamp: string; heading: string }[];
    keyTakeaways: string[];
  };
}

export interface ProcessRecordingResponse {
  message: string;
  recordingId: string;
  link: string;
}

export interface RecordingStatusResponse {
  _id: string;
  status: Recording['status'];
  title: string;
  link: string;
  s3Key?: string;
  ai?: Recording['ai'];
  error?: string;
  duration?: number;
  createdAt: string;
}

export interface CreateRecordingResponse {
  recording: Recording;
  uploadUrl: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // ── Called by the /auth/callback page after Google OAuth redirect ─────────
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  logout(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // ── Redirect browser to backend Google OAuth entry point ──────────────────
  loginWithGoogle(): void {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  // ── Fetch current user info ───────────────────────────────────────────────
  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // ── Core request helper ───────────────────────────────────────────────────
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please sign in again.');
      }
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Recording methods (unchanged) ────────────────────────────────────────
  async getRecordings(): Promise<Recording[]> {
    return this.request<Recording[]>('/recordings');
  }

  async createRecording(title: string, contentType?: string): Promise<CreateRecordingResponse> {
    return this.request<CreateRecordingResponse>('/recordings', {
      method: 'POST',
      body: JSON.stringify({ title, contentType: contentType || 'video/webm' }),
    });
  }

  async updateRecording(id: string, updates: Partial<Recording>): Promise<Recording> {
    return this.request<Recording>(`/recordings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRecording(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/recordings/${id}`, { method: 'DELETE' });
  }

  async getRecordingByLink(link: string): Promise<Recording & { viewUrl: string }> {
    return this.request<Recording & { viewUrl: string }>(`/recordings/${link}`);
  }

  async processRecording(blob: Blob, duration: number): Promise<ProcessRecordingResponse> {
    const url = `${API_BASE_URL}/recordings/process`;
    const formData = new FormData();
    formData.append('video', blob, 'recording.webm');
    formData.append('duration', String(duration));

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please sign in again.');
      }
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getRecordingStatus(id: string): Promise<RecordingStatusResponse> {
    return this.request<RecordingStatusResponse>(`/recordings/${id}/status`);
  }
}

export const apiClient = new ApiClient();
import { StorageService } from './StorageService';
import { useSystemStore } from '../systemStore';

function isServerUnreachable(error: unknown): boolean {
  return (
    !navigator.onLine ||
    (error instanceof TypeError &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_CONNECTION_REFUSED')))
  );
}

function notifyApiFailure(appName: string, message: string) {
  try {
    const notify = useSystemStore.getState().notifyApiError;
    if (notify) {
      notify(appName, message);
    }
  } catch (err) {
    console.warn('Could not dispatch system notification:', err);
  }
}

export class MeetingServiceClass {
  private getHeaders(): HeadersInit {
    const token = StorageService.get<string | null>('webos-jwt-token', null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async createMeeting(payload: { title: string; description?: string; startTime?: string; endTime?: string; passcode?: string; waitingRoomEnabled?: boolean }): Promise<any> {
    try {
      const response = await fetch('/api/v1/meetings', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create meeting');
      }
      return data.meeting;
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('Meeting Service', 'Meeting API unreachable. Using local mode.');
        return {
          _id: `local-${Date.now()}`,
          title: payload.title,
          description: payload.description || '',
          meetingCode: `meet-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5)}`,
          status: 'scheduled',
          startTime: payload.startTime || new Date().toISOString(),
          participants: [],
          chatMessages: [],
        };
      }
      throw error;
    }
  }

  async getTodayMeetings(): Promise<any[]> {
    try {
      const response = await fetch('/api/v1/meetings/today', {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.meetings || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('Meeting Service', 'Meeting API unreachable. No meetings loaded.');
      }
      return [];
    }
  }

  async startMeeting(meetingId: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start meeting');
      }
      return data.meeting;
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('Meeting Service', 'Meeting API unreachable. Starting local meeting.');
        return { _id: meetingId, status: 'active' };
      }
      throw error;
    }
  }

  async joinMeeting(meetingId: string, passcode?: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ passcode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join meeting');
      }
      return data.meeting;
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('Meeting Service', 'Meeting API unreachable. Joining local meeting.');
        return { _id: meetingId, status: 'active', participants: [] };
      }
      throw error;
    }
  }

  async leaveMeeting(meetingId: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/leave`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { message: 'Left meeting' };
    }
  }

  async endMeeting(meetingId: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      return data.meeting;
    } catch (error) {
      if (isServerUnreachable(error)) {
        return { _id: meetingId, status: 'ended' };
      }
      throw error;
    }
  }

  async sendChatMessage(meetingId: string, text: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }
      return data.message;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: `local-${Date.now()}`,
          sender: 'You',
          text,
          time,
          isMe: true,
        };
      }
      throw error;
    }
  }

  async updateParticipant(meetingId: string, updates: any): Promise<any> {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/participant`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update participant');
      }
      return data.meeting;
    } catch (error) {
      if (isServerUnreachable(error)) {
        return { meetingId, updates };
      }
      throw error;
    }
  }
}

export const MeetingService = new MeetingServiceClass();

import { ApiError, http } from '../api/http';

/**
 * Meetings capability. Meetings are inherently online: there is no useful
 * offline fallback for joining a live call, so failures are reported rather
 * than queued (CLAUDE.md §49 — say when a feature needs a connection).
 */
export interface MeetingParticipant {
  id: string;
  userId: string | null;
  name: string;
  role: 'host' | 'cohost' | 'participant';
  isMuted: boolean;
  isVideoOn: boolean;
  joinedAt: string;
}

export interface MeetingMessage {
  id: string;
  sender: string;
  senderId: string | null;
  text: string;
  time: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  _id: string;
  hostId: string;
  meetingCode: string;
  title: string;
  description: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  startTime: string;
  endTime: string | null;
  hasPasscode: boolean;
  waitingRoomEnabled: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowUnmute: boolean;
  allowRecording: boolean;
  isLocked: boolean;
  participants: MeetingParticipant[];
  chatMessages: MeetingMessage[];
  /** Set once this meeting's chat is bridged to a Messaging conversation — see `CreateMeetingPayload.conversationId`. */
  conversationId: string | null;
}

export interface CreateMeetingPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  passcode?: string;
  waitingRoomEnabled?: boolean;
  allowScreenShare?: boolean;
  allowChat?: boolean;
  allowUnmute?: boolean;
  allowRecording?: boolean;
  /** The conversation this call was started from, if any (e.g. Messenger's "Start a call"). */
  conversationId?: string;
}

export class MeetingServiceClass {
  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const data = await http.post<{ meeting: Meeting }>('/meetings', payload);
    return data.meeting;
  }

  async getMeeting(meetingId: string): Promise<Meeting> {
    const data = await http.get<{ meeting: Meeting }>(`/meetings/${meetingId}`);
    return data.meeting;
  }

  /** Returns an empty schedule while offline rather than failing the shell. */
  async getTodayMeetings(): Promise<Meeting[]> {
    try {
      const data = await http.get<{ meetings: Meeting[] }>('/meetings/today');
      return data.meetings;
    } catch (error) {
      if (error instanceof ApiError && error.isOffline) return [];
      throw error;
    }
  }

  async startMeeting(meetingId: string): Promise<Meeting> {
    const data = await http.post<{ meeting: Meeting }>(`/meetings/${meetingId}/start`);
    return data.meeting;
  }

  async joinMeeting(meetingId: string, passcode?: string): Promise<Meeting> {
    const data = await http.post<{ meeting: Meeting }>(`/meetings/${meetingId}/join`, { passcode });
    return data.meeting;
  }

  async leaveMeeting(meetingId: string): Promise<{ message: string; ended: boolean }> {
    return http.post<{ message: string; ended: boolean }>(`/meetings/${meetingId}/leave`);
  }

  async endMeeting(meetingId: string): Promise<Meeting> {
    const data = await http.post<{ meeting: Meeting }>(`/meetings/${meetingId}/end`);
    return data.meeting;
  }

  async sendChatMessage(meetingId: string, text: string): Promise<MeetingMessage> {
    const data = await http.post<{ message: MeetingMessage }>(`/meetings/${meetingId}/chat`, { text });
    return data.message;
  }

  async updateParticipant(
    meetingId: string,
    updates: { isMuted?: boolean; isVideoOn?: boolean },
  ): Promise<MeetingParticipant[]> {
    const data = await http.patch<{ participants: MeetingParticipant[] }>(
      `/meetings/${meetingId}/participant`,
      updates,
    );
    return data.participants;
  }

  async setLocked(meetingId: string, isLocked: boolean): Promise<Meeting> {
    const data = await http.patch<{ meeting: Meeting }>(`/meetings/${meetingId}/lock`, { isLocked });
    return data.meeting;
  }

  /**
   * Opens the realtime signalling socket for a meeting. The access token is
   * passed as a query parameter because the WebSocket API cannot set headers.
   */
  connectSignalling(token: string): WebSocket {
    const base = window.location.origin.replace(/^http/, 'ws');
    return new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);
  }
}

export const MeetingService = new MeetingServiceClass();

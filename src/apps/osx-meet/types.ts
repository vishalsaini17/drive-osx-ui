export interface Participant {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  bgGradient: string;
  breakoutRoomId?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  time: string;
  text: string;
  isMe: boolean;
  attachment?: {
    name: string;
    size: string;
    type: 'pdf' | 'image' | 'doc' | 'archive';
    url?: string;
  };
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  creator: string;
  totalVotes: number;
  /** Every voter's current choice, keyed by their userId (or `'me'` for a
   *  vote cast before the socket knows the local user's id). Kept so a vote
   *  broadcast from a peer can be merged without clobbering anyone else's
   *  vote, and so switching a vote can undo the previous one correctly. */
  votesByVoter: Record<string, string>;
  /** Derived for display, not stored on the wire: the *viewing* user's own
   *  vote, looked up from `votesByVoter` right before rendering. */
  userVotedOptionId?: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participantIds: string[];
}

export interface MeetingSecuritySettings {
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  passcode: string;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowUnmute: boolean;
  allowRecording: boolean;
}

export interface WaitingParticipant {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
}

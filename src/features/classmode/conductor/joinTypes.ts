import type { GameModeId } from '../scoreMapping';

export type JoinErrorCode =
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'SESSION_INACTIVE'
  | 'SESSION_NOT_JOINABLE'
  | 'SESSION_EXPIRED'
  | 'NETWORK_MISMATCH'
  | 'STUDENT_NOT_FOUND'
  | 'NO_ASSIGNED_ACTIVITIES'
  | 'RATE_LIMITED'
  | 'INVALID_NAME'
  | 'JOIN_FAILED'
  | 'OK';

export interface JoinValidationResult {
  valid: boolean;
  code: JoinErrorCode;
  session?: {
    id: string;
    code: string;
    session_code?: string;
    activity: string | null;
    class_state: string;
    current_activity_id: string | null;
    timer_seconds: number;
  };
  retry_after_seconds?: number;
}

export interface NetworkValidationResult {
  match: boolean;
  reason: string;
}

export interface ActivityAssignment {
  activity: GameModeId;
  sequence_order: number;
  is_enabled: boolean;
}

export interface AssignActivityRequest {
  activity: GameModeId;
  sequence_order: number;
}

export interface StudentClassState {
  sessionId: string;
  participantId: string;
  participantName: string;
  sessionStatus: 'waiting' | 'active' | 'paused' | 'ended';
  classState: string;
  activityVersion: number;
  assignedActivity: {
    activity: string;
    state: string;
    sessionActivityId: string;
  } | null;
  kicked: boolean;
  kickedReason: string | null;
  updatedAt: string;
  error?: string;
}

export const JOIN_ERROR_MESSAGES: Record<JoinErrorCode, string> = {
  INVALID_CODE: "We couldn't find that class. Check the code and try again.",
  CODE_EXPIRED: 'This class session has ended. Ask your teacher for a new code.',
  SESSION_INACTIVE: 'This class session is no longer active. Ask your teacher for a new code.',
  SESSION_NOT_JOINABLE: 'This class is not open yet. Ask your teacher to start it.',
  SESSION_EXPIRED: 'This class session has ended. Ask your teacher for a new code.',
  NETWORK_MISMATCH: 'Connect to the same school Wi-Fi as your teacher, then try again.',
  STUDENT_NOT_FOUND: "We couldn't find you in this class. Try joining again.",
  NO_ASSIGNED_ACTIVITIES: 'Your activities are not ready yet. Please ask your teacher.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  INVALID_NAME: 'Please enter your name.',
  JOIN_FAILED: "We couldn't join the class. Please try again.",
  OK: '',
};

// Shared between the browser and the server: limits, colours and the socket events.

export const MAX_MESSAGE_LENGTH = 200;
export const NAME_MIN = 2;
export const NAME_MAX = 24;

export const COLORS = ["#D04A33", "#12876F", "#2F66D0", "#A8397F", "#6A4FD8", "#9A7410"] as const;

export const REPORT_REASONS = ["language", "harassment", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * Why a chat ended, from the point of view of the person receiving it.
 * - time:    the round ran out and you did not both want to continue
 * - cap:     both extensions were used
 * - left:    you left
 * - report:  you reported the other person
 * - ended:   the other person left, reported or disconnected (deliberately vague)
 */
export type EndReason = "time" | "cap" | "left" | "report" | "ended";

export interface Profile {
  name: string;
  color: string;
}

export interface MatchPayload {
  chatId: string;
  partner: Profile;
  topic: string;
  /** Server clock (ms) when this payload was sent, to correct the client's clock. */
  serverNow: number;
  endsAt: number;
  roundMs: number;
  ext: number;
  maxExt: number;
}

export interface ExtendedPayload {
  serverNow: number;
  endsAt: number;
  ext: number;
}

export type ErrorCode = "bad_name" | "banned" | "blocked" | "not_in_chat" | "busy" | "rate" | "bad_request";

export type AckResult<T = object> = ({ ok: true } & T) | { ok: false; error: ErrorCode; until?: number };
export type Ack<T = object> = (res: AckResult<T>) => void;

export interface ServerToClientEvents {
  match: (p: MatchPayload) => void;
  message: (m: { id: string; text: string }) => void;
  typing: () => void;
  topic: (t: { topic: string; by: "me" | "them" }) => void;
  extended: (e: ExtendedPayload) => void;
  ended: (e: { reason: EndReason }) => void;
}

export interface ClientToServerEvents {
  /** Enter the queue. The ack carries the topic you will most likely start with. */
  join: (profile: Profile, ack: Ack<{ topic: string }>) => void;
  cancel: () => void;
  send: (text: string, ack: Ack<{ id: string }>) => void;
  typing: () => void;
  want: (want: boolean) => void;
  nextTopic: () => void;
  leave: () => void;
  report: (reason: ReportReason, ack: Ack) => void;
}

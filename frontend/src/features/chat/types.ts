import type { Profile } from "../profile/types";

export type ChatType = "direct" | "group";

export interface Chat {
  chat_id: string;
  chat_type: ChatType;
  title: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: number;
}

export interface ChatCreated extends Chat {
  members: string[];
  already_existed: boolean;
}

export interface ChatSummary extends Chat {
  peer: Profile | null;
  last_message: string | null;
  last_message_scheme: string | null;
  last_message_at: number | null;
  unread_count: number;
}

export interface MessageContent {
  scheme: string;
  ciphertext: string;
}

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "error";

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sent_at: number;
  client_message_id: string | null;
  content: MessageContent;
  edited_at: number | null;
  deleted_at: number | null;
  /** Server-computed delivery/read state as of the last fetch, from the other member(s)' receipts. */
  status?: "sent" | "delivered" | "read" | null;
  /** Client-only field tracking this message's send/delivery state; not present in server payloads. */
  localStatus?: MessageDeliveryStatus;
}

export interface ChatMemberProfile {
  chat_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: number;
  muted_until: number | null;
  profile: Profile | null;
}

export interface ActiveChat {
  chatId: string;
  chatType: ChatType;
  /** Set for direct chats; null for groups. */
  peer: Profile | null;
  title: string | null;
  avatarUrl: string | null;
}

export type PresenceStatus = "online" | "offline";

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: number | null;
  updated_at: number;
}

import type { Profile } from "../profile/types";

export type ChatType = "direct" | "group";

export interface Chat {
  chat_id: string;
  chat_type: ChatType;
  title: string | null;
  avatar_media_id: string | null;
  created_by: string;
  created_at: number;
}

export interface ChatCreated extends Chat {
  members: string[];
  already_existed: boolean;
}

export interface ChatSummary extends Chat {
  peer: Profile | null;
}

export interface EncryptedContent {
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
  content: EncryptedContent;
  edited_at: number | null;
  deleted_at: number | null;
  /** Client-only field tracking this message's send/delivery state; not present in server payloads. */
  localStatus?: MessageDeliveryStatus;
}

export interface ActiveChat {
  chatId: string;
  peer: Profile;
}

export type PresenceStatus = "online" | "offline";

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: number | null;
  updated_at: number;
}

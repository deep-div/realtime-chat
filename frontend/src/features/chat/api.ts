import { apiFetch } from "../../lib/api/client";
import type { Chat, ChatCreated, ChatMemberProfile, ChatMessage, ChatSummary } from "./types";

export async function createDirectChat(recipientId: string): Promise<ChatCreated> {
  return apiFetch<ChatCreated>("/chats", {
    method: "POST",
    body: JSON.stringify({ chat_type: "direct", recipient_id: recipientId }),
  });
}

export async function createGroupChat(title: string, memberIds: string[]): Promise<ChatCreated> {
  return apiFetch<ChatCreated>("/chats", {
    method: "POST",
    body: JSON.stringify({ chat_type: "group", title, member_ids: memberIds }),
  });
}

export async function listMyChats(limit = 50, before?: number): Promise<ChatSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before !== undefined) params.set("before", String(before));
  return apiFetch<ChatSummary[]>(`/chats?${params.toString()}`);
}

export async function getChatMessages(chatId: string, limit = 50): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/chats/${chatId}/messages?limit=${limit}`);
}

export async function getChatMembers(chatId: string): Promise<ChatMemberProfile[]> {
  return apiFetch<ChatMemberProfile[]>(`/chats/${chatId}/members`);
}

export async function addChatMember(chatId: string, userId: string): Promise<ChatMemberProfile> {
  return apiFetch<ChatMemberProfile>(`/chats/${chatId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeChatMember(chatId: string, memberUserId: string): Promise<void> {
  await apiFetch<void>(`/chats/${chatId}/members/${memberUserId}`, {
    method: "DELETE",
  });
}

/** Renames a group chat. Caller must be an owner/admin. */
export async function updateGroupChat(chatId: string, title: string): Promise<Chat> {
  return apiFetch<Chat>(`/chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

/** Uploads a group chat's photo. Caller must be an owner/admin. */
export async function uploadGroupAvatar(chatId: string, file: File): Promise<Chat> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<Chat>(`/chats/${chatId}/avatar`, {
    method: "POST",
    body: formData,
  });
}

/** Clears a group chat's photo. Caller must be an owner/admin. */
export async function removeGroupAvatar(chatId: string): Promise<Chat> {
  return apiFetch<Chat>(`/chats/${chatId}/avatar`, {
    method: "DELETE",
  });
}

/** Deletes a chat from the caller's own view only - it reappears once a new message arrives. */
export async function deleteChat(chatId: string): Promise<void> {
  await apiFetch<void>(`/chats/${chatId}`, {
    method: "DELETE",
  });
}

/** Deletes one or more of the caller's own messages for everyone in the chat. */
export async function deleteMessages(chatId: string, messageIds: string[]): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/chats/${chatId}/messages`, {
    method: "DELETE",
    body: JSON.stringify({ message_ids: messageIds }),
  });
}

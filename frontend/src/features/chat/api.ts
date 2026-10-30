import { apiFetch } from "../../lib/api/client";
import type { ChatCreated, ChatMemberProfile, ChatMessage, ChatSummary } from "./types";

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

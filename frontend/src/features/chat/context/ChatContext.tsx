import {
  type ReactNode,
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import type { Profile } from "../../profile/types";
import { createDirectChat, getChatMessages, listMyChats } from "../api";
import { ChatSocket } from "../socket";
import type { ActiveChat, ChatMessage, ChatSummary } from "../types";

/** No real end-to-end encryption yet - placeholder scheme until key exchange is designed. */
const PLACEHOLDER_SCHEME = "plaintext-v0";

interface ChatContextValue {
  chats: ChatSummary[];
  isLoadingChats: boolean;
  activeChat: ActiveChat | null;
  messages: ChatMessage[];
  openChat: (chat: ChatSummary) => Promise<void>;
  startDirectChat: (peer: Profile) => Promise<void>;
  sendMessage: (text: string) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      setChats([]);
      return;
    }

    setIsLoadingChats(true);
    listMyChats()
      .then(setChats)
      .finally(() => setIsLoadingChats(false));
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = new ChatSocket({
      onNewMessage: (message) => {
        setMessagesByChatId((prev) => {
          const existing = prev[message.chat_id] ?? [];
          if (existing.some((m) => m.message_id === message.message_id)) return prev;
          return { ...prev, [message.chat_id]: [...existing, message] };
        });
      },
      onMessageStatus: ({ messageId, status, message }) => {
        setMessagesByChatId((prev) => {
          const chatId = message?.chat_id ?? Object.keys(prev).find((id) =>
            prev[id].some((m) => m.client_message_id === message?.client_message_id || m.message_id === messageId),
          );
          if (!chatId) return prev;

          const chatMessages = prev[chatId] ?? [];
          const updated = chatMessages.map((m) => {
            const matches = message
              ? m.client_message_id === message.client_message_id
              : m.message_id === messageId;
            if (!matches) return m;
            return {
              ...(message ?? m),
              localStatus: status as ChatMessage["localStatus"],
            };
          });
          return { ...prev, [chatId]: updated };
        });
      },
      onMessageError: ({ clientMessageId }) => {
        if (!clientMessageId) return;
        setMessagesByChatId((prev) => {
          const chatId = Object.keys(prev).find((id) =>
            prev[id].some((m) => m.client_message_id === clientMessageId),
          );
          if (!chatId) return prev;
          const updated = prev[chatId].map((m) =>
            m.client_message_id === clientMessageId ? { ...m, localStatus: "error" as const } : m,
          );
          return { ...prev, [chatId]: updated };
        });
      },
    });
    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, profile]);

  async function loadMessagesIfNeeded(chatId: string) {
    if (messagesByChatId[chatId]) return;
    const history = await getChatMessages(chatId);
    setMessagesByChatId((prev) => ({ ...prev, [chatId]: history }));
  }

  async function openChat(chat: ChatSummary) {
    if (!chat.peer) return;
    setActiveChat({ chatId: chat.chat_id, peer: chat.peer });
    await loadMessagesIfNeeded(chat.chat_id);
  }

  async function startDirectChat(peer: Profile) {
    const chat = await createDirectChat(peer.user_id);
    setActiveChat({ chatId: chat.chat_id, peer });

    setChats((prev) =>
      prev.some((c) => c.chat_id === chat.chat_id)
        ? prev
        : [
            {
              chat_id: chat.chat_id,
              chat_type: chat.chat_type,
              title: chat.title,
              avatar_media_id: null,
              created_by: profile?.user_id ?? "",
              created_at: chat.created_at,
              peer,
            },
            ...prev,
          ],
    );

    await loadMessagesIfNeeded(chat.chat_id);
  }

  function sendMessage(text: string) {
    if (!activeChat || !text.trim()) return;
    const clientMessageId = crypto.randomUUID();
    const now = Date.now();

    const optimisticMessage: ChatMessage = {
      message_id: clientMessageId,
      chat_id: activeChat.chatId,
      sender_id: profile?.user_id ?? "",
      sent_at: now,
      client_message_id: clientMessageId,
      content: { scheme: PLACEHOLDER_SCHEME, ciphertext: text },
      edited_at: null,
      deleted_at: null,
      localStatus: "sending",
    };

    setMessagesByChatId((prev) => ({
      ...prev,
      [activeChat.chatId]: [...(prev[activeChat.chatId] ?? []), optimisticMessage],
    }));

    socketRef.current?.sendMessage(activeChat.chatId, clientMessageId, text, PLACEHOLDER_SCHEME);
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      isLoadingChats,
      activeChat,
      messages: activeChat ? messagesByChatId[activeChat.chatId] ?? [] : [],
      openChat,
      startDirectChat,
      sendMessage,
    }),
    [chats, isLoadingChats, activeChat, messagesByChatId],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

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
import type { ActiveChat, ChatMessage, ChatSummary, UserPresence } from "../types";

/** No real end-to-end encryption yet - placeholder scheme until key exchange is designed. */
const PLACEHOLDER_SCHEME = "plaintext-v0";

interface ChatContextValue {
  chats: ChatSummary[];
  isLoadingChats: boolean;
  activeChat: ActiveChat | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  presenceByUserId: Record<string, UserPresence>;
  openChat: (chat: ChatSummary) => Promise<void>;
  startDirectChat: (peer: Profile) => Promise<void>;
  sendMessage: (text: string) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  // Starts true so the sidebar shows a loading skeleton instead of flashing
  // "no conversations" before the initial GET /chats has even been fired.
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, UserPresence>>({});
  const socketRef = useRef<ChatSocket | null>(null);
  const activeChatRef = useRef<ActiveChat | null>(null);
  const ackedMessageIdsRef = useRef<Set<string>>(new Set());
  const subscribedPeerIdsRef = useRef<Set<string>>(new Set());

  function setActiveChatAndRef(chat: ActiveChat | null) {
    activeChatRef.current = chat;
    setActiveChat(chat);
  }

  function ackIfActiveChat(chatId: string, incoming: ChatMessage[]) {
    if (activeChatRef.current?.chatId !== chatId) return;
    for (const message of incoming) {
      if (message.sender_id === profile?.user_id) continue;
      if (ackedMessageIdsRef.current.has(message.message_id)) continue;
      ackedMessageIdsRef.current.add(message.message_id);
      socketRef.current?.ackRead(chatId, message.message_id);
    }
  }

  useEffect(() => {
    if (!user || !profile) {
      setChats([]);
      setIsLoadingChats(false);
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
        ackIfActiveChat(message.chat_id, [message]);
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
      onPresence: (users) => {
        setPresenceByUserId((prev) => {
          const next = { ...prev };
          for (const user of users) next[user.user_id] = user;
          return next;
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

  useEffect(() => {
    const peerIds = new Set<string>();
    for (const chat of chats) if (chat.peer) peerIds.add(chat.peer.user_id);
    if (activeChat) peerIds.add(activeChat.peer.user_id);

    const previouslySubscribed = subscribedPeerIdsRef.current;
    const added = [...peerIds].filter((id) => !previouslySubscribed.has(id));
    const removed = [...previouslySubscribed].filter((id) => !peerIds.has(id));

    if (added.length > 0) {
      socketRef.current?.subscribePresence(added);
      socketRef.current?.getPresence(added);
    }
    if (removed.length > 0) {
      socketRef.current?.unsubscribePresence(removed);
    }
    subscribedPeerIdsRef.current = peerIds;
  }, [chats, activeChat]);

  async function loadMessagesIfNeeded(chatId: string) {
    if (messagesByChatId[chatId]) {
      ackIfActiveChat(chatId, messagesByChatId[chatId]);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const history = await getChatMessages(chatId);
      const historyIds = new Set(history.map((h) => h.message_id));
      let merged = history;
      setMessagesByChatId((prev) => {
        const liveOnly = (prev[chatId] ?? []).filter((m) => !historyIds.has(m.message_id));
        merged = [...history, ...liveOnly];
        return { ...prev, [chatId]: merged };
      });
      ackIfActiveChat(chatId, merged);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function openChat(chat: ChatSummary) {
    if (!chat.peer) return;
    setActiveChatAndRef({ chatId: chat.chat_id, peer: chat.peer });
    await loadMessagesIfNeeded(chat.chat_id);
  }

  async function startDirectChat(peer: Profile) {
    // Get-or-create the chat row, but don't add it to the visible chat list yet - like
    // WhatsApp, a chat only shows up (on either side) once a message has actually been sent.
    const chat = await createDirectChat(peer.user_id);
    setActiveChatAndRef({ chatId: chat.chat_id, peer });
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

    setChats((prev) =>
      prev.some((c) => c.chat_id === activeChat.chatId)
        ? prev
        : [
            {
              chat_id: activeChat.chatId,
              chat_type: "direct",
              title: null,
              avatar_media_id: null,
              created_by: profile?.user_id ?? "",
              created_at: now,
              peer: activeChat.peer,
            },
            ...prev,
          ],
    );

    socketRef.current?.sendMessage(activeChat.chatId, clientMessageId, text, PLACEHOLDER_SCHEME);
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      isLoadingChats,
      activeChat,
      messages: activeChat ? messagesByChatId[activeChat.chatId] ?? [] : [],
      isLoadingMessages,
      presenceByUserId,
      openChat,
      startDirectChat,
      sendMessage,
    }),
    [chats, isLoadingChats, activeChat, messagesByChatId, isLoadingMessages, presenceByUserId],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

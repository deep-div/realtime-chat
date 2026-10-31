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
import {
  createDirectChat,
  createGroupChat as createGroupChatApi,
  deleteMessages as deleteMessagesApi,
  getChatMessages,
  listMyChats,
} from "../api";
import { encryptForPeer } from "../crypto";
import { useIdentityPrivateKey } from "../hooks/useIdentityKey";
import { ChatSocket } from "../socket";
import type { ActiveChat, ChatMessage, ChatSummary, UserPresence } from "../types";

/** Used only when the peer has no public key uploaded yet - see encryptForPeer. */
const PLACEHOLDER_SCHEME = "plaintext-v0";

interface ChatContextValue {
  chats: ChatSummary[];
  isLoadingChats: boolean;
  activeChat: ActiveChat | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  presenceByUserId: Record<string, UserPresence>;
  typingByChatId: Record<string, boolean>;
  typingUsersByChatId: Record<string, string[]>;
  membershipVersionByChatId: Record<string, number>;
  privateKey: CryptoKey | null;
  openChat: (chat: ChatSummary) => Promise<void>;
  closeChat: () => void;
  removeChatFromList: (chatId: string) => void;
  startDirectChat: (peer: Profile) => Promise<void>;
  createGroupChat: (title: string, memberIds: string[]) => Promise<void>;
  sendMessage: (text: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  deleteMessages: (chatId: string, messageIds: string[]) => Promise<void>;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const privateKey = useIdentityPrivateKey();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  // Starts true so the sidebar shows a loading skeleton instead of flashing
  // "no conversations" before the initial GET /chats has even been fired.
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, UserPresence>>({});
  const [typingByChatId, setTypingByChatId] = useState<Record<string, boolean>>({});
  const [typingUsersByChatId, setTypingUsersByChatId] = useState<Record<string, string[]>>({});
  const [membershipVersionByChatId, setMembershipVersionByChatId] = useState<Record<string, number>>({});
  const socketRef = useRef<ChatSocket | null>(null);
  const activeChatRef = useRef<ActiveChat | null>(null);
  const ackedMessageIdsRef = useRef<Set<string>>(new Set());
  const subscribedPeerIdsRef = useRef<Set<string>>(new Set());
  const chatsRef = useRef<ChatSummary[]>([]);
  // Chats whose full REST history has actually been fetched - distinct from
  // messagesByChatId having *any* entries, which can be populated early by
  // live/backlog socket messages before the history fetch ever runs.
  const historyLoadedChatIdsRef = useRef<Set<string>>(new Set());

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
    chatsRef.current = chats;
  }, [chats]);

  function markMessagesDeleted(chatId: string, messageIds: string[]) {
    const deletedIds = new Set(messageIds);
    setMessagesByChatId((prev) => {
      const existing = prev[chatId];
      if (!existing) return prev;
      return {
        ...prev,
        [chatId]: existing.map((m) =>
          deletedIds.has(m.message_id) ? { ...m, deleted_at: Date.now(), content: { scheme: m.content.scheme, ciphertext: "" } } : m,
        ),
      };
    });
  }

  useEffect(() => {
    if (!user || !profile) {
      setChats([]);
      setIsLoadingChats(false);
      // Clear out the previous session's chat state so a logged-out MainPanel
      // doesn't keep rendering a stale ChatView from before the logout.
      setActiveChatAndRef(null);
      setMessagesByChatId({});
      setPresenceByUserId({});
      setTypingByChatId({});
      setTypingUsersByChatId({});
      historyLoadedChatIdsRef.current.clear();
      ackedMessageIdsRef.current.clear();
      subscribedPeerIdsRef.current.clear();
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
        setChats((prev) => {
          const existing = prev.find((c) => c.chat_id === message.chat_id);
          if (!existing) {
            // A message can arrive for a chat we don't have yet - e.g. someone messaged
            // us for the first time, or we were offline and this is a backlog delivery.
            // Refetch the list so it shows up with its peer info instead of being
            // silently dropped.
            listMyChats().then(setChats);
            return prev;
          }
          const isActive = activeChatRef.current?.chatId === message.chat_id;
          const isOwnMessage = message.sender_id === profile?.user_id;
          const updated: ChatSummary = {
            ...existing,
            last_message: message.content.ciphertext,
            last_message_scheme: message.content.scheme,
            last_message_at: message.sent_at,
            unread_count: isOwnMessage || isActive ? existing.unread_count : existing.unread_count + 1,
          };
          const rest = prev.filter((c) => c.chat_id !== message.chat_id);
          return [updated, ...rest];
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
      onPresence: (users) => {
        setPresenceByUserId((prev) => {
          const next = { ...prev };
          for (const user of users) next[user.user_id] = user;
          return next;
        });
      },
      onTypingUpdate: ({ chatId, userId, isTyping }) => {
        setTypingByChatId((prev) => ({ ...prev, [chatId]: isTyping }));
        setTypingUsersByChatId((prev) => {
          const current = prev[chatId] ?? [];
          const next = isTyping
            ? current.includes(userId)
              ? current
              : [...current, userId]
            : current.filter((id) => id !== userId);
          return { ...prev, [chatId]: next };
        });
      },
      onMembershipChange: ({ chatId, userId, added }) => {
        setMembershipVersionByChatId((prev) => ({ ...prev, [chatId]: (prev[chatId] ?? 0) + 1 }));
        const isSelf = userId === profile?.user_id;
        if (isSelf && !added) {
          // We were removed from (or left) this group on another device/session - drop it
          // from the list and close it if it's currently open, same as leaving locally.
          setChats((prev) => prev.filter((c) => c.chat_id !== chatId));
          if (activeChatRef.current?.chatId === chatId) setActiveChatAndRef(null);
        } else if (isSelf && added) {
          // We were just added to a group - fetch its summary so it shows up in the list.
          listMyChats().then(setChats);
        }
      },
      onMessageDeleted: ({ chatId, messageIds }) => {
        markMessagesDeleted(chatId, messageIds);
      },
      onConnected: () => {
        // The backend's watcher list is keyed by connection id, so a reconnect
        // (whether after a dropped network or an auto-retry) starts with none -
        // re-subscribe to everyone we currently care about.
        const peerIds = new Set<string>();
        for (const chat of chatsRef.current) if (chat.peer) peerIds.add(chat.peer.user_id);
        if (activeChatRef.current?.peer) peerIds.add(activeChatRef.current.peer.user_id);
        subscribedPeerIdsRef.current = peerIds;
        if (peerIds.size > 0) {
          const ids = [...peerIds];
          socketRef.current?.subscribePresence(ids);
          socketRef.current?.getPresence(ids);
        }
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
    if (activeChat?.peer) peerIds.add(activeChat.peer.user_id);

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
    if (historyLoadedChatIdsRef.current.has(chatId)) {
      ackIfActiveChat(chatId, messagesByChatId[chatId] ?? []);
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
      historyLoadedChatIdsRef.current.add(chatId);
      ackIfActiveChat(chatId, merged);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function openChat(chat: ChatSummary) {
    if (chat.chat_type === "direct" && !chat.peer) return;
    setActiveChatAndRef({
      chatId: chat.chat_id,
      chatType: chat.chat_type,
      peer: chat.peer,
      title: chat.title,
    });
    setChats((prev) =>
      prev.map((c) => (c.chat_id === chat.chat_id ? { ...c, unread_count: 0 } : c)),
    );
    await loadMessagesIfNeeded(chat.chat_id);
  }

  function closeChat() {
    setActiveChatAndRef(null);
  }

  function removeChatFromList(chatId: string) {
    setChats((prev) => prev.filter((c) => c.chat_id !== chatId));
    // Drop the cached history too - a direct chat reuses the same chat_id if it's
    // reopened later, and without this it'd keep showing messages hidden server-side
    // by a chat delete instead of refetching the (now-filtered) history.
    setMessagesByChatId((prev) => {
      if (!(chatId in prev)) return prev;
      const { [chatId]: _removed, ...rest } = prev;
      return rest;
    });
    historyLoadedChatIdsRef.current.delete(chatId);
    if (activeChatRef.current?.chatId === chatId) {
      setActiveChatAndRef(null);
    }
  }

  async function startDirectChat(peer: Profile) {
    // Get-or-create the chat row, but don't add it to the visible chat list yet - like
    // WhatsApp, a chat only shows up (on either side) once a message has actually been sent.
    const chat = await createDirectChat(peer.user_id);
    setActiveChatAndRef({ chatId: chat.chat_id, chatType: "direct", peer, title: null });
    await loadMessagesIfNeeded(chat.chat_id);
  }

  async function createGroupChat(title: string, memberIds: string[]) {
    const chat = await createGroupChatApi(title, memberIds);
    const summary: ChatSummary = {
      chat_id: chat.chat_id,
      chat_type: "group",
      title: chat.title,
      avatar_media_id: null,
      created_by: profile?.user_id ?? "",
      created_at: chat.created_at,
      peer: null,
      last_message: null,
      last_message_scheme: null,
      last_message_at: null,
      unread_count: 0,
    };
    setChats((prev) => [summary, ...prev.filter((c) => c.chat_id !== chat.chat_id)]);
    setActiveChatAndRef({ chatId: chat.chat_id, chatType: "group", peer: null, title: chat.title });
    await loadMessagesIfNeeded(chat.chat_id);
  }

  function setTyping(chatId: string, isTyping: boolean) {
    if (isTyping) socketRef.current?.startTyping(chatId);
    else socketRef.current?.stopTyping(chatId);
  }

  async function sendMessage(text: string) {
    if (!activeChat || !text.trim()) return;
    setTyping(activeChat.chatId, false);
    const clientMessageId = crypto.randomUUID();
    const now = Date.now();

    const optimisticMessage: ChatMessage = {
      message_id: clientMessageId,
      chat_id: activeChat.chatId,
      sender_id: profile?.user_id ?? "",
      sent_at: now,
      client_message_id: clientMessageId,
      // Optimistic bubble shows the plaintext we just typed immediately - no need to
      // wait on the real encrypt below, which only matters for what goes over the wire.
      content: { scheme: PLACEHOLDER_SCHEME, ciphertext: text },
      edited_at: null,
      deleted_at: null,
      localStatus: "sending",
    };

    setMessagesByChatId((prev) => ({
      ...prev,
      [activeChat.chatId]: [...(prev[activeChat.chatId] ?? []), optimisticMessage],
    }));

    setChats((prev) => {
      const existing = prev.find((c) => c.chat_id === activeChat.chatId);
      const updated: ChatSummary = existing
        ? { ...existing, last_message: text, last_message_scheme: PLACEHOLDER_SCHEME, last_message_at: now }
        : {
            chat_id: activeChat.chatId,
            chat_type: activeChat.chatType,
            title: activeChat.title,
            avatar_media_id: null,
            created_by: profile?.user_id ?? "",
            created_at: now,
            peer: activeChat.peer,
            last_message: text,
            last_message_scheme: PLACEHOLDER_SCHEME,
            last_message_at: now,
            unread_count: 0,
          };
      const rest = prev.filter((c) => c.chat_id !== activeChat.chatId);
      return [updated, ...rest];
    });

    // Group chats have no single peer to derive a pairwise shared key from, so they're
    // sent as plaintext for now - encryptForPeer already falls back to that when given
    // no peer key, same as a direct-chat peer who hasn't uploaded a public key yet.
    const encrypted = privateKey
      ? await encryptForPeer(privateKey, activeChat.peer?.public_key, text)
      : { scheme: PLACEHOLDER_SCHEME, ciphertext: text };

    socketRef.current?.sendMessage(
      activeChat.chatId,
      clientMessageId,
      encrypted.ciphertext,
      encrypted.scheme,
    );
  }

  async function deleteMessages(chatId: string, messageIds: string[]) {
    if (messageIds.length === 0) return;
    await deleteMessagesApi(chatId, messageIds);
    markMessagesDeleted(chatId, messageIds);
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      isLoadingChats,
      activeChat,
      messages: activeChat ? messagesByChatId[activeChat.chatId] ?? [] : [],
      isLoadingMessages,
      presenceByUserId,
      typingByChatId,
      typingUsersByChatId,
      membershipVersionByChatId,
      privateKey,
      openChat,
      closeChat,
      removeChatFromList,
      startDirectChat,
      createGroupChat,
      sendMessage,
      setTyping,
      deleteMessages,
    }),
    [
      chats,
      isLoadingChats,
      activeChat,
      messagesByChatId,
      isLoadingMessages,
      presenceByUserId,
      privateKey,
      typingByChatId,
      typingUsersByChatId,
      membershipVersionByChatId,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

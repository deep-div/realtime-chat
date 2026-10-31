import { firebaseAuth } from "../../lib/firebase/config";
import type { ChatMessage, UserPresence } from "./types";

/** Empty in prod (same-origin, frontend served alongside the API); localhost in dev. */
const API_BASE_URL: string = import.meta.env.DEV ? "http://localhost:8000" : "";

type IncomingEvent =
  | { event: "new_message"; message: ChatMessage }
  | { event: "presence"; users: UserPresence[] }
  | { event: "presence_update"; users: UserPresence[] }
  | { event: "typing_update"; chat_id: string; user_id: string; is_typing: boolean }
  | { event: "member_added"; chat_id: string; user_id: string }
  | { event: "member_removed"; chat_id: string; user_id: string }
  | { event: "message_deleted"; chat_id: string; message_ids: string[] }
  | { type: "message_status"; message_id?: string; status: string; message?: ChatMessage }
  | { type: "handshake_ack"; connection_id: string }
  | { type: "message_error"; client_message_id?: string; message_id?: string; error: string };

export interface ChatSocketHandlers {
  onNewMessage: (message: ChatMessage) => void;
  onMessageStatus: (payload: { messageId?: string; status: string; message?: ChatMessage }) => void;
  onMessageError: (payload: { clientMessageId?: string; messageId?: string; error: string }) => void;
  onPresence: (users: UserPresence[]) => void;
  onTypingUpdate: (payload: { chatId: string; userId: string; isTyping: boolean }) => void;
  onMembershipChange: (payload: { chatId: string; userId: string; added: boolean }) => void;
  onMessageDeleted: (payload: { chatId: string; messageIds: string[] }) => void;
  /** Fires after every successful handshake, including reconnects - re-subscribe presence here. */
  onConnected?: () => void;
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

/** Thin wrapper around the app's single /ws connection: handshake, heartbeat, send/receive.
 * Reconnects automatically with backoff on any unexpected drop. */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionallyClosed = false;
  private readonly deviceId = crypto.randomUUID();
  private readonly sessionId = crypto.randomUUID();
  private handshakeSent = false;
  private sendQueue: string[] = [];

  constructor(private readonly handlers: ChatSocketHandlers) {}

  async connect(): Promise<void> {
    this.intentionallyClosed = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const idToken = await firebaseAuth.currentUser?.getIdToken();
    if (!idToken) return;

    const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      socket.send(
        JSON.stringify({
          id_token: idToken,
          device_id: this.deviceId,
          session_id: this.sessionId,
          device_type: "web",
          app_version: "0.1.0",
          protocol_version: "1",
        }),
      );
      this.handshakeSent = true;
      this.flushQueue();
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as IncomingEvent;
      this.handleIncoming(payload);
    };

    socket.onerror = () => {
      // The close event always follows an error event, so reconnect scheduling
      // lives in onclose alone - this just prevents an unhandled error log.
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
      this.handshakeSent = false;
      this.sendQueue = [];
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleIncoming(payload: IncomingEvent) {
    if ("event" in payload && payload.event === "new_message") {
      this.handlers.onNewMessage(payload.message);
      return;
    }
    if ("event" in payload && (payload.event === "presence" || payload.event === "presence_update")) {
      this.handlers.onPresence(payload.users);
      return;
    }
    if ("type" in payload && payload.type === "handshake_ack") {
      this.startHeartbeat();
      this.handlers.onConnected?.();
      return;
    }
    if ("type" in payload && payload.type === "message_status") {
      this.handlers.onMessageStatus({
        messageId: payload.message_id ?? payload.message?.message_id,
        status: payload.status,
        message: payload.message,
      });
      return;
    }
    if ("event" in payload && payload.event === "typing_update") {
      this.handlers.onTypingUpdate({
        chatId: payload.chat_id,
        userId: payload.user_id,
        isTyping: payload.is_typing,
      });
      return;
    }
    if ("event" in payload && (payload.event === "member_added" || payload.event === "member_removed")) {
      this.handlers.onMembershipChange({
        chatId: payload.chat_id,
        userId: payload.user_id,
        added: payload.event === "member_added",
      });
      return;
    }
    if ("event" in payload && payload.event === "message_deleted") {
      this.handlers.onMessageDeleted({
        chatId: payload.chat_id,
        messageIds: payload.message_ids,
      });
      return;
    }
    if ("type" in payload && payload.type === "message_error") {
      this.handlers.onMessageError({
        clientMessageId: payload.client_message_id,
        messageId: payload.message_id,
        error: payload.error,
      });
    }
  }

  private flushQueue() {
    for (const payload of this.sendQueue) {
      this.socket?.send(payload);
    }
    this.sendQueue = [];
  }

  private send(payload: object) {
    const serialized = JSON.stringify(payload);
    if (this.handshakeSent) {
      this.socket?.send(serialized);
    } else {
      this.sendQueue.push(serialized);
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.socket?.send(JSON.stringify({ type: "heartbeat" }));
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  sendMessage(chatId: string, clientMessageId: string, ciphertext: string, scheme: string) {
    this.send({
      type: "send_message",
      client_message_id: clientMessageId,
      chat_id: chatId,
      content: { scheme, ciphertext },
    });
  }

  ackRead(chatId: string, messageId: string) {
    this.send({ type: "message_ack", chat_id: chatId, message_id: messageId, status: "read" });
  }

  getPresence(userIds: string[]) {
    if (userIds.length === 0) return;
    this.send({ type: "get_presence", user_ids: userIds });
  }

  subscribePresence(userIds: string[]) {
    if (userIds.length === 0) return;
    this.send({ type: "subscribe_presence", user_ids: userIds });
  }

  unsubscribePresence(userIds: string[]) {
    if (userIds.length === 0) return;
    this.send({ type: "unsubscribe_presence", user_ids: userIds });
  }

  startTyping(chatId: string) {
    this.send({ type: "typing_start", chat_id: chatId });
  }

  stopTyping(chatId: string) {
    this.send({ type: "typing_stop", chat_id: chatId });
  }

  disconnect() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }
}

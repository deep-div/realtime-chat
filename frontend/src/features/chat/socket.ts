import { firebaseAuth } from "../../lib/firebase/config";
import type { ChatMessage } from "./types";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

type IncomingEvent =
  | { event: "new_message"; message: ChatMessage }
  | { type: "message_status"; message_id?: string; status: string; message?: ChatMessage }
  | { type: "handshake_ack"; connection_id: string }
  | { type: "message_error"; client_message_id?: string; message_id?: string; error: string };

export interface ChatSocketHandlers {
  onNewMessage: (message: ChatMessage) => void;
  onMessageStatus: (payload: { messageId?: string; status: string; message?: ChatMessage }) => void;
  onMessageError: (payload: { clientMessageId?: string; messageId?: string; error: string }) => void;
}

/** Thin wrapper around the app's single /ws connection: handshake, heartbeat, send/receive. */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly deviceId = crypto.randomUUID();
  private readonly sessionId = crypto.randomUUID();

  constructor(private readonly handlers: ChatSocketHandlers) {}

  async connect(): Promise<void> {
    const idToken = await firebaseAuth.currentUser?.getIdToken();
    if (!idToken) return;

    const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
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
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as IncomingEvent;
      this.handleIncoming(payload);
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
    };
  }

  private handleIncoming(payload: IncomingEvent) {
    if ("event" in payload && payload.event === "new_message") {
      this.handlers.onNewMessage(payload.message);
      return;
    }
    if ("type" in payload && payload.type === "handshake_ack") {
      this.startHeartbeat();
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
    if ("type" in payload && payload.type === "message_error") {
      this.handlers.onMessageError({
        clientMessageId: payload.client_message_id,
        messageId: payload.message_id,
        error: payload.error,
      });
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
    this.socket?.send(
      JSON.stringify({
        type: "send_message",
        client_message_id: clientMessageId,
        chat_id: chatId,
        content: { scheme, ciphertext },
      }),
    );
  }

  ackRead(chatId: string, messageId: string) {
    this.socket?.send(
      JSON.stringify({ type: "message_ack", chat_id: chatId, message_id: messageId, status: "read" }),
    );
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }
}

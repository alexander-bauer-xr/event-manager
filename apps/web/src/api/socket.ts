import { io, Socket } from 'socket.io-client';
import type {
  SnapshotDTO,
  EventStateDTO,
  AnnouncementDTO,
  ChatMessageDTO,
  SocketError,
  PresenceState,
} from '../types';

const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH ?? '/socket.io';

export interface SocketCallbacks {
  onSnapshot: (snapshot: SnapshotDTO) => void;
  onStateUpdate: (state: EventStateDTO) => void;
  onAnnouncement: (announcement: AnnouncementDTO) => void;
  onChatMessage: (data: { roomKey: string; message: ChatMessageDTO }) => void;
  onChatEdited: (data: { roomKey: string; message: ChatMessageDTO }) => void;
  onChatDeleted: (data: { roomKey: string; messageId: string; deletedAt: string }) => void;
  onChatTyping: (data: { roomKey: string; guestId: string; guestName: string; isTyping: boolean }) => void;
  onPresenceUpdate: (presence: PresenceState) => void;
  onError: (error: SocketError) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onGuestIdReceived?: (guestId: string) => void;
}

class SocketClient {
  private socket: Socket | null = null;
  private currentSlug: string | null = null;
  private currentRooms: Set<string> = new Set();
  private callbacks: SocketCallbacks | null = null;

  initialize(callbacks: SocketCallbacks, jwt?: string) {
    if (this.socket) {
      this.disconnect();
    }

    const auth: any = {};
    if (jwt) {
      auth.jwt = jwt;
    }

    this.socket = io('', { auth, path: SOCKET_PATH });
    this.callbacks = callbacks;

    this.socket.on('connect', () => {
      callbacks.onConnect();
      if (this.currentSlug) {
        this.rejoinAfterReconnect();
      }
    });

    this.socket.on('disconnect', () => {
      callbacks.onDisconnect();
    });

    this.socket.on('event:snapshot', (snapshot: SnapshotDTO) => {
      callbacks.onSnapshot(snapshot);
    });

    this.socket.on('state:update', (state: EventStateDTO) => {
      callbacks.onStateUpdate(state);
    });

    this.socket.on('announcement:new', (data: { announcement: AnnouncementDTO }) => {
      callbacks.onAnnouncement(data.announcement);
    });

    this.socket.on('chat:new', (data: { roomKey: string; message: ChatMessageDTO }) => {
      callbacks.onChatMessage(data);
    });

    this.socket.on('chat:edited', (data: { roomKey: string; message: ChatMessageDTO }) => {
      callbacks.onChatEdited(data);
    });

    this.socket.on('chat:deleted', (data: { roomKey: string; messageId: string; deletedAt: string }) => {
      callbacks.onChatDeleted(data);
    });

    this.socket.on('chat:typing', (data: { roomKey: string; guestId: string; guestName: string; isTyping: boolean }) => {
      callbacks.onChatTyping(data);
    });

    this.socket.on('presence:update', (presence: PresenceState) => {
      callbacks.onPresenceUpdate(presence);
    });

    this.socket.on('error', (error: SocketError) => {
      callbacks.onError(error);
    });
  }

  joinEvent(slug: string, guestName: string) {
    if (!this.socket) return;

    this.currentSlug = slug;

    // Try to reuse existing guestId from localStorage
    const existingGuestId = localStorage.getItem(`guestId_${slug}`);

    this.socket.emit(
      'event:join',
      { slug, guestName, existingGuestId: existingGuestId || undefined },
      (response: any) => {
        if (response?.success && response.guestId) {
          localStorage.setItem(`guestId_${slug}`, response.guestId);
          // Notify the store about the guestId
          if (this.callbacks?.onGuestIdReceived) {
            this.callbacks.onGuestIdReceived(response.guestId);
          }
        }
      }
    );
  }

  joinRoom(slug: string, roomKey: string) {
    if (!this.socket) return;

    this.currentRooms.add(roomKey);
    this.socket.emit('chat:join', { slug, roomKey });
  }

  sendMessage(slug: string, roomKey: string, text: string) {
    if (!this.socket) return;

    this.socket.emit('chat:send', { slug, roomKey, text });
  }

  editMessage(slug: string, roomKey: string, messageId: string, text: string) {
    if (!this.socket) return;

    this.socket.emit('chat:edit', { slug, roomKey, messageId, text });
  }

  deleteMessage(slug: string, roomKey: string, messageId: string) {
    if (!this.socket) return;

    this.socket.emit('chat:delete', { slug, roomKey, messageId });
  }

  sendTyping(slug: string, roomKey: string, isTyping: boolean) {
    if (!this.socket) return;

    this.socket.emit('chat:typing', { slug, roomKey, isTyping });
  }

  adminAuth(jwt: string) {
    if (!this.socket) return;

    this.socket.emit('admin:auth', { token: jwt });
  }

  adminNext(slug: string) {
    if (!this.socket) return;

    this.socket.emit('admin:next', { slug });
  }

  adminAnnounce(slug: string, text: string) {
    if (!this.socket) return;

    this.socket.emit('admin:announce', { slug, text });
  }

  private rejoinAfterReconnect() {
    if (!this.socket || !this.currentSlug) return;

    const guestName = localStorage.getItem(`guestName_${this.currentSlug}`) || 'Guest';
    this.joinEvent(this.currentSlug, guestName);

    this.currentRooms.forEach((roomKey) => {
      this.joinRoom(this.currentSlug!, roomKey);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentSlug = null;
    this.currentRooms.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();

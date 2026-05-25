import { create } from 'zustand';
import type {
  EventDTO,
  LocationDTO,
  AgendaSlotDTO,
  EventStateDTO,
  ChatRoomDTO,
  AnnouncementDTO,
  ChatMessageDTO,
  SnapshotDTO,
  PresenceState,
} from '../types';
import { socketClient } from '../api/socket';
import {
  getSnapshot,
  adminLogin,
  adminNext,
  adminAnnounce,
  saveAgenda,
  saveLocations,
  getChatMessagesPaginated,
} from '../api/http';

interface RoomMessagesState {
  messages: ChatMessageDTO[];
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  isLoading: boolean;
}

interface ChatState {
  currentRoomKey: string;
  messagesByRoom: Record<string, RoomMessagesState>;
  typingUsers: Record<string, Set<string>>; // roomKey -> Set<guestName>
}

interface Store {
  connected: boolean;
  loading: boolean;
  error: string | null;
  event: EventDTO | null;
  locations: LocationDTO[];
  agenda: AgendaSlotDTO[];
  state: EventStateDTO | null;
  rooms: ChatRoomDTO[];
  announcements: AnnouncementDTO[];
  chat: ChatState;
  presence: PresenceState;
  guestName: string;
  guestId: string;
  isAdmin: boolean;
  jwt: string | null;

  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  loadSnapshot: (slug: string) => Promise<void>;
  handleSnapshot: (snapshot: SnapshotDTO) => void;
  handleStateUpdate: (state: EventStateDTO) => void;
  handleAnnouncement: (announcement: AnnouncementDTO) => void;
  handleChatMessage: (data: { roomKey: string; message: ChatMessageDTO }) => void;
  handleChatEdited: (data: { roomKey: string; message: ChatMessageDTO }) => void;
  handleChatDeleted: (data: { roomKey: string; messageId: string; deletedAt: string }) => void;
  handleChatTyping: (data: { roomKey: string; guestId: string; guestName: string; isTyping: boolean }) => void;
  handlePresenceUpdate: (presence: PresenceState) => void;
  connectSocket: (slug: string, guestName: string) => void;
  joinRoom: (slug: string, roomKey: string) => void;
  loadChatHistory: (slug: string, roomKey: string) => Promise<void>;
  loadMoreMessages: (slug: string, roomKey: string) => Promise<void>;
  sendMessage: (slug: string, roomKey: string, text: string) => void;
  editMessage: (slug: string, roomKey: string, messageId: string, text: string) => void;
  deleteMessage: (slug: string, roomKey: string, messageId: string) => void;
  sendTyping: (slug: string, roomKey: string, isTyping: boolean) => void;
  setCurrentRoom: (roomKey: string) => void;
  adminLoginAction: (slug: string, token: string) => Promise<void>;
  verifyAdminToken: (slug: string, jwt: string) => Promise<boolean>;
  adminNextAction: (slug: string) => Promise<void>;
  adminAnnounceAction: (slug: string, text: string) => Promise<void>;
  saveAgendaAction: (slug: string, slots: Array<Omit<AgendaSlotDTO, 'id' | 'sortIndex'>>) => Promise<void>;
  saveLocationsAction: (slug: string, locations: LocationDTO[]) => Promise<void>;
  reset: () => void;
}

const initialState = {
  connected: false,
  loading: false,
  error: null,
  event: null,
  locations: [],
  agenda: [],
  state: null,
  rooms: [],
  announcements: [],
  chat: {
    currentRoomKey: 'general',
    messagesByRoom: {},
    typingUsers: {},
  },
  presence: {
    users: [],
    count: 0,
  },
  guestName: '',
  guestId: '',
  isAdmin: false,
  jwt: null,
};

export const useStore = create<Store>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),

  setError: (error) => set({ error }),

  loadSnapshot: async (slug: string) => {
    set({ loading: true, error: null });
    try {
      const snapshot = await getSnapshot(slug);
      get().handleSnapshot(snapshot);
    } catch (error: any) {
      set({ error: error.message || 'Failed to load event' });
    } finally {
      set({ loading: false });
    }
  },

  handleSnapshot: (snapshot) => {
    const availableRoomKeys = new Set(snapshot.rooms.map((room) => room.key));
    const currentRoomKey = availableRoomKeys.has(get().chat.currentRoomKey)
      ? get().chat.currentRoomKey
      : 'general';

    set((prev) => ({
      event: snapshot.event,
      locations: snapshot.locations,
      agenda: snapshot.agenda,
      state: snapshot.state,
      rooms: snapshot.rooms,
      announcements: snapshot.announcements,
      chat: {
        ...prev.chat,
        currentRoomKey,
        messagesByRoom: Object.fromEntries(
          Object.entries(prev.chat.messagesByRoom).filter(([roomKey]) => availableRoomKeys.has(roomKey))
        ),
      },
    }));
  },

  handleStateUpdate: (state) => {
    set({ state });
  },

  handleAnnouncement: (announcement) => {
    set((prev) => ({
      announcements: [announcement, ...prev.announcements],
    }));
  },

  handleChatMessage: ({ roomKey, message }) => {
    set((prev) => {
      const roomState = prev.chat.messagesByRoom[roomKey] || {
        messages: [],
        hasMore: false,
        nextCursor: null,
        prevCursor: null,
        isLoading: false,
      };
      // Prevent duplicate messages
      if (roomState.messages.some((m) => m.id === message.id)) {
        return prev;
      }
      return {
        chat: {
          ...prev.chat,
          messagesByRoom: {
            ...prev.chat.messagesByRoom,
            [roomKey]: {
              ...roomState,
              messages: [...roomState.messages, message],
            },
          },
        },
      };
    });
  },

  handleChatEdited: ({ roomKey, message }) => {
    set((prev) => {
      const roomState = prev.chat.messagesByRoom[roomKey];
      if (!roomState) return prev;

      const updatedMessages = roomState.messages.map((m) => (m.id === message.id ? message : m));

      return {
        chat: {
          ...prev.chat,
          messagesByRoom: {
            ...prev.chat.messagesByRoom,
            [roomKey]: {
              ...roomState,
              messages: updatedMessages,
            },
          },
        },
      };
    });
  },

  handleChatDeleted: ({ roomKey, messageId }) => {
    set((prev) => {
      const roomState = prev.chat.messagesByRoom[roomKey];
      if (!roomState) return prev;

      // Remove the deleted message from UI
      const updatedMessages = roomState.messages.filter((m) => m.id !== messageId);

      return {
        chat: {
          ...prev.chat,
          messagesByRoom: {
            ...prev.chat.messagesByRoom,
            [roomKey]: {
              ...roomState,
              messages: updatedMessages,
            },
          },
        },
      };
    });
  },

  handleChatTyping: ({ roomKey, guestName, isTyping }) => {
    set((prev) => {
      const typingUsers = new Map<string, Set<string>>();

      // Convert existing typing users to Map
      Object.entries(prev.chat.typingUsers).forEach(([key, users]) => {
        typingUsers.set(key, new Set(users));
      });

      if (!typingUsers.has(roomKey)) {
        typingUsers.set(roomKey, new Set());
      }

      const roomTyping = typingUsers.get(roomKey)!;

      if (isTyping) {
        roomTyping.add(guestName);
      } else {
        roomTyping.delete(guestName);
      }

      // Convert Map back to Record
      const typingUsersRecord: Record<string, Set<string>> = {};
      typingUsers.forEach((users, key) => {
        typingUsersRecord[key] = users;
      });

      return {
        chat: {
          ...prev.chat,
          typingUsers: typingUsersRecord,
        },
      };
    });

    // Auto-clear typing indicator after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        set((prev) => {
          const typingUsers = { ...prev.chat.typingUsers };
          const roomTyping = typingUsers[roomKey];
          if (roomTyping) {
            const updated = new Set(roomTyping);
            updated.delete(guestName);
            typingUsers[roomKey] = updated;
          }
          return {
            chat: {
              ...prev.chat,
              typingUsers,
            },
          };
        });
      }, 3000);
    }
  },

  handlePresenceUpdate: (presence) => {
    set({ presence });
  },

  connectSocket: (slug: string, guestName: string) => {
    const state = get();
    const jwt = state.jwt;

    // Only save guest name to localStorage if it's not 'Admin'
    // This prevents admin sessions from overwriting the user's real name
    if (guestName !== 'Admin') {
      localStorage.setItem(`guestName_${slug}`, guestName);
    }
    set({ guestName });

    socketClient.initialize(
      {
        onSnapshot: get().handleSnapshot,
        onStateUpdate: get().handleStateUpdate,
        onAnnouncement: get().handleAnnouncement,
        onChatMessage: get().handleChatMessage,
        onChatEdited: get().handleChatEdited,
        onChatDeleted: get().handleChatDeleted,
        onChatTyping: get().handleChatTyping,
        onPresenceUpdate: get().handlePresenceUpdate,
        onError: (error) => set({ error: error.message }),
        onConnect: () => set({ connected: true, error: null }),
        onDisconnect: () => set({ connected: false }),
        onGuestIdReceived: (guestId) => set({ guestId }),
      },
      jwt || undefined
    );

    socketClient.joinEvent(slug, guestName);

    if (jwt) {
      socketClient.adminAuth(jwt);
    }
  },

  joinRoom: (slug: string, roomKey: string) => {
    socketClient.joinRoom(slug, roomKey);
    set((prev) => ({
      chat: {
        ...prev.chat,
        currentRoomKey: roomKey,
      },
    }));
    // Load chat history when joining a room
    get().loadChatHistory(slug, roomKey);
  },

  loadChatHistory: async (slug: string, roomKey: string) => {
    try {
      const result = await getChatMessagesPaginated(slug, roomKey, { limit: 50 });
      set((prev) => ({
        chat: {
          ...prev.chat,
          messagesByRoom: {
            ...prev.chat.messagesByRoom,
            [roomKey]: {
              messages: result.messages,
              hasMore: result.hasMore,
              nextCursor: result.nextCursor,
              prevCursor: result.prevCursor,
              isLoading: false,
            },
          },
        },
      }));
    } catch (error) {
      // Silently fail - chat history is optional
      console.error('Failed to load chat history:', error);
    }
  },

  loadMoreMessages: async (slug: string, roomKey: string) => {
    const roomState = get().chat.messagesByRoom[roomKey];
    if (!roomState || !roomState.hasMore || roomState.isLoading) {
      return;
    }

    // Set loading state
    set((prev) => ({
      chat: {
        ...prev.chat,
        messagesByRoom: {
          ...prev.chat.messagesByRoom,
          [roomKey]: {
            ...roomState,
            isLoading: true,
          },
        },
      },
    }));

    try {
      const result = await getChatMessagesPaginated(slug, roomKey, {
        limit: 50,
        cursor: roomState.prevCursor!,
        direction: 'before',
      });

      set((prev) => {
        const currentState = prev.chat.messagesByRoom[roomKey];
        return {
          chat: {
            ...prev.chat,
            messagesByRoom: {
              ...prev.chat.messagesByRoom,
              [roomKey]: {
                messages: [...result.messages, ...currentState.messages],
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
                prevCursor: result.prevCursor,
                isLoading: false,
              },
            },
          },
        };
      });
    } catch (error) {
      console.error('Failed to load more messages:', error);
      // Reset loading state on error
      set((prev) => ({
        chat: {
          ...prev.chat,
          messagesByRoom: {
            ...prev.chat.messagesByRoom,
            [roomKey]: {
              ...roomState,
              isLoading: false,
            },
          },
        },
      }));
    }
  },

  sendMessage: (slug: string, roomKey: string, text: string) => {
    socketClient.sendMessage(slug, roomKey, text);
  },

  editMessage: (slug: string, roomKey: string, messageId: string, text: string) => {
    socketClient.editMessage(slug, roomKey, messageId, text);
  },

  deleteMessage: (slug: string, roomKey: string, messageId: string) => {
    socketClient.deleteMessage(slug, roomKey, messageId);
  },

  sendTyping: (slug: string, roomKey: string, isTyping: boolean) => {
    socketClient.sendTyping(slug, roomKey, isTyping);
  },

  setCurrentRoom: (roomKey: string) => {
    set((prev) => ({
      chat: {
        ...prev.chat,
        currentRoomKey: roomKey,
      },
    }));
  },

  adminLoginAction: async (slug: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await adminLogin(slug, token);
      const jwt = response.token;

      set({ jwt, isAdmin: true });
      localStorage.setItem(`adminJwt_${slug}`, jwt);

      socketClient.disconnect();

      // Preserve the user's real guest name if they had one,
      // otherwise use 'Admin' for admin-only sessions
      const currentGuestName = get().guestName;
      const savedGuestName = localStorage.getItem(`guestName_${slug}`);
      const guestName =
        (currentGuestName && currentGuestName !== 'Guest' && currentGuestName !== 'Admin')
          ? currentGuestName
          : (savedGuestName && savedGuestName !== 'Admin')
            ? savedGuestName
            : 'Admin';

      get().connectSocket(slug, guestName);
    } catch (error: any) {
      set({ error: error.message || 'Login failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyAdminToken: async (slug: string, jwt: string): Promise<boolean> => {
    try {
      // First, check if JWT is expired (client-side check)
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      if (now >= exp) {
        // JWT is expired
        localStorage.removeItem(`adminJwt_${slug}`);
        set({ jwt: null, isAdmin: false });
        return false;
      }

      // JWT is not expired, consider it valid
      // (The backend will still validate on each actual admin action)
      return true;
    } catch (error: any) {
      // If JWT is malformed or parsing fails, it's invalid
      localStorage.removeItem(`adminJwt_${slug}`);
      set({ jwt: null, isAdmin: false });
      return false;
    }
  },

  adminNextAction: async (slug: string) => {
    const jwt = get().jwt;
    if (!jwt) {
      set({ error: 'Not authenticated' });
      return;
    }

    try {
      await adminNext(slug, jwt);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        localStorage.removeItem(`adminJwt_${slug}`);
        set({ jwt: null, isAdmin: false, error: 'Session expired. Please login again.' });
      } else {
        set({ error: error.message || 'Failed to advance' });
      }
      throw error;
    }
  },

  adminAnnounceAction: async (slug: string, text: string) => {
    const jwt = get().jwt;
    if (!jwt) {
      set({ error: 'Not authenticated' });
      return;
    }

    try {
      await adminAnnounce(slug, jwt, text);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        localStorage.removeItem(`adminJwt_${slug}`);
        set({ jwt: null, isAdmin: false, error: 'Session expired. Please login again.' });
      } else {
        set({ error: error.message || 'Failed to announce' });
      }
      throw error;
    }
  },

  saveAgendaAction: async (slug: string, slots: Array<Omit<AgendaSlotDTO, 'id' | 'sortIndex'>>) => {
    const jwt = get().jwt;
    if (!jwt) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const updated = await saveAgenda(slug, jwt, slots);
      set({ agenda: updated });
      await get().loadSnapshot(slug);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        localStorage.removeItem(`adminJwt_${slug}`);
        set({ jwt: null, isAdmin: false, error: 'Session expired. Please login again.' });
      } else {
        set({ error: error.message || 'Failed to save agenda' });
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  saveLocationsAction: async (slug: string, locations: LocationDTO[]) => {
    const jwt = get().jwt;
    if (!jwt) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const updated = await saveLocations(slug, jwt, locations);
      set({ locations: updated });
      await get().loadSnapshot(slug);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        localStorage.removeItem(`adminJwt_${slug}`);
        set({ jwt: null, isAdmin: false, error: 'Session expired. Please login again.' });
      } else {
        set({ error: error.message || 'Failed to save locations' });
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  reset: () => {
    socketClient.disconnect();
    set(initialState);
  },
}));
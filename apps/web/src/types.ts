export interface EventDTO {
  id: string;
  slug: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface LocationDTO {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  note: string | null;
}

export interface AgendaSlotDTO {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  locationId: string | null;
  sortIndex: number;
}

export interface EventStateDTO {
  currentSlotId: string | null;
  updatedAt: string;
}

export interface AnnouncementDTO {
  id: string;
  text: string;
  createdAt: string;
}

export interface ChatRoomDTO {
  id: string;
  key: string;
  title: string;
  isAdminOnly: boolean;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  guestId: string;
  guestName: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  isEdited: boolean;
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface OnlineUser {
  guestId: string;
  guestName: string;
  joinedAt: number;
}

export interface PresenceState {
  users: OnlineUser[];
  count: number;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  direction?: 'before' | 'after';
}

export interface PaginatedMessagesResult {
  messages: ChatMessageDTO[];
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface SnapshotDTO {
  event: EventDTO;
  locations: LocationDTO[];
  agenda: AgendaSlotDTO[];
  state: EventStateDTO;
  rooms: ChatRoomDTO[];
  announcements: AnnouncementDTO[];
}

export interface AdminLoginResponse {
  token: string;
}

export interface CreateEventResponse {
  slug: string;
  adminToken: string;
}

export interface SocketError {
  code: string;
  message: string;
}

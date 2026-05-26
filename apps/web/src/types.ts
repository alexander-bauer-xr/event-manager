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

export type LocationInputDTO = Omit<LocationDTO, 'id'> & { id?: string | null };

export interface AgendaSlotDTO {
  id: string;
  title: string;
  description: string | null;
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

export interface TravelPlaceDTO {
  id: string;
  eventId: string;
  stopId: string | null;
  parentId: string | null;
  title: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  category: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepPlaceDTO {
  id: string;
  stepId: string;
  placeId: string;
  role: string | null;
  sortIndex: number;
  routeStop: boolean;
  place: TravelPlaceDTO;
}

export interface TravelStepDTO {
  id: string;
  eventId: string;
  stopId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  sortIndex: number;
  summary: string | null;
  routeMode: string | null;
  createdAt: string;
  updatedAt: string;
  stepPlaces: StepPlaceDTO[];
}

export interface TravelStopDTO {
  id: string;
  eventId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  sortIndex: number;
  lat: number | null;
  lng: number | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  steps: TravelStepDTO[];
}

export type NoteOwnerType = 'event' | 'stop' | 'step' | 'place';

export interface NotePageDTO {
  id: string;
  eventId: string;
  ownerType: NoteOwnerType;
  ownerId: string;
  title: string;
  markdown: string;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TravelHubDTO {
  event: Pick<EventDTO, 'id' | 'slug' | 'title'>;
  stops: TravelStopDTO[];
  places: TravelPlaceDTO[];
  notes: NotePageDTO[];
}

export interface TravelStructureInput {
  stops: Array<{
    id?: string | null;
    title: string;
    startsAt?: string | null;
    endsAt?: string | null;
    lat?: number | null;
    lng?: number | null;
    summary?: string | null;
    steps: Array<{
      id?: string | null;
      title: string;
      startsAt?: string | null;
      endsAt?: string | null;
      summary?: string | null;
      routeMode?: string | null;
      places: Array<{
        placeId: string;
        role?: string | null;
        routeStop?: boolean;
      }>;
    }>;
  }>;
  places: Array<{
    id?: string | null;
    stopId?: string | null;
    parentId?: string | null;
    title: string;
    lat?: number | null;
    lng?: number | null;
    address?: string | null;
    category?: string | null;
    summary?: string | null;
  }>;
}

export interface NotePageInput {
  ownerType: NoteOwnerType;
  ownerId: string;
  title: string;
  markdown: string;
  isSensitive?: boolean;
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

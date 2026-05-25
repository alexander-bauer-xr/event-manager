import {
  SnapshotDTO,
  AdminLoginResponse,
  AgendaSlotDTO,
  LocationInputDTO,
  LocationDTO,
  EventStateDTO,
  AnnouncementDTO,
  PaginationOptions,
  PaginatedMessagesResult,
  TravelHubDTO,
  TravelStructureInput,
  NotePageDTO,
  NotePageInput,
} from '../types';
import {
  snapshotSchema,
  adminLoginResponseSchema,
  eventStateSchema,
  announcementSchema,
  notePageSchema,
} from '../validators';

const API_URL = import.meta.env.VITE_API_URL ?? '';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  validator?: (data: unknown) => T
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      ...options?.headers as Record<string, string>,
    };

    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: 'Request failed' }));
      throw new ApiError(response.status, error.code, error.message);
    }

    const data = await response.json();
    return validator ? validator(data) : data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }
}

export async function getSnapshot(slug: string): Promise<SnapshotDTO> {
  return fetchJson(`/api/events/${slug}/snapshot`, {}, (data) => snapshotSchema.parse(data));
}

export async function getTravelHub(slug: string): Promise<TravelHubDTO> {
  return fetchJson(`/api/events/${slug}/travel`);
}

export async function getAdminTravelHub(slug: string, jwt: string): Promise<TravelHubDTO> {
  return fetchJson(`/api/admin/events/${slug}/travel`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
}

export async function saveTravelStructure(
  slug: string,
  jwt: string,
  structure: TravelStructureInput
): Promise<TravelHubDTO> {
  return fetchJson(`/api/admin/events/${slug}/travel`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(structure),
  });
}

export async function saveNotePage(
  slug: string,
  jwt: string,
  note: NotePageInput
): Promise<NotePageDTO> {
  return fetchJson(
    `/api/admin/events/${slug}/notes`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(note),
    },
    (data) => notePageSchema.parse(data)
  );
}

export async function adminLogin(slug: string, token: string): Promise<AdminLoginResponse> {
  return fetchJson(
    '/api/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ slug, token }),
    },
    (data) => adminLoginResponseSchema.parse(data)
  );
}

export async function adminNext(slug: string, jwt: string): Promise<EventStateDTO> {
  return fetchJson(
    `/api/admin/events/${slug}/next`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    (data) => eventStateSchema.parse(data)
  );
}

export async function adminAnnounce(slug: string, jwt: string, text: string): Promise<AnnouncementDTO> {
  return fetchJson(
    `/api/admin/events/${slug}/announce`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ text }),
    },
    (data) => announcementSchema.parse(data)
  );
}

export async function saveAgenda(
  slug: string,
  jwt: string,
  slots: Array<Omit<AgendaSlotDTO, 'id' | 'sortIndex'>>
): Promise<AgendaSlotDTO[]> {
  return fetchJson(`/api/admin/events/${slug}/agenda`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ slots }),
  });
}

export async function saveLocations(
  slug: string,
  jwt: string,
  locations: LocationInputDTO[]
): Promise<LocationDTO[]> {
  return fetchJson(`/api/admin/events/${slug}/locations`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ locations }),
  });
}

export async function getChatMessages(
  slug: string,
  roomKey: string,
  limit = 50
): Promise<import('../types').ChatMessageDTO[]> {
  return fetchJson(`/api/events/${slug}/chat/${roomKey}/messages?limit=${limit}`);
}

export async function getChatMessagesPaginated(
  slug: string,
  roomKey: string,
  options: PaginationOptions = {}
): Promise<PaginatedMessagesResult> {
  const params = new URLSearchParams();

  if (options.cursor) params.append('cursor', options.cursor);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.direction) params.append('direction', options.direction);

  const url = `/api/events/${slug}/chat/${roomKey}/messages/paginated?${params.toString()}`;
  return fetchJson(url);
}

import { prisma } from '../db/prisma';
import { hashToken, randomToken, slugifyUnique } from '../utils/crypto';
import { Errors } from '../utils/errors';

export interface CreateEventInput {
  title: string;
  startsAt?: Date;
  endsAt?: Date;
}

export interface UpdateEventInput {
  title?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface CreateEventResult {
  slug: string;
  adminToken: string;
}

export interface EventSnapshot {
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
  };
  locations: Array<{
    id: string;
    title: string;
    lat: number | null;
    lng: number | null;
    address: string | null;
    note: string | null;
  }>;
  agenda: Array<{
    id: string;
    title: string;
    description: string | null;
    startTime: Date | null;
    endTime: Date | null;
    locationId: string | null;
    sortIndex: number;
  }>;
  state: {
    currentSlotId: string | null;
    updatedAt: Date;
  };
  rooms: Array<{
    id: string;
    key: string;
    title: string;
    isAdminOnly: boolean;
  }>;
  announcements: Array<{
    id: string;
    text: string;
    createdAt: Date;
  }>;
}

export class EventService {
  async createEvent(input: CreateEventInput): Promise<CreateEventResult> {
    const slug = await slugifyUnique();
    const adminToken = randomToken();
    const adminTokenHash = await hashToken(adminToken);

    const event = await prisma.event.create({
      data: {
        slug,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        adminTokenHash,
        chatRooms: {
          create: {
            key: 'general',
            title: 'General',
            isAdminOnly: false,
          },
        },
        state: {
          create: {
            currentSlotId: null,
          },
        },
      },
    });

    return {
      slug: event.slug,
      adminToken,
    };
  }

  async updateEvent(slug: string, input: UpdateEventInput) {
    const event = await prisma.event.findUnique({
      where: { slug },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const updated = await prisma.event.update({
      where: { slug },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    return updated;
  }

  async getSnapshot(slug: string): Promise<EventSnapshot> {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const locations = await prisma.location.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        title: true,
        lat: true,
        lng: true,
        address: true,
        note: true,
      },
    });

    const [agenda, state, rooms, announcements] = await Promise.all([
      prisma.agendaSlot.findMany({
        where: { eventId: event.id },
        orderBy: { sortIndex: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          locationId: true,
          sortIndex: true,
        },
      }),
      this.ensureEventState(event.id),
      this.ensureChatRooms(event.id, locations),
      prisma.announcement.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          text: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      event,
      locations,
      agenda,
      state: {
        currentSlotId: state.currentSlotId,
        updatedAt: state.updatedAt,
      },
      rooms: rooms.map(r => ({
        id: r.id,
        key: r.key,
        title: r.title,
        isAdminOnly: r.isAdminOnly,
      })),
      announcements,
    };
  }

  private async ensureEventState(eventId: string) {
    let state = await prisma.eventState.findUnique({
      where: { eventId },
    });

    if (!state) {
      state = await prisma.eventState.create({
        data: {
          eventId,
          currentSlotId: null,
        },
      });
    }

    return state;
  }

  private async ensureChatRooms(eventId: string, locations: Array<{ id: string; title: string }>) {
    const existingRooms = await prisma.chatRoom.findMany({
      where: { eventId },
    });

    const existingKeys = new Set(existingRooms.map(r => r.key));

    const roomsToCreate = [];

    if (!existingKeys.has('general')) {
      roomsToCreate.push({
        eventId,
        key: 'general',
        title: 'General',
        isAdminOnly: false,
      });
    }

    if (!existingKeys.has('orga')) {
      roomsToCreate.push({
        eventId,
        key: 'orga',
        title: 'Organization',
        isAdminOnly: true,
      });
    }

    for (const location of locations) {
      const key = `location:${location.id}`;
      if (!existingKeys.has(key)) {
        roomsToCreate.push({
          eventId,
          key,
          title: location.title,
          isAdminOnly: false,
        });
      }
    }

    if (roomsToCreate.length > 0) {
      await prisma.chatRoom.createMany({
        data: roomsToCreate,
      });
    }

    return prisma.chatRoom.findMany({
      where: { eventId },
    });
  }

  async advanceToNext(slug: string): Promise<{ currentSlotId: string | null; updatedAt: Date }> {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const state = await prisma.eventState.findUnique({
      where: { eventId: event.id },
    });

    if (!state) {
      throw Errors.EVENT_NOT_FOUND();
    }

    let nextSlot;

    if (!state.currentSlotId) {
      nextSlot = await prisma.agendaSlot.findFirst({
        where: { eventId: event.id },
        orderBy: { sortIndex: 'asc' },
      });
    } else {
      const currentSlot = await prisma.agendaSlot.findUnique({
        where: { id: state.currentSlotId },
      });

      if (currentSlot) {
        nextSlot = await prisma.agendaSlot.findFirst({
          where: {
            eventId: event.id,
            sortIndex: { gt: currentSlot.sortIndex },
          },
          orderBy: { sortIndex: 'asc' },
        });
      }
    }

    const updatedState = await prisma.eventState.update({
      where: { eventId: event.id },
      data: {
        currentSlotId: nextSlot?.id || state.currentSlotId,
        updatedAt: new Date(),
      },
    });

    return {
      currentSlotId: updatedState.currentSlotId,
      updatedAt: updatedState.updatedAt,
    };
  }

  async createAnnouncement(slug: string, text: string) {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    return prisma.announcement.create({
      data: {
        eventId: event.id,
        text,
      },
    });
  }

  async updateAgenda(
    slug: string,
    slots: Array<{
      title: string;
      description?: string | null;
      startTime?: Date | null;
      endTime?: Date | null;
      locationId?: string | null;
    }>
  ) {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    await prisma.agendaSlot.deleteMany({
      where: { eventId: event.id },
    });

    await prisma.agendaSlot.createMany({
      data: slots.map((slot, index) => ({
        eventId: event.id,
        title: slot.title,
        description: slot.description,
        startTime: slot.startTime,
        endTime: slot.endTime,
        locationId: slot.locationId,
        sortIndex: index,
      })),
    });

    return prisma.agendaSlot.findMany({
      where: { eventId: event.id },
      orderBy: { sortIndex: 'asc' },
    });
  }

  async updateLocations(
    slug: string,
    locations: Array<{
      title: string;
      lat?: number | null;
      lng?: number | null;
      address?: string | null;
      note?: string | null;
    }>
  ) {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    await prisma.location.deleteMany({
      where: { eventId: event.id },
    });

    const created = await Promise.all(
      locations.map(loc =>
        prisma.location.create({
          data: {
            eventId: event.id,
            title: loc.title,
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
            note: loc.note,
          },
        })
      )
    );

    await this.ensureChatRooms(event.id, created);

    return created;
  }
}

export const eventService = new EventService();

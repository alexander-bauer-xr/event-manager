import { prisma } from '../db/prisma';
import { hashToken, randomToken, slugifyUnique } from '../utils/crypto';
import { Errors } from '../utils/errors';

export interface CreateEventInput {
  title: string;
  startsAt?: Date;
  endsAt?: Date;
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

type AgendaSlotForSync = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  sortIndex: number;
};

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

    const state = await this.syncEventStateByTime(event.id);

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

    const [agenda, rooms, announcements] = await Promise.all([
      prisma.agendaSlot.findMany({
        where: { eventId: event.id },
        orderBy: { sortIndex: 'asc' },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          locationId: true,
          sortIndex: true,
        },
      }),
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

  private pickTimeBasedSlotId(
    slots: AgendaSlotForSync[],
    currentSlotId: string | null,
    now: Date
  ): string | null {
    if (slots.length === 0) {
      return null;
    }

    const nowMs = now.getTime();
    const activeSlot = slots.find((slot) => {
      if (!slot.startTime) return false;
      const startsAt = slot.startTime.getTime();
      const endsAt = slot.endTime?.getTime();
      return startsAt <= nowMs && (!endsAt || endsAt > nowMs);
    });

    if (activeSlot) {
      return activeSlot.id;
    }

    const currentSlot = currentSlotId ? slots.find((slot) => slot.id === currentSlotId) : null;
    if (!currentSlot) {
      const latestStartedSlot = [...slots]
        .filter((slot) => slot.startTime && slot.startTime.getTime() <= nowMs)
        .sort((a, b) => b.sortIndex - a.sortIndex)[0];

      return latestStartedSlot?.id ?? null;
    }

    if (currentSlot.endTime && currentSlot.endTime.getTime() <= nowMs) {
      const nextSlot = slots.find((slot) => slot.sortIndex > currentSlot.sortIndex);
      return nextSlot?.id ?? currentSlot.id;
    }

    return currentSlot.id;
  }

  private async syncEventStateByTime(eventId: string): Promise<{ currentSlotId: string | null; updatedAt: Date }> {
    const state = await this.ensureEventState(eventId);
    const slots = await prisma.agendaSlot.findMany({
      where: { eventId },
      orderBy: { sortIndex: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        sortIndex: true,
      },
    });

    const nextSlotId = this.pickTimeBasedSlotId(slots, state.currentSlotId, new Date());

    if (nextSlotId === state.currentSlotId) {
      return state;
    }

    return prisma.eventState.update({
      where: { eventId },
      data: {
        currentSlotId: nextSlotId,
        updatedAt: new Date(),
      },
    });
  }

  async syncEventStateForSlug(slug: string): Promise<{ state: { currentSlotId: string | null; updatedAt: Date }; changed: boolean }> {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const before = await this.ensureEventState(event.id);
    const state = await this.syncEventStateByTime(event.id);

    return {
      state: {
        currentSlotId: state.currentSlotId,
        updatedAt: state.updatedAt,
      },
      changed: before.currentSlotId !== state.currentSlotId,
    };
  }

  private async ensureChatRooms(eventId: string, locations: Array<{ id: string; title: string }>) {
    const existingRooms = await prisma.chatRoom.findMany({
      where: { eventId },
    });

    const existingByKey = new Map(existingRooms.map(r => [r.key, r]));

    const ensureRoom = async (key: string, title: string, isAdminOnly: boolean) => {
      const existing = existingByKey.get(key);
      if (!existing) {
        return prisma.chatRoom.create({
          data: {
            eventId,
            key,
            title,
            isAdminOnly,
          },
        });
      }

      if (existing.title !== title || existing.isAdminOnly !== isAdminOnly) {
        return prisma.chatRoom.update({
          where: { id: existing.id },
          data: { title, isAdminOnly },
        });
      }

      return existing;
    };

    await ensureRoom('general', 'General', false);
    await ensureRoom('orga', 'Organization', true);

    for (const location of locations) {
      await ensureRoom(`location:${location.id}`, location.title, false);
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
        startTime: slot.startTime,
        endTime: slot.endTime,
        locationId: slot.locationId,
        sortIndex: index,
      })),
    });

    await this.syncEventStateByTime(event.id);

    return prisma.agendaSlot.findMany({
      where: { eventId: event.id },
      orderBy: { sortIndex: 'asc' },
    });
  }

  async updateLocations(
    slug: string,
    locations: Array<{
      id?: string | null;
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

    const existingLocations = await prisma.location.findMany({
      where: { eventId: event.id },
      select: { id: true },
    });
    const existingIds = new Set(existingLocations.map((loc) => loc.id));
    const incomingExistingIds = new Set(
      locations
        .map((loc) => loc.id)
        .filter((id): id is string => Boolean(id))
    );

    for (const loc of locations) {
      if (loc.id && !existingIds.has(loc.id)) {
        throw Errors.VALIDATION_ERROR('Location id does not belong to this event');
      }
    }

    const removedIds = existingLocations
      .map((loc) => loc.id)
      .filter((id) => !incomingExistingIds.has(id));

    await prisma.$transaction(async (tx) => {
      for (const loc of locations) {
        const data = {
          title: loc.title,
          lat: loc.lat,
          lng: loc.lng,
          address: loc.address,
          note: loc.note,
        };

        if (loc.id) {
          await tx.location.update({
            where: { id: loc.id },
            data,
          });
        } else {
          await tx.location.create({
            data: {
              eventId: event.id,
              ...data,
            },
          });
        }
      }

      if (removedIds.length > 0) {
        await tx.chatRoom.deleteMany({
          where: {
            eventId: event.id,
            key: { in: removedIds.map((id) => `location:${id}`) },
          },
        });

        await tx.location.deleteMany({
          where: {
            eventId: event.id,
            id: { in: removedIds },
          },
        });
      }
    });

    const updatedLocations = await prisma.location.findMany({
      where: { eventId: event.id },
    });

    await this.ensureChatRooms(event.id, updatedLocations);

    return updatedLocations;
  }
}

export const eventService = new EventService();
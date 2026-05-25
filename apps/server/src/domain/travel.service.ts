import { prisma } from '../db/prisma';
import { Errors } from '../utils/errors';

export type OwnerType = 'event' | 'stop' | 'step' | 'place';

export interface TravelStructureInput {
  stops: Array<{
    id?: string | null;
    title: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
    lat?: number | null;
    lng?: number | null;
    summary?: string | null;
    steps?: Array<{
      id?: string | null;
      agendaSlotId?: string | null;
      title: string;
      startsAt?: Date | null;
      endsAt?: Date | null;
      summary?: string | null;
      routeMode?: string | null;
      places?: Array<{
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
  ownerType: OwnerType;
  ownerId: string;
  title: string;
  markdown: string;
  isSensitive?: boolean;
}

export class TravelService {
  private async getEvent(slug: string) {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    return event;
  }

  async getTravelHub(slug: string, includeSensitive = false) {
    const event = await this.getEvent(slug);

    const [stops, places, notes, agenda, state] = await Promise.all([
      prisma.travelStop.findMany({
        where: { eventId: event.id },
        orderBy: { sortIndex: 'asc' },
        include: {
          steps: {
            orderBy: { sortIndex: 'asc' },
            include: {
              agendaSlot: true,
              stepPlaces: {
                orderBy: { sortIndex: 'asc' },
                include: { place: true },
              },
            },
          },
        },
      }),
      prisma.travelPlace.findMany({
        where: { eventId: event.id },
        orderBy: [{ stopId: 'asc' }, { title: 'asc' }],
      }),
      prisma.notePage.findMany({
        where: {
          eventId: event.id,
          ...(includeSensitive ? {} : { isSensitive: false }),
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.agendaSlot.findMany({
        where: { eventId: event.id },
        orderBy: { sortIndex: 'asc' },
      }),
      prisma.eventState.findUnique({ where: { eventId: event.id } }),
    ]);

    return { event, stops, places, notes, agenda, state };
  }

  async updateTravelStructure(slug: string, input: TravelStructureInput) {
    const event = await this.getEvent(slug);

    const existingStops = await prisma.travelStop.findMany({ where: { eventId: event.id }, select: { id: true } });
    const existingPlaces = await prisma.travelPlace.findMany({ where: { eventId: event.id }, select: { id: true } });
    const agendaSlots = await prisma.agendaSlot.findMany({ where: { eventId: event.id }, select: { id: true } });

    const existingStopIds = new Set(existingStops.map((stop) => stop.id));
    const existingPlaceIds = new Set(existingPlaces.map((place) => place.id));
    const agendaSlotIds = new Set(agendaSlots.map((slot) => slot.id));
    const incomingStopIds = new Set(input.stops.map((stop) => stop.id).filter((id): id is string => Boolean(id)));
    const incomingPlaceIds = new Set(input.places.map((place) => place.id).filter((id): id is string => Boolean(id)));

    for (const stop of input.stops) {
      if (stop.id && !existingStopIds.has(stop.id)) {
        throw Errors.VALIDATION_ERROR('Stop id does not belong to this event');
      }

      for (const step of stop.steps || []) {
        if (step.agendaSlotId && !agendaSlotIds.has(step.agendaSlotId)) {
          throw Errors.VALIDATION_ERROR('Agenda slot id does not belong to this event');
        }
      }
    }

    for (const place of input.places) {
      if (place.id && !existingPlaceIds.has(place.id)) {
        throw Errors.VALIDATION_ERROR('Place id does not belong to this event');
      }
    }

    const removedStopIds = Array.from(existingStopIds).filter((id) => !incomingStopIds.has(id));
    const removedPlaceIds = Array.from(existingPlaceIds).filter((id) => !incomingPlaceIds.has(id));

    await prisma.$transaction(async (tx) => {
      if (removedStopIds.length > 0) {
        await tx.travelStop.deleteMany({ where: { eventId: event.id, id: { in: removedStopIds } } });
      }

      for (const place of input.places) {
        const data = {
          eventId: event.id,
          stopId: place.stopId || null,
          parentId: place.parentId || null,
          title: place.title,
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          category: place.category,
          summary: place.summary,
        };

        if (place.id) {
          await tx.travelPlace.update({ where: { id: place.id }, data });
        } else {
          await tx.travelPlace.create({ data });
        }
      }

      if (removedPlaceIds.length > 0) {
        await tx.travelPlace.deleteMany({ where: { eventId: event.id, id: { in: removedPlaceIds } } });
      }

      for (const [sortIndex, stop] of input.stops.entries()) {
        const stopData = {
          eventId: event.id,
          title: stop.title,
          startsAt: stop.startsAt,
          endsAt: stop.endsAt,
          lat: stop.lat,
          lng: stop.lng,
          summary: stop.summary,
          sortIndex,
        };

        const savedStop = stop.id
          ? await tx.travelStop.update({ where: { id: stop.id }, data: stopData })
          : await tx.travelStop.create({ data: stopData });

        const existingSteps = await tx.travelStep.findMany({
          where: { eventId: event.id, stopId: savedStop.id },
          select: { id: true },
        });
        const existingStepIds = new Set(existingSteps.map((step) => step.id));
        const incomingStepIds = new Set((stop.steps || []).map((step) => step.id).filter((id): id is string => Boolean(id)));
        const removedStepIds = Array.from(existingStepIds).filter((id) => !incomingStepIds.has(id));

        if (removedStepIds.length > 0) {
          await tx.travelStep.deleteMany({ where: { id: { in: removedStepIds } } });
        }

        for (const [stepSortIndex, step] of (stop.steps || []).entries()) {
          const stepData = {
            eventId: event.id,
            stopId: savedStop.id,
            agendaSlotId: step.agendaSlotId || null,
            title: step.title,
            startsAt: step.startsAt,
            endsAt: step.endsAt,
            summary: step.summary,
            routeMode: step.routeMode,
            sortIndex: stepSortIndex,
          };

          const savedStep = step.id
            ? await tx.travelStep.update({ where: { id: step.id }, data: stepData })
            : await tx.travelStep.create({ data: stepData });

          await tx.stepPlace.deleteMany({ where: { stepId: savedStep.id } });

          for (const [placeSortIndex, stepPlace] of (step.places || []).entries()) {
            await tx.stepPlace.create({
              data: {
                stepId: savedStep.id,
                placeId: stepPlace.placeId,
                role: stepPlace.role,
                routeStop: stepPlace.routeStop ?? true,
                sortIndex: placeSortIndex,
              },
            });
          }
        }
      }
    });

    return this.getTravelHub(slug, true);
  }

  async upsertNote(slug: string, input: NotePageInput) {
    const event = await this.getEvent(slug);

    const existing = await prisma.notePage.findFirst({
      where: {
        eventId: event.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      },
    });

    if (existing) {
      return prisma.notePage.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          markdown: input.markdown,
          isSensitive: input.isSensitive ?? false,
        },
      });
    }

    return prisma.notePage.create({
      data: {
        eventId: event.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        title: input.title,
        markdown: input.markdown,
        isSensitive: input.isSensitive ?? false,
      },
    });
  }
}

export const travelService = new TravelService();

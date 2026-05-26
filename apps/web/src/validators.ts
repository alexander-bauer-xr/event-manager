import { z } from 'zod';

export const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
});

export const locationSchema = z.object({
  id: z.string(),
  title: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().nullable(),
  note: z.string().nullable(),
});

export const agendaSlotSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  locationId: z.string().nullable(),
  sortIndex: z.number(),
});

export const eventStateSchema = z.object({
  currentSlotId: z.string().nullable(),
  updatedAt: z.string(),
});

export const announcementSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});

export const chatRoomSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  isAdminOnly: z.boolean(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  guestId: z.string(),
  guestName: z.string(),
  text: z.string(),
  createdAt: z.string(),
});

export const travelPlaceSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  stopId: z.string().nullable(),
  parentId: z.string().nullable(),
  title: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().nullable(),
  category: z.string().nullable(),
  summary: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const stepPlaceSchema = z.object({
  id: z.string(),
  stepId: z.string(),
  placeId: z.string(),
  role: z.string().nullable(),
  sortIndex: z.number(),
  routeStop: z.boolean(),
  place: travelPlaceSchema,
});

export const travelStepSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  stopId: z.string(),
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  sortIndex: z.number(),
  summary: z.string().nullable(),
  routeMode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stepPlaces: z.array(stepPlaceSchema),
});

export const travelStopSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  sortIndex: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  summary: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(travelStepSchema),
});

export const notePageSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  ownerType: z.enum(['event', 'stop', 'step', 'place']),
  ownerId: z.string(),
  title: z.string(),
  markdown: z.string(),
  isSensitive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const travelHubSchema = z.object({
  event: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
  }),
  stops: z.array(travelStopSchema),
  places: z.array(travelPlaceSchema),
  notes: z.array(notePageSchema),
});

export const snapshotSchema = z.object({
  event: eventSchema,
  locations: z.array(locationSchema),
  agenda: z.array(agendaSlotSchema),
  state: eventStateSchema,
  rooms: z.array(chatRoomSchema),
  announcements: z.array(announcementSchema),
});

export const adminLoginResponseSchema = z.object({
  token: z.string(),
});

export const socketErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

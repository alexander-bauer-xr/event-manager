import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const adminLoginSchema = z.object({
  slug: z.string().min(1),
  token: z.string().min(1),
});

export const announceSchema = z.object({
  text: z.string().min(1).max(500),
});

export const agendaSlotInputSchema = z.object({
  title: z.string().min(1).max(200),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
  locationId: z.string().nullable().optional(),
});

export const updateAgendaSchema = z.object({
  slots: z.array(agendaSlotInputSchema),
});

export const locationInputSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const updateLocationsSchema = z.object({
  locations: z.array(locationInputSchema),
});

export const travelStepPlaceInputSchema = z.object({
  placeId: z.string().min(1),
  role: z.string().max(80).nullable().optional(),
  routeStop: z.boolean().optional(),
});

export const travelStepInputSchema = z.object({
  id: z.string().nullable().optional(),
  agendaSlotId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
  routeMode: z.string().max(40).nullable().optional(),
  places: z.array(travelStepPlaceInputSchema).optional().default([]),
});

export const travelStopInputSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
  steps: z.array(travelStepInputSchema).optional().default([]),
});

export const travelPlaceInputSchema = z.object({
  id: z.string().nullable().optional(),
  stopId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
});

export const updateTravelStructureSchema = z.object({
  stops: z.array(travelStopInputSchema),
  places: z.array(travelPlaceInputSchema),
});

export const upsertNoteSchema = z.object({
  ownerType: z.enum(['event', 'stop', 'step', 'place']),
  ownerId: z.string().min(1),
  title: z.string().min(1).max(200),
  markdown: z.string().max(50000),
  isSensitive: z.boolean().optional(),
});

export const adminCreateKeySchema = z.object({
  adminCreateKey: z.string(),
});

export const chatEditSchema = z.object({
  slug: z.string().min(1),
  roomKey: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(400),
});

export const chatDeleteSchema = z.object({
  slug: z.string().min(1),
  roomKey: z.string().min(1),
  messageId: z.string().min(1),
});

export const chatTypingSchema = z.object({
  slug: z.string().min(1),
  roomKey: z.string().min(1),
  isTyping: z.boolean(),
});

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  direction: z.enum(['before', 'after']).optional().default('before'),
});

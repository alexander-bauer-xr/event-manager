import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
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
  description: z.string().max(1000).nullable().optional(),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
  locationId: z.string().nullable().optional(),
});

export const updateAgendaSchema = z.object({
  slots: z.array(agendaSlotInputSchema),
});

export const locationInputSchema = z.object({
  title: z.string().min(1).max(200),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const updateLocationsSchema = z.object({
  locations: z.array(locationInputSchema),
});

export const adminCreateKeySchema = z.object({
  adminCreateKey: z.string(),
});

// Chat schemas
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

// Pagination schema for HTTP endpoint
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  direction: z.enum(['before', 'after']).optional().default('before'),
});

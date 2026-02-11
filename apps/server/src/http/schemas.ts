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
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().optional(),
});

export const updateAgendaSchema = z.object({
  slots: z.array(agendaSlotInputSchema),
});

export const locationInputSchema = z.object({
  title: z.string().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
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

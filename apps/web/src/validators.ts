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

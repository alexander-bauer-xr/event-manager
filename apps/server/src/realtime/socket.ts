import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { config } from '../config';
import { authService } from '../domain/auth.service';
import { chatService } from '../domain/chat.service';
import { eventService } from '../domain/event.service';
import { AppError, toErrorResponse } from '../utils/errors';
import { chatRoom, eventRoom, SocketEvents } from './events';
import { presenceService } from './presence.service';
import { chatEditSchema, chatDeleteSchema, chatTypingSchema } from '../http/schemas';
import { randomBytes } from 'crypto';

interface SocketData {
  guestId?: string;
  guestName?: string;
  isAdmin?: boolean;
  adminSlug?: string;
  currentSlug?: string; // Track current event for presence cleanup
}

const eventJoinSchema = z.object({
  slug: z.string(),
  guestName: z.string().min(1).max(50),
  existingGuestId: z.string().optional(), // Allow client to reuse existing guestId
});

const chatJoinSchema = z.object({
  slug: z.string(),
  roomKey: z.string(),
});

const chatSendSchema = z.object({
  slug: z.string(),
  roomKey: z.string(),
  text: z.string(),
});

const adminNextSchema = z.object({
  slug: z.string(),
});

const adminAnnounceSchema = z.object({
  slug: z.string(),
  text: z.string().min(1).max(500),
});

const adminAuthSchema = z.object({
  token: z.string(),
});

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.data.guestId = randomBytes(16).toString('hex');

    socket.on(SocketEvents.CLIENT_EVENT_JOIN, async (data: any, callback: any) => {
      try {
        const { slug, guestName, existingGuestId } = eventJoinSchema.parse(data);

        // Use existing guestId if provided, otherwise use the one generated on connection
        if (existingGuestId) {
          socket.data.guestId = existingGuestId;
        }

        socket.data.guestName = guestName;
        socket.data.currentSlug = slug;

        const snapshot = await eventService.getSnapshot(slug);

        socket.emit(SocketEvents.SERVER_EVENT_SNAPSHOT, snapshot);

        await socket.join(eventRoom(slug));
        await socket.join(chatRoom(slug, 'general'));

        // Track presence
        presenceService.join(slug, socket.id, socket.data.guestId!, guestName);

        // Broadcast presence update to all users in event
        const presence = presenceService.getOnlineUsers(slug);
        io.to(eventRoom(slug)).emit(SocketEvents.SERVER_PRESENCE_UPDATE, presence);

        if (callback) callback({ success: true, guestId: socket.data.guestId });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_CHAT_JOIN, async (data: any, callback: any) => {
      try {
        const { slug, roomKey } = chatJoinSchema.parse(data);

        await socket.join(chatRoom(slug, roomKey));

        if (callback) callback({ success: true });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_CHAT_SEND, async (data: any, callback: any) => {
      try {
        const { slug, roomKey, text } = chatSendSchema.parse(data);

        if (!socket.data.guestId || !socket.data.guestName) {
          throw new AppError('UNAUTHORIZED', 401, 'Must join event first');
        }

        const message = await chatService.sendMessage({
          slug,
          roomKey,
          guestId: socket.data.guestId,
          guestName: socket.data.guestName,
          text,
          isAdmin: socket.data.isAdmin,
        });

        io.to(chatRoom(slug, roomKey)).emit(SocketEvents.SERVER_CHAT_NEW, {
          roomKey,
          message,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_ADMIN_AUTH, async (data: any, callback: any) => {
      try {
        const { token } = adminAuthSchema.parse(data);

        const claims = authService.verifyJwt(token);

        socket.data.isAdmin = true;
        socket.data.adminSlug = claims.slug;

        if (callback) callback({ success: true, slug: claims.slug });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_ADMIN_NEXT, async (data: any, callback: any) => {
      try {
        const { slug } = adminNextSchema.parse(data);

        if (!socket.data.isAdmin || socket.data.adminSlug !== slug) {
          throw new AppError('UNAUTHORIZED', 401, 'Admin authentication required');
        }

        const state = await eventService.advanceToNext(slug);

        io.to(eventRoom(slug)).emit(SocketEvents.SERVER_STATE_UPDATE, state);

        if (callback) callback({ success: true, state });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_ADMIN_ANNOUNCE, async (data: any, callback: any) => {
      try {
        const { slug, text } = adminAnnounceSchema.parse(data);

        if (!socket.data.isAdmin || socket.data.adminSlug !== slug) {
          throw new AppError('UNAUTHORIZED', 401, 'Admin authentication required');
        }

        const announcement = await eventService.createAnnouncement(slug, text);

        io.to(eventRoom(slug)).emit(SocketEvents.SERVER_ANNOUNCEMENT_NEW, {
          announcement,
        });

        if (callback) callback({ success: true, announcement });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_CHAT_EDIT, async (data: any, callback: any) => {
      try {
        const { slug, roomKey, messageId, text } = chatEditSchema.parse(data);

        if (!socket.data.guestId) {
          throw new AppError('UNAUTHORIZED', 401, 'Must join event first');
        }

        const message = await chatService.editMessage({
          messageId,
          guestId: socket.data.guestId,
          newText: text,
          isAdmin: socket.data.isAdmin,
        });

        io.to(chatRoom(slug, roomKey)).emit(SocketEvents.SERVER_CHAT_EDITED, {
          roomKey,
          message,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_CHAT_DELETE, async (data: any, callback: any) => {
      try {
        const { slug, roomKey, messageId } = chatDeleteSchema.parse(data);

        if (!socket.data.guestId) {
          throw new AppError('UNAUTHORIZED', 401, 'Must join event first');
        }

        const result = await chatService.deleteMessage({
          messageId,
          guestId: socket.data.guestId,
          isAdmin: socket.data.isAdmin,
        });

        io.to(chatRoom(slug, roomKey)).emit(SocketEvents.SERVER_CHAT_DELETED, {
          roomKey,
          messageId: result.messageId,
          deletedAt: result.deletedAt,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        const response = error instanceof z.ZodError
          ? toErrorResponse(new AppError('VALIDATION_ERROR', 400, error.message))
          : toErrorResponse(error);
        socket.emit(SocketEvents.SERVER_ERROR, response);
        if (callback) callback({ success: false, error: response });
      }
    });

    socket.on(SocketEvents.CLIENT_CHAT_TYPING, async (data: any) => {
      try {
        const { slug, roomKey, isTyping } = chatTypingSchema.parse(data);

        if (!socket.data.guestId || !socket.data.guestName) {
          return; // Silently ignore if not joined
        }

        // Broadcast to others in the room (exclude sender)
        socket.to(chatRoom(slug, roomKey)).emit(SocketEvents.SERVER_CHAT_TYPING, {
          roomKey,
          guestId: socket.data.guestId,
          guestName: socket.data.guestName,
          isTyping,
        });
      } catch (error) {
        // Silently ignore typing errors (non-critical)
      }
    });

    socket.on('disconnect', () => {
      // Clean up presence when user disconnects
      if (socket.data.currentSlug && socket.data.guestId) {
        presenceService.leave(socket.data.currentSlug, socket.id);

        // Broadcast updated presence
        const presence = presenceService.getOnlineUsers(socket.data.currentSlug);
        io.to(eventRoom(socket.data.currentSlug)).emit(SocketEvents.SERVER_PRESENCE_UPDATE, presence);
      }
    });
  });

  return io;
}

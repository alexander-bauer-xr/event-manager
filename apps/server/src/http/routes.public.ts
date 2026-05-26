import { FastifyInstance } from 'fastify';
import { eventService } from '../domain/event.service';
import { chatService } from '../domain/chat.service';
import { travelService } from '../domain/travel.service';
import { AppError, toErrorResponse } from '../utils/errors';
import { paginationQuerySchema } from './schemas';

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get('/api/events/:slug/snapshot', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const snapshot = await eventService.getSnapshot(slug);
      return snapshot;
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.get('/api/events/:slug/travel', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      return travelService.getTravelHub(slug, false);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.get('/api/events/:slug/chat/:roomKey/messages', async (request, reply) => {
    try {
      const { slug, roomKey } = request.params as { slug: string; roomKey: string };
      const { limit } = request.query as { limit?: string };
      const messages = await chatService.getMessages(slug, roomKey, limit ? parseInt(limit, 10) : 50);
      return messages.reverse();
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.get('/api/events/:slug/chat/:roomKey/messages/paginated', async (request, reply) => {
    try {
      const { slug, roomKey } = request.params as { slug: string; roomKey: string };
      const queryParams = paginationQuerySchema.parse(request.query);

      const result = await chatService.getMessagesPaginated(slug, roomKey, queryParams);
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.get('/health', async () => {
    return { status: 'ok' };
  });
}
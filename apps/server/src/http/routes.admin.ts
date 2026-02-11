import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { authService } from '../domain/auth.service';
import { eventService } from '../domain/event.service';
import { AppError, Errors, toErrorResponse } from '../utils/errors';
import {
  adminLoginSchema,
  announceSchema,
  createEventSchema,
  updateAgendaSchema,
  updateLocationsSchema,
} from './schemas';

async function verifyAdmin(request: FastifyRequest, slug?: string) {
  const token = authService.extractBearerToken(request.headers.authorization);
  if (!token) {
    throw Errors.UNAUTHORIZED();
  }

  const claims = authService.verifyJwt(token);
  if (slug && claims.slug !== slug) {
    throw Errors.FORBIDDEN('Token does not match event');
  }

  return claims;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post('/api/admin/login', async (request, reply) => {
    try {
      const body = adminLoginSchema.parse(request.body);
      const jwt = await authService.verifyAdminLogin(body.slug, body.token);
      return { token: jwt };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(toErrorResponse(Errors.VALIDATION_ERROR(error.message)));
      }
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.post('/api/admin/events', async (request, reply) => {
    try {
      if (config.adminCreateKey) {
        const authKey = request.headers['x-admin-create-key'] as string;
        if (authKey !== config.adminCreateKey) {
          throw Errors.FORBIDDEN('Invalid admin create key');
        }
      }

      const body = createEventSchema.parse(request.body);
      const result = await eventService.createEvent({
        title: body.title,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(toErrorResponse(Errors.VALIDATION_ERROR(error.message)));
      }
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.post('/api/admin/events/:slug/next', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      await verifyAdmin(request, slug);

      const state = await eventService.advanceToNext(slug);
      return state;
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.post('/api/admin/events/:slug/announce', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      await verifyAdmin(request, slug);

      const body = announceSchema.parse(request.body);
      const announcement = await eventService.createAnnouncement(slug, body.text);
      return announcement;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(toErrorResponse(Errors.VALIDATION_ERROR(error.message)));
      }
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.put('/api/admin/events/:slug/agenda', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      await verifyAdmin(request, slug);

      const body = updateAgendaSchema.parse(request.body);
      const slots = await eventService.updateAgenda(
        slug,
        body.slots.map(s => ({
          title: s.title,
          startTime: s.startTime ? new Date(s.startTime) : undefined,
          endTime: s.endTime ? new Date(s.endTime) : undefined,
          locationId: s.locationId,
        }))
      );
      return slots;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(toErrorResponse(Errors.VALIDATION_ERROR(error.message)));
      }
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });

  app.put('/api/admin/events/:slug/locations', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      await verifyAdmin(request, slug);

      const body = updateLocationsSchema.parse(request.body);
      const locations = await eventService.updateLocations(slug, body.locations);
      return locations;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(toErrorResponse(Errors.VALIDATION_ERROR(error.message)));
      }
      if (error instanceof AppError) {
        return reply.status(error.httpStatus).send(toErrorResponse(error));
      }
      request.log.error(error);
      return reply.status(500).send(toErrorResponse(error));
    }
  });
}

import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db/prisma';
import { registerPublicRoutes } from './http/routes.public';
import { registerAdminRoutes } from './http/routes.admin';
import { createSocketServer } from './realtime/socket';

async function main() {
  const app = fastify({
    logger: {
      level: config.logLevel,
    },
  });

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await connectDatabase();
  app.log.info('Database connected');

  await registerPublicRoutes(app);
  await registerAdminRoutes(app);

  const httpServer = app.server;
  const io = createSocketServer(httpServer);
  app.log.info('Socket.IO server initialized');

  const shutdown = async () => {
    app.log.info('Shutting down...');
    io.close();
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({
    port: config.port,
    host: '0.0.0.0',
  });

  app.log.info(`Server running on http://0.0.0.0:${config.port}`);
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});

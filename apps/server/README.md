# Pop-up Event Hub - Backend

Production-ready Node.js backend for a real-time event management platform with live timeline updates, announcements, group chats, and admin-only management.

## Features

- **REST API** for initial data snapshots and admin operations
- **Socket.IO** real-time updates for event state, announcements, and chat
- **Admin Authentication** via token-based login with JWT sessions
- **SQLite Database** via Prisma (easily switchable to PostgreSQL)
- **Chat System** with rate limiting and admin-only rooms
- **Docker Support** for one-command deployment

## Tech Stack

- Node.js 20+
- TypeScript
- Fastify (HTTP)
- Socket.IO (real-time)
- Prisma ORM
- SQLite / PostgreSQL
- Zod (validation)
- JWT (admin auth)
- Argon2 (password hashing)

## Quick Start with npm

### Prerequisites

- Node.js 20+ installed
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and set your secrets:**
   ```env
   PORT=3001
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-random-secret-here"
   ADMIN_CREATE_KEY="your-admin-create-key-here"
   CORS_ORIGIN="*"
   LOG_LEVEL="info"
   ```

4. **Generate Prisma client and run migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`.

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed

### Setup

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your secrets** (same as above)

3. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

The server will be available at `http://localhost:3001`.

### Using PostgreSQL Instead of SQLite

Uncomment the `postgres` service in `docker-compose.yml` and update the `DATABASE_URL` in your `.env`:

```env
DATABASE_URL="postgresql://eventhub:eventhub@postgres:5432/eventhub"
```

Also update the `datasource` provider in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then regenerate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## API Documentation

### Public Endpoints

#### Get Event Snapshot
```bash
GET /api/events/:slug/snapshot
```

Returns the complete event snapshot including locations, agenda, current state, chat rooms, and recent announcements.

#### Health Check
```bash
GET /health
```

Returns server health status.

### Admin Endpoints

All admin endpoints (except event creation) require a `Bearer` token in the `Authorization` header.

#### Create Event
```bash
POST /api/admin/events
Headers:
  X-Admin-Create-Key: your-admin-create-key

Body:
{
  "title": "My Pop-up Event",
  "startsAt": "2026-01-15T10:00:00Z",  // optional
  "endsAt": "2026-01-15T18:00:00Z"     // optional
}

Response:
{
  "slug": "abc123xyz",
  "adminToken": "random-token-SAVE-THIS"
}
```

**Important:** Save the `adminToken` - it's shown only once!

#### Admin Login
```bash
POST /api/admin/login

Body:
{
  "slug": "abc123xyz",
  "token": "your-admin-token"
}

Response:
{
  "token": "jwt-token-here"
}
```

Use this JWT token in subsequent admin requests.

#### Advance to Next Agenda Slot
```bash
POST /api/admin/events/:slug/next
Headers:
  Authorization: Bearer your-jwt-token

Response:
{
  "currentSlotId": "slot-id-or-null",
  "updatedAt": "2026-01-10T12:00:00Z"
}
```

#### Create Announcement
```bash
POST /api/admin/events/:slug/announce
Headers:
  Authorization: Bearer your-jwt-token

Body:
{
  "text": "Welcome everyone!"
}

Response:
{
  "id": "announcement-id",
  "eventId": "event-id",
  "text": "Welcome everyone!",
  "createdAt": "2026-01-10T12:00:00Z"
}
```

#### Update Agenda
```bash
PUT /api/admin/events/:slug/agenda
Headers:
  Authorization: Bearer your-jwt-token

Body:
{
  "slots": [
    {
      "title": "Opening Session",
      "startTime": "2026-01-15T10:00:00Z",
      "endTime": "2026-01-15T11:00:00Z",
      "locationId": "location-id-optional"
    },
    {
      "title": "Workshop",
      "startTime": "2026-01-15T11:00:00Z",
      "endTime": "2026-01-15T13:00:00Z"
    }
  ]
}
```

#### Update Locations
```bash
PUT /api/admin/events/:slug/locations
Headers:
  Authorization: Bearer your-jwt-token

Body:
{
  "locations": [
    {
      "title": "Main Hall",
      "lat": 52.5200,
      "lng": 13.4050,
      "address": "123 Main St",
      "note": "Ground floor"
    },
    {
      "title": "Workshop Room"
    }
  ]
}
```

## Socket.IO Events

### Client → Server Events

#### Join Event
```javascript
socket.emit('event:join', {
  slug: 'abc123xyz',
  guestName: 'John Doe'
}, (response) => {
  // response: { success: true, guestId: 'unique-guest-id' }
});
```

Server responds with `event:snapshot` containing the full event data.

#### Join Chat Room
```javascript
socket.emit('chat:join', {
  slug: 'abc123xyz',
  roomKey: 'general'  // or 'location:location-id' or 'orga'
});
```

#### Send Chat Message
```javascript
socket.emit('chat:send', {
  slug: 'abc123xyz',
  roomKey: 'general',
  text: 'Hello everyone!'
});
```

**Rate Limit:** 5 messages per 10 seconds per guest. Admin users are exempt.

#### Admin Authentication (Socket)
```javascript
socket.emit('admin:auth', {
  token: 'your-jwt-token'
}, (response) => {
  // response: { success: true, slug: 'abc123xyz' }
});
```

#### Admin: Advance to Next
```javascript
socket.emit('admin:next', {
  slug: 'abc123xyz'
});
```

#### Admin: Create Announcement
```javascript
socket.emit('admin:announce', {
  slug: 'abc123xyz',
  text: 'Important update!'
});
```

### Server → Client Events

#### Event Snapshot
```javascript
socket.on('event:snapshot', (snapshot) => {
  // snapshot contains: event, locations, agenda, state, rooms, announcements
});
```

#### State Update
```javascript
socket.on('state:update', (state) => {
  // state: { currentSlotId: '...', updatedAt: '...' }
});
```

Broadcast to all clients in the event room when admin advances the timeline.

#### New Announcement
```javascript
socket.on('announcement:new', (data) => {
  // data: { announcement: { id, text, createdAt } }
});
```

#### New Chat Message
```javascript
socket.on('chat:new', (data) => {
  // data: { roomKey: 'general', message: { id, guestId, guestName, text, createdAt } }
});
```

#### Error
```javascript
socket.on('error', (error) => {
  // error: { code: 'ERROR_CODE', message: 'Error description' }
});
```

## Example Usage

### Creating an Event

```bash
# 1. Create event
curl -X POST http://localhost:3001/api/admin/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Create-Key: your-admin-create-key" \
  -d '{
    "title": "Community Meetup 2026"
  }'

# Response:
# {
#   "slug": "abc123xyz",
#   "adminToken": "XyZ...random...token"
# }

# 2. Login as admin
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "abc123xyz",
    "token": "XyZ...random...token"
  }'

# Response:
# {
#   "token": "eyJhbGc..."
# }

# 3. Add locations
curl -X PUT http://localhost:3001/api/admin/events/abc123xyz/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "locations": [
      {
        "title": "Main Stage",
        "lat": 52.5200,
        "lng": 13.4050
      }
    ]
  }'

# 4. Add agenda
curl -X PUT http://localhost:3001/api/admin/events/abc123xyz/agenda \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "slots": [
      {
        "title": "Registration",
        "startTime": "2026-01-15T09:00:00Z",
        "endTime": "2026-01-15T10:00:00Z"
      },
      {
        "title": "Keynote",
        "startTime": "2026-01-15T10:00:00Z",
        "endTime": "2026-01-15T11:00:00Z"
      }
    ]
  }'

# 5. Advance to next slot
curl -X POST http://localhost:3001/api/admin/events/abc123xyz/next \
  -H "Authorization: Bearer eyJhbGc..."

# 6. Create announcement
curl -X POST http://localhost:3001/api/admin/events/abc123xyz/announce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "text": "Welcome to our event!"
  }'
```

## Security

- **Admin tokens** are hashed with Argon2 before storage
- **JWT tokens** expire after 12 hours
- **Event creation** requires `ADMIN_CREATE_KEY` to prevent abuse
- **Chat messages** are rate-limited (5 per 10 seconds)
- **Input validation** via Zod on all endpoints
- **Admin-only rooms** enforce authentication

## Architecture

The codebase follows clean architecture principles:

```
src/
├── index.ts              # Server bootstrap
├── config.ts             # Environment configuration
├── db/                   # Database connection
│   └── prisma.ts
├── http/                 # HTTP transport layer
│   ├── routes.public.ts
│   ├── routes.admin.ts
│   └── schemas.ts
├── realtime/             # Socket.IO transport layer
│   ├── socket.ts
│   └── events.ts
├── domain/               # Business logic
│   ├── event.service.ts
│   ├── chat.service.ts
│   └── auth.service.ts
└── utils/                # Shared utilities
    ├── crypto.ts
    ├── errors.ts
    └── rateLimit.ts
```

## Production Deployment

1. Set strong secrets for `JWT_SECRET` and `ADMIN_CREATE_KEY`
2. Use PostgreSQL instead of SQLite for better concurrency
3. Set `CORS_ORIGIN` to your frontend domain
4. Configure proper logging (`LOG_LEVEL=info`)
5. Use a reverse proxy (nginx, Caddy) for HTTPS
6. Consider rate limiting at the HTTP layer
7. Regular database backups

## Future Enhancements (Optional)

- Message history pagination
- Guest presence tracking
- Private direct messages
- File/image uploads for announcements
- Event archiving and TTL
- Multi-language support
- Push notifications
- Analytics and metrics

## License

MIT

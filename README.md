# Pop-up Event Hub

Open-source platform for managing pop-up events with real-time timeline updates, announcements, group chats, and interactive maps.

## Overview

Pop-up Event Hub is a complete event management solution consisting of:

- **Backend** (`apps/server/`) - Node.js + Fastify + Socket.IO + Prisma + SQLite
- **Frontend** (`apps/web/`) - React + Vite + TypeScript + Zustand + React Leaflet

Perfect for:
- Community meetups and pop-up events
- Conferences and workshops
- Festival schedules
- Real-time event coordination

## Features

### For Participants
- 📅 **Live Timeline** - See current and upcoming agenda items in real-time
- 📢 **Announcements** - Receive instant event updates
- 💬 **Group Chat** - Communicate in multiple rooms (general, location-based)
- 🗺️ **Interactive Map** - Find event locations with navigation support
- 📍 **Your Location** - Opt-in to show your position on the map

### For Organizers (Admin)
- 🎛️ **Timeline Control** - Advance the event schedule with one click
- 📣 **Broadcast Messages** - Send announcements to all participants
- ✏️ **Agenda Editor** - Add, edit, reorder agenda items on the fly
- 📌 **Location Manager** - Manage event locations with coordinates and details
- 🔒 **Admin Chat** - Private communication channel for organizers
- 🔐 **Secure Access** - Token-based authentication with JWT sessions

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### 1. Backend Setup

```bash
cd apps/server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set JWT_SECRET and ADMIN_CREATE_KEY

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start server
npm run dev
```

Backend runs on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3001

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. Create Your First Event

```bash
# Create an event (replace YOUR_KEY with your ADMIN_CREATE_KEY)
curl -X POST http://localhost:3001/api/admin/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Create-Key: YOUR_KEY" \
  -d '{
    "title": "My First Event"
  }'

# Response includes:
# {
#   "slug": "abc123xyz",
#   "adminToken": "SAVE_THIS_TOKEN"
# }
```

### 4. Join the Event

1. Open `http://localhost:3000`
2. Enter the event **slug** and your name
3. Click "Join Event"

### 5. Admin Access

1. Click "Admin Login" on the landing page or navigate to `/e/{slug}/admin`
2. Enter the **adminToken** from step 3
3. Start managing your event!

## Docker Deployment

### Using Docker Compose

```bash
# Backend only
cd apps/server
docker-compose up --build

# For both backend and frontend, create a docker-compose.yml at root
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │   Landing    │  Event Page  │  Admin Page  │    │
│  │   Route      │   (Public)   │   (Secure)   │    │
│  └──────────────┴──────────────┴──────────────┘    │
│         │                 │              │          │
│    ┌────┴─────┬───────────┴──────┬──────┴────┐    │
│    │  Zustand │  Socket.IO       │  REST API │    │
│    │  Store   │  Client          │  Client   │    │
│    └──────────┴──────────────────┴───────────┘    │
└────────────────────┬───────────────────────────────┘
                     │ WebSocket + HTTP
┌────────────────────┴───────────────────────────────┐
│              Backend (Node.js/Fastify)              │
│  ┌──────────────┬──────────────┬──────────────┐   │
│  │  HTTP Routes │  Socket.IO   │   Prisma     │   │
│  │  (REST API)  │   Handlers   │     ORM      │   │
│  └──────────────┴──────────────┴──────────────┘   │
│         │                 │              │         │
│    ┌────┴─────────────────┴──────────────┴────┐   │
│    │         Domain Services Layer           │   │
│    │  (Event, Chat, Auth)                    │   │
│    └─────────────────────────────────────────┘   │
│                      │                            │
│              ┌───────┴────────┐                   │
│              │  SQLite/Postgres │                 │
│              │    Database      │                 │
│              └──────────────────┘                 │
└───────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify (HTTP server)
- **Real-time**: Socket.IO
- **Database**: SQLite (default) / PostgreSQL (production)
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT + Argon2
- **Language**: TypeScript

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State**: Zustand
- **Router**: React Router
- **Real-time**: Socket.IO Client
- **Maps**: Leaflet + React Leaflet
- **Validation**: Zod
- **Language**: TypeScript

## API Documentation

See individual README files:
- Backend API: [`apps/server/README.md`](apps/server/README.md)
- Frontend Guide: [`apps/web/README.md`](apps/web/README.md)

## Security

- Admin tokens are hashed with Argon2 before storage
- JWT tokens expire after 12 hours
- Event creation protected by server-wide admin key
- Chat rate limiting (5 messages/10 seconds)
- Input validation on all endpoints
- CORS configuration for production

## Production Deployment

### Backend
1. Use PostgreSQL instead of SQLite
2. Set strong `JWT_SECRET` and `ADMIN_CREATE_KEY`
3. Configure `CORS_ORIGIN` to match frontend domain
4. Use reverse proxy (nginx/Caddy) for HTTPS
5. Enable proper logging
6. Set up database backups

### Frontend
1. Build: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Set `VITE_API_URL` to production backend
4. Configure SPA routing on server
5. Enable HTTPS

### Recommended Hosting
- **Backend**: Railway, Render, Fly.io, DigitalOcean, AWS
- **Frontend**: Netlify, Vercel, Cloudflare Pages, GitHub Pages
- **Database**: Managed PostgreSQL (Railway, Supabase, Neon)

## Development

### Project Structure
```
eventPlaner/
├── apps/
│   ├── server/          # Backend
│   │   ├── src/
│   │   ├── prisma/
│   │   └── package.json
│   └── web/             # Frontend
│       ├── src/
│       └── package.json
└── README.md
```

### Running Both Services

**Terminal 1 (Backend):**
```bash
cd apps/server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd apps/web
npm run dev
```

### Database Migrations

```bash
cd apps/server

# Create migration
npm run prisma:migrate

# View database
npm run prisma:studio
```

## Contributing

This is an open-source project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Roadmap

Potential future features:
- [ ] Message history pagination
- [ ] Guest presence tracking
- [ ] Private direct messages
- [ ] File/image uploads
- [ ] Event templates
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Event analytics
- [ ] QR code check-in
- [ ] Polls and voting

## License

MIT

## Support

For issues and questions:
- Check the README files in `apps/server/` and `apps/web/`
- Review the code and inline documentation
- Open an issue on GitHub

## Credits

Built with modern open-source technologies:
- [Fastify](https://www.fastify.io/)
- [Socket.IO](https://socket.io/)
- [Prisma](https://www.prisma.io/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Leaflet](https://leafletjs.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)

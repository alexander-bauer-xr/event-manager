# Pop-up Event Hub - Frontend

Production-ready React frontend for the Pop-up Event Hub, providing real-time event management with live timeline updates, announcements, group chats, and interactive maps.

## Features

- **Real-time Event Page** with live timeline (Now/Next), announcements, and chat
- **Interactive Map** using OpenStreetMap/Leaflet with location markers and user location
- **Group Chat** with multiple rooms (general, location-based, admin-only)
- **Admin Dashboard** for event management (timeline control, announcements, agenda/location editing)
- **Socket.IO Integration** for real-time updates
- **Responsive Design** mobile-first with clean, minimal UI
- **Type-safe** with TypeScript and Zod validation

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication
- **React Leaflet** - Interactive maps
- **Zod** - Runtime validation

## Project Structure

```
apps/web/
├── src/
│   ├── main.tsx              # Entry point
│   ├── app.tsx               # Router setup
│   ├── types.ts              # TypeScript types
│   ├── validators.ts         # Zod schemas
│   ├── styles.css            # Global styles
│   ├── api/
│   │   ├── http.ts           # REST API client
│   │   └── socket.ts         # Socket.IO client
│   ├── store/
│   │   └── useStore.ts       # Zustand store
│   ├── routes/
│   │   ├── landing.tsx       # Landing page
│   │   ├── event.tsx         # Public event page
│   │   └── admin.tsx         # Admin dashboard
│   └── components/
│       ├── NowNextBanner.tsx
│       ├── AgendaList.tsx
│       ├── AnnouncementsPanel.tsx
│       ├── ChatPanel.tsx
│       ├── MapPanel.tsx
│       └── admin/
│           ├── AdminLoginForm.tsx
│           ├── AdminControls.tsx
│           ├── AgendaEditor.tsx
│           └── LocationsEditor.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## Quick Start

### Prerequisites

- Node.js 20+ installed
- Backend server running (see `apps/server/README.md`)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment:**
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Serve them with any static file server:

```bash
npm run preview
```

## Usage Guide

### Joining an Event

1. Navigate to the landing page (`/`)
2. Enter the **Event Code** (slug) provided by the event organizer
3. Enter your **Name** to identify yourself in chats
4. Click **Join Event**

Your guest name is saved locally per event, so you won't need to re-enter it.

### Event Page Features

The event page has four main sections accessible via tabs:

#### 1. Timeline
- Shows the **Now/Next** banner with current and upcoming agenda items
- Full agenda list with time, location, and current item highlighting
- Updates in real-time when admin advances the timeline

#### 2. Announcements
- Displays all event announcements in reverse chronological order
- Shows relative timestamps (e.g., "5m ago")
- Updates in real-time when new announcements are posted

#### 3. Chat
- Multiple chat rooms:
  - **General** - Open to all participants
  - **Location rooms** - One per event location
  - **Orga/Admin** - Admin-only room (if logged in as admin)
- Rate-limited to 5 messages per 10 seconds
- Real-time message delivery
- Shows sender name and timestamp

#### 4. Map
- Interactive OpenStreetMap showing all event locations
- Click markers to see location details and get directions
- **Locate Me** button to show your current position (requires permission)
- User location shown with a special marker

### Admin Dashboard

Access the admin dashboard at `/e/:slug/admin`.

#### Login
1. Enter your **Admin Token** (provided when event was created)
2. JWT is stored locally for the session

#### Admin Features

**Controls Tab:**
- **Advance to Next** - Move timeline to the next agenda item
- **Post Announcement** - Broadcast a message to all participants

**Agenda Tab:**
- Add, edit, remove, and reorder agenda items
- Set title, start/end times, and location for each item
- Changes are saved to the server and update all clients

**Locations Tab:**
- Add, edit, and remove event locations
- Set coordinates (lat/lng), address, and notes
- Locations appear on the map and can be assigned to agenda items

**Admin Chat Tab:**
- Access to all chat rooms including admin-only rooms
- Same chat interface as public event page

## API Integration

The frontend connects to the backend via:

### REST API
- `GET /api/events/:slug/snapshot` - Initial event data
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/events/:slug/next` - Advance timeline
- `POST /api/admin/events/:slug/announce` - Create announcement
- `PUT /api/admin/events/:slug/agenda` - Update agenda
- `PUT /api/admin/events/:slug/locations` - Update locations

### Socket.IO Events

**Client → Server:**
- `event:join` - Join event and get snapshot
- `chat:join` - Join chat room
- `chat:send` - Send chat message
- `admin:auth` - Authenticate as admin via socket
- `admin:next` - Advance timeline (admin)
- `admin:announce` - Create announcement (admin)

**Server → Client:**
- `event:snapshot` - Full event data
- `state:update` - Timeline state changed
- `announcement:new` - New announcement posted
- `chat:new` - New chat message
- `error` - Error occurred

## State Management

The app uses **Zustand** for state management with the following store structure:

```typescript
{
  connected: boolean;           // Socket connection status
  loading: boolean;             // Loading state
  error: string | null;         // Error message
  event: EventDTO | null;       // Event details
  locations: LocationDTO[];     // Event locations
  agenda: AgendaSlotDTO[];      // Agenda items
  state: EventStateDTO | null;  // Current timeline state
  rooms: ChatRoomDTO[];         // Available chat rooms
  announcements: AnnouncementDTO[]; // Announcements
  chat: {
    currentRoomKey: string;
    messagesByRoom: Record<string, ChatMessageDTO[]>;
  };
  guestName: string;            // User's display name
  guestId: string;              // Unique guest ID
  isAdmin: boolean;             // Admin status
  jwt: string | null;           // Admin JWT token
}
```

## Local Storage

The app stores the following in localStorage:

- `guestName_{slug}` - Guest name per event
- `guestId_{slug}` - Guest ID per event
- `adminJwt_{slug}` - Admin JWT per event (persists session)

## Responsive Design

The app is mobile-first and fully responsive:

- **Desktop**: Multi-column layouts, full-width components
- **Tablet**: Adjusted spacing and column layouts
- **Mobile**: Single-column layout, optimized touch targets

## Browser Support

- Modern browsers with ES2020+ support
- WebSocket support required for real-time features
- Geolocation API for "Locate Me" feature (optional)

## Development Tips

### Hot Module Replacement
Vite provides fast HMR during development. Changes to components update instantly without full page reload.

### TypeScript Strict Mode
The project uses strict TypeScript settings. All types are enforced at compile time and validated at runtime with Zod.

### Adding New Features

1. **New component:** Create in `src/components/` and import where needed
2. **New route:** Add to `src/app.tsx` router
3. **New API call:** Add to `src/api/http.ts` or `src/api/socket.ts`
4. **New state:** Update `src/store/useStore.ts`
5. **New type:** Add to `src/types.ts` and corresponding Zod schema to `src/validators.ts`

## Deployment

### Static Hosting

Build the app and deploy the `dist/` folder to any static hosting service:

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect repo and set build command to `npm run build`
- **GitHub Pages**: Use GitHub Actions to build and deploy
- **AWS S3 + CloudFront**: Upload `dist/` to S3 bucket
- **nginx**: Serve `dist/` folder with proper SPA routing

### Environment Variables

Set `VITE_API_URL` to your production backend URL before building.

### SPA Routing

Ensure your hosting serves `index.html` for all routes. Example nginx config:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

### Connection Issues
- Verify `VITE_API_URL` points to the correct backend
- Check CORS settings on the backend
- Ensure backend is running and accessible

### Map Not Loading
- Check browser console for Leaflet errors
- Verify internet connection (tiles load from OpenStreetMap)
- Ensure locations have valid lat/lng coordinates

### Chat Rate Limiting
- Users are limited to 5 messages per 10 seconds
- Admin users are exempt from rate limiting
- Rate limit errors show in the chat panel

### Admin Login Issues
- Verify admin token is correct
- Check that backend admin token hash matches
- Clear localStorage and try again: `localStorage.clear()`

## License

MIT

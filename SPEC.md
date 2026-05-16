# WizardStaff - Fantasy Football Draft Application

## Project Overview

**Project Name:** WizardStaff
**Type:** Full-stack Fantasy Football Draft Application
**Core Functionality:** A complete fantasy football platform enabling users to create/join leagues, draft players in live snake-draft sessions, manage rosters, and compete against other managers.
**Target Users:** Fantasy football enthusiasts, football fans, casual and competitive league managers

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (production) / SQLite (development)
- **Authentication:** JWT-based with bcrypt
- **Real-time:** Socket.io for live draft updates

---

## Data Models

### User
```typescript
{
  id: string (UUID)
  username: string (unique)
  email: string (unique)
  passwordHash: string
  displayName: string
  avatarUrl?: string
  createdAt: timestamp
}
```

### League
```typescript
{
  id: string (UUID)
  name: string
  commissionerId: string (FK → User)
  maxTeams: number (default: 10)
  draftStatus: 'pending' | 'in_progress' | 'completed'
  draftDate?: timestamp
  settings: LeagueSettings
  createdAt: timestamp
}
```

### LeagueSettings
```typescript
{
  scoringFormat: 'standard' | 'ppr' | 'half-ppr'
  rosterPositions: RosterPosition[]
  tradeDeadline: string (date)
  playoffTeams: number (default: 6)
  waiverType: 'fb' | 'faab' | 'rolling'
}
```

### Team
```typescript
{
  id: string (UUID)
  leagueId: string (FK → League)
  managerId: string (FK → User)
  name: string
  roster: Player[]
  bench: Player[]
  injuredReserve: Player[]
  createdAt: timestamp
}
```

### Player (NFL)
```typescript
{
  id: string (NFL player ID)
  name: string
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DST'
  team: string (NFL team)
  status: 'active' | 'injured' | 'out'
  projectedPoints: number
  adp: number (Average Draft Position)
  createdAt: timestamp
}
```

### Draft
```typescript
{
  id: string (UUID)
  leagueId: string (FK → League)
  status: 'scheduled' | 'active' | 'paused' | 'completed'
  currentPick: number
  currentRound: number
  currentManagerId: string (FK → User)
  draftOrder: string[] (team IDs)
  startedAt?: timestamp
  completedAt?: timestamp
}
```

### DraftPick
```typescript
{
  id: string (UUID)
  draftId: string (FK → Draft)
  round: number
  pick: number
  teamId: string (FK → Team)
  playerId: string (FK → Player)
  selectedAt: timestamp
}
```

---

## Core Features

### 1. Authentication
- User registration with email/password
- Login with JWT tokens
- Profile management

### 2. League Management
- Create new league (commissioner controls settings)
- Join league via invite code
- View league details and settings
- League chat/announcements

### 3. Draft Room
- Live snake draft with timer per pick (60-120 seconds)
- Real-time draft board showing all picks
- Available players list with filters (position, team, rank)
- Draft history per team
- Pause/resume draft (commissioner only)

### 4. Roster Management
- View team roster
- Set starting lineup
- Move players to/from bench
- Move players to IR (if eligible)
- View opponent's roster (after draft)

### 5. Dashboard
- League standings
- Weekly scores
- Player statistics
- Recent transactions

### 6. Transactions
- Waiver claims (FAAB or FAB system)
- Trade proposals between teams
- Trade acceptance/rejection

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Leagues
- `POST /api/leagues` - Create league
- `GET /api/leagues` - List user's leagues
- `GET /api/leagues/:id` - Get league details
- `POST /api/leagues/:id/join` - Join league
- `PUT /api/leagues/:id` - Update league settings

### Draft
- `POST /api/leagues/:id/draft/start` - Start draft
- `POST /api/draft/:id/pick` - Make pick
- `GET /api/draft/:id/board` - Get draft board

### Teams
- `GET /api/teams/:id` - Get team roster
- `PUT /api/teams/:id/roster` - Update roster

### Players
- `GET /api/players` - List available players
- `GET /api/players/:id` - Get player details

---

## Project Structure

```
WizardStaff/
├── docs/
│   ├── SPEC.md
│   └── API.md
├── packages/
│   ├── server/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── socket/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── types/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── vite.config.ts
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (or use Docker)

### Setup
```bash
# Install dependencies
cd packages/server && npm install
cd ../client && npm install

# Start database (Docker)
docker-compose up -d

# Run server
cd packages/server && npm run dev

# Run client
cd packages/client && npm run dev
```

---

## To Be Implemented

- [ ] Project scaffolding
- [ ] Database schema & migrations
- [ ] User authentication
- [ ] League CRUD
- [ ] Draft room with Socket.io
- [ ] Player pool data
- [ ] Team roster management
- [ ] Dashboard & standings
- [ ] Waiver/FAAB system
- [ ] Trading system
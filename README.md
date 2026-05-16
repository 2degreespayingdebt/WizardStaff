# 🪄 WizardStaff

A fantasy football draft application for creating and managing fantasy football leagues.

## Features

- **League Management**: Create private leagues with custom settings
- **Live Draft Room**: Real-time snake draft with timer
- **Roster Management**: View and manage your team roster
- **Player Pool**: Complete NFL player data with projections
- **Waivers & Trades**: Add FAAB/waiver system and trading between teams

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Real-time**: Socket.io

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or use Docker)

### Local Development

```bash
# Install dependencies
cd packages/server && npm install
cd ../client && npm install

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run database migrations
cd packages/server && npm run db:migrate

# Start the server
npm run dev

# In another terminal, start the client
cd packages/client && npm run dev
```

### Docker Development

```bash
docker-compose up --build
```

This starts all services:
- Client: http://localhost:5173
- Server: http://localhost:3001

## Project Structure

```
WizardStaff/
├── docs/              # Documentation
├── packages/
│   ├── server/       # Express API server
│   │   ├── src/
│   │   │   ├── config/     # Database config
│   │   │   ├── controllers/
│   │   │   ├── middleware/ # Auth middleware
│   │   │   ├── models/     # Database models
│   │   │   ├── routes/    # API routes
│   │   │   └── index.ts    # Entry point
│   │   └── package.json
│   └── client/       # Vite + React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/     # Custom React hooks
│       │   ├── pages/     # Page components
│       │   ├── services/  # API & Socket services
│       │   └── types/     # TypeScript types
│       └── package.json
└── docker-compose.yml
```

## API Documentation

See [API.md](docs/API.md) for detailed API documentation.

## License

MIT
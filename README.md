# Quantum AI — Backend

Express + TypeScript API with Groq AI, MongoDB, document parsing, and PowerPoint generation.

**Port:** `5001`  
**Base URL:** `http://localhost:5001/api/v1`

## Setup

```powershell
cd backend
copy .env.example .env
npm install
```

Edit `.env`:
- `GROQ_API_KEY` — from [Groq Console](https://console.groq.com/docs/overview)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — at least 16 characters

## Run

```powershell
npm run dev      # development (hot reload)
npm run build    # compile TypeScript
npm start        # production
```

## API docs

See [docs/API.md](./docs/API.md)

## Community

- [Contributing](docs/CONTRIBUTING.md)
- [Code of Conduct](docs/CODE_OF_CONDUCT.md)
- [Security Policy](docs/SECURITY.md)
- [Support](docs/SUPPORT.md)
- [License (MIT)](LICENSE)
- [Docs index](docs/README.md)

## Structure

```
backend/
├── src/
│   ├── config/       # env, logger, database
│   ├── controllers/  # HTTP handlers
│   ├── middleware/   # auth, upload, rate limits
│   ├── models/       # Mongoose schemas
│   ├── providers/ai/ # Groq (swappable)
│   ├── routes/       # REST routes
│   ├── services/     # business logic
│   ├── utils/
│   └── validators/
├── docs/
├── uploads/          # uploaded files (auto-created)
└── .env
```

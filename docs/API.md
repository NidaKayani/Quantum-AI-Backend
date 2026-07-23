## Next-level endpoints

All endpoints below require a Quantum AI bearer JWT (or a legacy QuantumChat-compatible JWT)
when `AUTH_REQUIRED=true`.

- `GET /api/v1/conversations?q=&archived=&limit=&cursor=` — cursor-paginated conversations
- `PATCH /api/v1/conversations/:id` — rename, pin, or archive
- `POST /api/v1/conversations/:id/messages/delete-last` — regeneration support
- `DELETE /api/v1/conversations/:id/messages/from/:messageId` — edit/retry support
- `POST /api/v1/documents/:id/quiz` — generate a structured four-option quiz
- `POST /api/v1/presentations/:id/plan` — preview a structured slide plan

`POST /api/v1/ai/chat` also accepts:

- `explicitContext: string[]` — context explicitly approved in the QuantumChat privacy preview
- `sourceLink: { quantumChatPeerId?: string, groupId?: string }` — metadata-only link to the calling surface

When a group link is supplied, the final stream event includes a signed
`contentHash`, `requestId`, and `receipt`. QuantumChat verifies that receipt
before publishing a message as the reserved QuantumAI system user.
# Quantum AI Assistant API

Production-ready REST API for **Quantum AI** — Groq-powered chat, document analysis, PDF conversion, and PowerPoint generation. Designed as a standalone service for later integration into Quantum Chat.

**Base URL:** `http://localhost:5001/api/v1`  
**Run from:** `backend/` folder (`npm run dev`)  
**Default port:** `5001` (Quantum Chat backend uses `5000`)

## Authentication

Quantum AI has **its own** Sign up / Sign in (`POST /auth/register`, `POST /auth/login`).
Accounts are stored in the AI database (`AiUser`) and are separate from QuantumChat messenger accounts.

| Mode | Behavior |
|------|----------|
| `AUTH_REQUIRED=false` (dev) | Send `X-User-Id: your-user-id` or defaults to `dev-user` |
| `AUTH_REQUIRED=true` (prod) | `Authorization: Bearer <JWT>` issued by Quantum AI (`iss=quantum-ai`) |

Legacy QuantumChat JWTs signed with the same `JWT_SECRET` (missing/`quantum-chat` issuer) are still accepted for compatibility.

### Auth endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create Quantum AI account `{ email, password, displayName? }` |
| POST | `/auth/login` | Sign in `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Current user profile (Bearer required) |

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness (includes MongoDB status) |

## AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Send a message (optionally stream) |
| GET | `/ai/models` | List available Groq models |

### POST `/ai/chat`

```json
{
  "message": "Explain photosynthesis simply",
  "conversationId": "optional-mongo-id",
  "documentIds": ["optional-doc-id"],
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "stream": false
}
```

**Non-stream response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "...",
    "message": "...",
    "model": "llama-3.3-70b-versatile",
    "usage": { "promptTokens": 100, "completionTokens": 50, "totalTokens": 150 }
  }
}
```

**Streaming (`stream: true`):** Server-Sent Events (`text/event-stream`)

| Event | Payload |
|-------|---------|
| `start` | `{ "conversationId": "..." }` |
| `chunk` | `{ "content": "partial text" }` |
| `done` | `{ "conversationId", "messageId", "content", "model" }` |
| `error` | `{ "message": "..." }` |

## Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations` | Create conversation |
| GET | `/conversations` | List user conversations |
| GET | `/conversations/:id` | Get conversation + messages |
| PATCH | `/conversations/:id` | Update title |
| DELETE | `/conversations/:id` | Delete conversation and messages |

## Documents

Supported uploads: PDF, DOCX, TXT, Markdown, CSV, XLSX, JSON, images (JPEG, PNG, GIF, WebP).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/upload` | Upload files (`multipart/form-data`, field: `files`) |
| GET | `/documents` | List documents |
| GET | `/documents/:id` | Get document metadata |
| GET | `/documents/:id/text` | Get extracted text |
| POST | `/documents/:id/ask` | Ask a question about document content |
| POST | `/documents/:id/summarize` | AI summary of document |
| POST | `/documents/:id/convert/txt` | Convert to plain text (JSON body) |
| POST | `/documents/:id/convert/markdown` | Convert to Markdown (JSON body) |
| GET | `/documents/:id/download/txt` | Download as `.txt` file |
| GET | `/documents/:id/download/markdown` | Download as `.md` file |

### POST `/documents/:id/ask`

```json
{
  "question": "What are the main topics in this PDF?"
}
```

## Presentations

Generate student-friendly PowerPoint decks from uploaded PDFs (title, objectives, content, examples, diagrams, summary, SLO questions).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/presentations/:documentId/plan` | Generate slide plan (JSON only) |
| POST | `/presentations/:documentId/generate` | Generate PPTX (metadata or download) |
| POST | `/presentations/:documentId/download` | Download PPTX file |

### Request body (optional)

```json
{
  "subject": "Biology",
  "gradeLevel": "Grade 10",
  "sloTopics": ["Cell structure", "Photosynthesis"]
}
```

Add `?download=true` to `/generate` for direct file download.

## Error format

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate limits

- Global: `RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS` (default 100 / 15 min)
- AI endpoints: `AI_RATE_LIMIT_MAX` (default 30 / 15 min)

## Environment

Copy `.env.example` to `.env` and set:

- `GROQ_API_KEY` — from [Groq Console](https://console.groq.com/docs/overview)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — shared with Quantum Chat when integrating auth

## Architecture

```
src/
├── config/       # Env, logger, database
├── controllers/  # HTTP handlers
├── middleware/   # Auth, upload, rate limit, errors
├── models/       # Mongoose schemas
├── providers/ai/ # Groq provider (swappable)
├── routes/       # REST routes
├── services/     # Business logic
├── utils/        # Errors, helpers, file types
└── validators/   # Zod schemas
```

Provider abstraction: replace Groq by implementing `IAiProvider` and updating `getAiProvider()` in `src/providers/ai/index.ts`.

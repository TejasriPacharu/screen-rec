# 🎬 Screen Recorder

Record your screen, trim it, share it — with an AI pipeline that never loses your work.

---

## What it does

- **Record** your screen + microphone in the browser
- **Trim** the recording client-side before uploading
- **AI pipeline** auto-generates a title, summary, chapters, and key takeaways
- **Share** via public or private links
- **Fallback safety net** — if the cloud upload fails, your recording is saved to Google Drive and you get a Telegram notification instantly

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, FFmpeg.wasm |
| Backend | Express.js, TypeScript, MongoDB, BullMQ |
| Auth | Google OAuth 2.0 (via Passport.js) |
| AI |  Eleven Labs Scribe Model (transcription) + Groq Llama 3.3 70b (metadata) |
| Storage | Backblaze B2 (S3-compatible) |
| Queue | BullMQ + Upstash Redis |
| Automation | n8n (self-hosted) |
| Notifications | Telegram Bot API |

---

## Features

### Core
- Screen + microphone recording via MediaRecorder API (up to 3 minutes)
- Client-side video trimming with FFmpeg.wasm
- Rename, delete, and toggle public/private on recordings
- Search recordings with `⌘K`
- Copy shareable links

### AI Pipeline
Every recording goes through a 3-stage pipeline after upload:

```
Audio → Eleven Labs Scribe → transcript
Transcript → Groq Llama 3.3 70b → title, summary, chapters, key takeaways
File → Backblaze B2 → permanent URL
```

### Fallback System
If anything in the pipeline fails (transcription, AI, or S3 upload), n8n kicks in automatically:

```
Pipeline failure
  → n8n webhook triggered
  → File downloaded from temp storage
  → Uploaded to your Google Drive
  → Telegram message sent to you with the file name
  → DB status updated to UPLOADED_TO_DRIVE
```

Nothing gets lost.

### Auth
- Google OAuth — one-click sign in, no passwords
- JWT issued after OAuth callback
- Protected routes and recordings

### Telegram Notifications
On first login, users connect their Telegram account for failure alerts. Setup takes 30 seconds:
1. Message `@userinfobot` on Telegram → get your Chat ID
2. Start `@screenrec_alerts_bot`
3. Paste your Chat ID in the app

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- Backblaze B2 bucket
- Groq API key (free tier)
- Google Cloud project (OAuth + Drive API enabled)
- n8n (self-hosted)
- ngrok (to expose local n8n to Render)

### Backend `.env`

```env
MONGO_CONN_STR=
JWT_SECRET=
PORT=8989

# Storage
S3_ENDPOINT=
S3_KEY_ID=
S3_APP_KEY=
S3_BUCKET=
S3_REGION=

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.onrender.com

# AI
GROQ_API_KEY=

# Automation
N8N_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.dev/webhook/s3-fallback
INTERNAL_SECRET=

# Redis (Upstash)
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_URL=https://your-frontend.onrender.com
```

### Run locally

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback, issues JWT |
| GET | `/auth/me` | Get current user |

### Recordings
| Method | Path | Description |
|---|---|---|
| GET | `/recordings` | List user's recordings |
| POST | `/recordings/process` | Upload + queue AI pipeline |
| GET | `/recordings/:link` | Get recording by share link |
| PATCH | `/recordings/:id` | Update title, visibility |
| DELETE | `/recordings/:id` | Delete recording |
| GET | `/recordings/:id/temp-file` | Internal — n8n downloads file (requires `x-internal-secret`) |
| PATCH | `/recordings/:id/drive-status` | Internal — n8n updates DB after Drive upload |
| POST | `/recordings/telegram/register` | Save user's Telegram Chat ID |

---

## n8n Workflow

The fallback automation runs as an n8n workflow triggered by a webhook:

```
Webhook (POST /webhook/s3-fallback)
  → HTTP Request (download temp file from backend)
  → Google Drive (upload file)
  → Telegram (send notification)
  → HTTP Request (update recording status in DB)
```

Deploy n8n locally and expose it via ngrok, or host it on Railway/Render for a permanent URL.

---

## Repo

[github.com/TejasriPacharu/screen-rec](https://github.com/TejasriPacharu/screen-rec)
# anonSend 🕊

**Anonymous messaging, self-hosted.** Create an account, get your personal link,
and receive honest messages from anyone — senders stay 100% anonymous.

Built with **Next.js 15 (App Router) · NextAuth · MongoDB · Tailwind · Zod**.
Ships as a Docker image with MongoDB wired into the same network, so you can
have the whole site running with one command.

```
                                  your anonSend inbox
  friend ── anon message ──▶  /u/yourname  ──▶  dashboard 📥
          (no login, no name)        (only you can read it)
```

## Features

- 🔒 **Anonymous inbox** — anyone with your `/u/username` link sends you messages; they never see each other's identities.
- ✉️ **Email-verified accounts** — signup requires a 6-digit OTP (expires in 15 min).
- 🔑 **Credentials auth** — sign in with email *or* username (NextAuth v4, JWT sessions).
- 📥 **Private dashboard** — read messages, refresh live (15s polling), copy your personal link.
- 🔕 **Pause your inbox** — reject new anonymous messages with one toggle.
- 🐳 **One-command deployment** — `docker compose up` boots the app **and** the MongoDB container on a shared network.

## Quick start (Docker)

```bash
docker compose up
```

That's it. Then:

1. Copy `.env.example` to `.env` and set `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`) and your mail provider (below).
2. Create an account at **http://localhost:3000**
3. If your verification email doesn't hit a real inbox, run with the built-in
   dev mailbox and read the OTP there:

```bash
docker compose --profile maildev up
# add to .env:   SMTP_HOST=mailpit   SMTP_PORT=1025
# then open http://localhost:8025 to see the email + code
```

### Prefer to run only the image?

The published image does not bundle MongoDB — point it at any Mongo (the
compose file creates one for you, that's what the recommendation is for).

```bash
docker network create anonsend-net
docker run -d --name anonsend-mongo --network anonsend-net \
  -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=secret \
  -v anonsend-data:/data/db mongo:7

docker run -d --name anonsend --network anonsend-net -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e MONGODB_URI='mongodb://admin:secret@anonsend-mongo:27017' \
  -e MONGODB_DB=main \
  -e SMTP_HOST=mailpit -e SMTP_PORT=1025 \
  matthew552/anonsend:latest
```

> `MONGODB_URI` and `SMTP_HOST` use the **container-relative hostnames** that
> sit on the same Docker network — any app outside the network (like Atlas)
> should use your normal connection string.

## Configuration

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Public base URL, no trailing slash |
| `NEXTAUTH_SECRET` | ✅ | — | `openssl rand -base64 32` |
| `MONGODB_URI` | ✅ | `mongodb://admin:changeme@mongo:27017` | Standard Mongo connection string; Atlas SRV strings work too |
| `MONGODB_DB` | – | `main` | Database name |
| `MONGO_USER` / `MONGO_PASSWORD` | – | `admin` / `changeme` | Credentials the compose file gives the mongo container |
| `RESEND_API_KEY` | – | — | Enable Resend as the OTP sender |
| `MAIL_FROM` | – | `AnonSend <onboarding@resend.dev>` | Sender address |
| `SMTP_HOST` / `SMTP_PORT` | – | — / `587` | Generic SMTP when Resend isn't configured |
| `SMTP_USER` / `SMTP_PASS` | – | — | SMTP credentials |
| `SMTP_SECURE` | – | `false` | `true` only for direct TLS (port 465) |
| `APP_PORT` | – | `3000` | Host port for the app in compose |

Email provider priority: **Resend if `RESEND_API_KEY` is set, otherwise SMTP.**

## Local development

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:3000
```

The app expects a reachable MongoDB — compose one up:

```bash
docker compose up mongo   # just the DB container, on anonsend-net
```

Mongoose connects lazily on first request; set `MONGODB_URI` accordingly.

## Project structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-up/     ✉  account creation (posts to /api/sign-up)
│   │   ├── sign-in/     🔑 credentials sign-in
│   │   └── verify/      ✅ OTP verification
│   ├── api/
│   │   ├── auth/[...nextauth]/   NextAuth handlers + options
│   │   ├── sign-up/     register user, send OTP
│   │   ├── verify/      check code, mark verified
│   │   ├── messages/    GET own inbox
│   │   ├── accept-messages/  toggle accepting messages
│   │   └── u/[username]/message/ public POST (anonymous send)
│   ├── dashboard/       📥 private inbox
│   ├── u/[username]/    🕊 public anonymous send page
│   └── page.tsx         landing
├── lib/       DBconnect (mongoose), resend client
├── helpers/   sendOtpEmail (Resend OR SMTP), React-email template
├── model/     User schema (with embedded Messages)
├── schemas/   Zod validation
└── middleware.ts  session-aware routing
```

## Security notes

- **Never commit `.env`** — secrets go only through env vars.
- Passwords are hashed with bcrypt (10 rounds), verification codes expire after 15 minutes.
- The Docker build is multi-stage with a **non-root** runtime user; image is ~150MB.
- Upgrading: the repo previously shipped with real credentials committed to git —
  they were **rotated** (Resend key + Atlas password) by the owner, and env vars are
  now the only place connection info lives.

## API summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/sign-up` | – | Register, trigger OTP email |
| POST | `/api/verify` | – | Verify 6-digit code |
| GET/POST | `/api/auth/*` | – | NextAuth (signIn/callbacks/session/signOut) |
| GET | `/api/messages` | ✅ | Own messages, newest first |
| POST | `/api/accept-messages` | ✅ | Set `isAcceptingMsg` |
| GET | `/api/u/:username/message` | – | Check profile/accepting status |
| POST | `/api/u/:username/message` | – | Send anonymous message (2–300 chars) |

## Roadmap / known limitations

- Inbox caps at 300 messages; no per-message delete yet.
- No rate limiting on the public send endpoint yet.
- Group chats / private chats are a future thing — v1 is the anonymous inbox.

---

Made with 🕊 by [@shtmthw](https://github.com/shtmthw)

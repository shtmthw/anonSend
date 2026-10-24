# anonSend

AnonSend is a self-hosted anonymous messaging web app.

Create an account, verify it with a code sent to your email, and you get your
own page at `/u/<username>`. Anyone with that link can send you an anonymous
message. You read those messages in your private dashboard, pause incoming
messages whenever you want, and share or delete your link at any time.

## Features

- Anonymous messages: senders log in with nothing and provide no identity.
- Real accounts on the receiving end: email + 6-digit code verification.
- Usernames are only claimed in the database once the code is verified;
  unverified signups reserve a name for at most 24h and then free it
  automatically.
- Sign in with email or username.
- Private dashboard: read messages, copy your personal link, and send
  anonymous messages to any username with a live-checked composer.
- Pause/resume accepting messages with one toggle.
- Ships as a Docker image; a compose file brings up the app, MongoDB and a
  development mailbox, all on one internal network.


## Screenshots  

-Landing page when user is not logged/signed
  <img width="1919" height="994" alt="Screenshot_20261024_162901" src="https://github.com/user-attachments/assets/4b9e3efb-52c1-42f2-aba6-af836b0c3dfa" />


-Signing up
  <img width="1919" height="994" alt="Screenshot_20261024_162944" src="https://github.com/user-attachments/assets/25e26a50-45e3-4457-b902-ee601a35eb52" />


-providing OTP to be verified
  <img width="1919" height="994" alt="Screenshot_20261024_163008" src="https://github.com/user-attachments/assets/6bdcbcc9-44ed-49f9-b3af-614b33e750da" />


-Sending an user anonymous text
  <img width="1919" height="994" alt="Screenshot_20261024_163140" src="https://github.com/user-attachments/assets/4e4256c6-0de2-4834-8c91-04bae35e0ec4" />

  <img width="1919" height="994" alt="Screenshot_20261024_163505" src="https://github.com/user-attachments/assets/70e8bb9a-12ce-493a-a445-5793cb4d0b9d" />

  
-Dashboard overview
  <img width="1919" height="994" alt="Screenshot_20261024_164104" src="https://github.com/user-attachments/assets/3ac20915-8b2e-4754-9dbf-0eb4d15d1637" />

  

## Quick start

```bash
git clone https://github.com/shtmthw/anonSend.git
cp .env.example .env     # set NEXTAUTH_SECRET (openssl rand -base64 32)
docker compose up -d
```

Open `http://localhost:3000` and sign up.

Verification emails are caught by the built-in Mailpit mailbox. Read them at
`http://localhost:8025` — no real mail account is needed to try the app.

## Sending real email

Edit `.env` and blank `SMTP_HOST`, then use either:

- `RESEND_API_KEY` (from resend.com) and `MAIL_FROM`
- or a normal SMTP server: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  (for Gmail use an app password)

Then `docker compose up -d app`. Resend is used when `RESEND_API_KEY` is set,
otherwise SMTP.

If your SMTP host does not resolve or does not answer, you will see a warning
at startup and no OTP email; check those values first.

## Configuration

Copy `.env.example` to `.env` and edit. All values:

| Variable | Default | Notes |
|---|---|---|
| `NEXTAUTH_URL` | `http://localhost:3000` | Public base URL of the site, no trailing slash |
| `NEXTAUTH_SECRET` | - | Required. `openssl rand -base64 32` |
| `MONGODB_URI` | `mongodb://admin:changeme@mongo:27017` | Connection string; Atlas SRV strings work too |
| `MONGODB_DB` | `main` | Database name |
| `MONGO_USER` / `MONGO_PASSWORD` | `admin` / `changeme` | Credentials the compose file gives the mongo container |
| `RESEND_API_KEY` | - | Enables Resend as the OTP sender |
| `MAIL_FROM` | `AnonSend <onboarding@resend.dev>` | Sender address |
| `SMTP_HOST` | `mailpit` | Point at a real SMTP server for real mail |
| `SMTP_PORT` | `1025` | Common real values: `587`, `465` |
| `SMTP_USER` / `SMTP_PASS` | - | SMTP credentials |
| `SMTP_SECURE` | `false` | `true` only for direct TLS on port 465 |
| `APP_PORT` | `3000` | Host port of the app in compose |

## Development

```bash
npm ci
cp .env.example .env
docker compose up -d        # MongoDB and Mailpit
npm run dev                 # http://localhost:3000
```

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/sign-up` | no | Register, trigger OTP email |
| POST | `/api/verify` | no | Verify the 6-digit code |
| GET/POST | `/api/auth/*` | no | NextAuth (sign in, session, sign out) |
| GET | `/api/messages` | yes | Own messages, newest first |
| POST | `/api/accept-messages` | yes | Set accepting state |
| GET | `/api/u/:username/message` | no | Check user exists / accepting state |
| POST | `/api/u/:username/message` | no | Send an anonymous message (2 to 300 chars) |

## Limits

- An inbox stores up to 300 messages.
- Unverified signups (email + username reservation) expire after 24h.
- No rate limiting on the public send endpoint yet.
- Group or private chat between users is not built yet.

## Security notes

- Passwords are hashed with bcrypt; verification codes expire after 15 minutes.
- Never commit your `.env` file.

Docker image: `matthew552/anonsend:latest`

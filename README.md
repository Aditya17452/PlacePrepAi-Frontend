# PlacePrep AI — Frontend

> 🏆 **1st Prize, Agentic AI Competition — IIST Indore**

PlacePrep AI is an AI mock-interview platform for college placements. Students practise live, voice-based interviews with an LLM interviewer that adapts to their answers, their resume and the job description they are targeting, and get a scored report at the end. College placement cells manage their roster, token allowance and student reports; platform admins manage colleges and token pools.

This repository is the **React frontend**. The FastAPI backend and interview agent live in [PlacePrepAi-Backend](https://github.com/Aditya17452/PlacePrepAi-Backend).

---

## Features

**For students**
- Resume upload and job-description selection before each interview
- **Live interview room** — the AI interviewer speaks each question (browser speech synthesis); each answer is sent to the backend as one idempotent HTTP turn, with automatic retry and resume after a refresh
- **Proctoring** — MediaPipe FaceMesh (no face, multiple faces, gaze), tab switches, full-screen exits and paste attempts are reported to the server, which computes an integrity score shown separately on the report
- Detailed report with technical, communication, body-language and overall scores and topic-wise feedback
- Interview history and an interview-token wallet with Razorpay checkout (tokens are granted only by the verified payment webhook)

**For college admins**
- Student list with reports and integrity, roster upload, join requests, allowance groups and per-student top-ups

**For platform admins**
- Platform stats, college enrolment and invites, token grants/revocations, freeze/deactivate, audit log and token ledger

## Tech stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · React Router · MediaPipe FaceMesh · Web Speech API · MediaRecorder · Razorpay Checkout · Sentry · Recharts · Framer Motion

## Pages

| Route area | Pages |
|---|---|
| Public | Landing, About, Contact, Login, Register, Google OAuth callback |
| Public | Invite acceptance (college admins) |
| Student | Verify, Dashboard, Pre-interview setup, Interview room, Report, Plans |
| College admin | `/college` console |
| Admin | `/admin` control center |

## Run locally

Start the [backend](https://github.com/Aditya17452/PlacePrepAi-Backend) first, then:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`. Only public values belong here — everything prefixed `VITE_` ships to the browser.

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`, `npm test`.

When the backend API changes, export its OpenAPI schema to `src/lib/api/openapi.json` and run `npm run gen:api`; type errors then show every call site that needs updating.

## Project structure

```
src/
├── app/          route guards, error boundary, session hook
├── pages/        route-level screens (interview room, report, consoles…)
├── components/   shared UI, chatbot, shadcn/ui primitives (components/ui is vendored)
├── services/     typed API functions (services/api.ts)
├── lib/          env, HTTP client, generated API types, session, interview store, CSV
├── hooks/        reusable hooks (proctoring reporter, toasts)
└── types/        type declarations (incl. MediaPipe)
```

## Team

Built by **Team Saksham** — Aditya Chouksey (team lead), Darpan Naganpuriya, Palak Sharma and Sharvari Shambharkar.

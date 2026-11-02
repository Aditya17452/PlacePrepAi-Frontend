# PlacePrep AI — Frontend

> 🏆 **1st Prize, Agentic AI Competition — IIST Indore**

PlacePrep AI is an AI mock-interview platform for college placements. Students practise live, voice-based interviews with an LLM interviewer that adapts to their answers, their resume and the job description they are targeting, and get a scored report at the end. Placement officers and admins manage students, credits and shortlists from their own dashboards.

This repository is the **React frontend**. The FastAPI backend and interview agent live in [PlacePrepAi-Backend](https://github.com/Aditya17452/PlacePrepAi-Backend).

---

## Features

**For students**
- Resume upload and job-description selection before each interview
- **Live interview room** — the AI interviewer speaks each question (browser speech synthesis); the student's answer is recorded and streamed to the backend over a WebSocket for transcription
- **Webcam body-language tracking** — MediaPipe FaceMesh runs in the browser to estimate eye contact and posture, with live posture warnings during the interview
- Detailed report with technical, communication, body-language and overall scores and topic-wise feedback
- Interview history and a credits wallet with Razorpay checkout

**For placement officers**
- Student list with interview results, shortlisting and credit management

**For super admins**
- Platform stats, college enrolment and student oversight

## Tech stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · React Router · MediaPipe FaceMesh · Web Speech API · MediaRecorder · WebSockets · Recharts · Framer Motion

## Pages

| Route area | Pages |
|---|---|
| Public | Landing, About, Contact, Login, Register, Google OAuth callback |
| Student | Dashboard, Pre-interview setup, Interview room, Report, Buy credits |
| Officer | Officer dashboard, Officer credits |
| Admin | Admin panel, Super admin panel |

## Run locally

Start the [backend](https://github.com/Aditya17452/PlacePrepAi-Backend) first, then:

```bash
npm install
npm run dev
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000
VITE_CHATBOT_WEBHOOK_URL=          # optional
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm test`.

## Project structure

```
src/
├── pages/        route-level screens (interview room, report, dashboards…)
├── components/   shared UI, chatbot, shadcn/ui primitives
├── services/     API and WebSocket clients
├── hooks/        reusable React hooks
└── types/        type declarations (incl. MediaPipe)
```

## Team

Built by **Team Saksham** — Aditya Chouksey (team lead), Darpan Naganpuriya, Palak Sharma and Sharvari Shambharkar.

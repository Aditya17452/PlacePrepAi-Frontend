# PlacePrep AI — Production Upgrade Plan

**Status:** Revision 2 — addendum applied, Phase 1 in progress.
**Date:** 2026-11-27
**Scope:** `PlacePrepAi-Backend` (FastAPI) + `PlacePrepAi-Frontend` (Vite/React) + Supabase `nybywdmmlzgzncvrstoa`.

Read in full for this plan: 25 backend Python files (~4,300 LOC), 40 frontend source files
(~11,000 LOC, of which ~5,500 is unmodified shadcn/ui), both READMEs, `render.yaml`,
`vercel.json`, and the live Supabase schema (tables, columns, indexes, RLS state, advisors).

---

## 0. Revision 2 — decisions resolved, and what they change

All ten decisions in §5 are answered. Where the answers conflict with the text below,
**the answers win**. The four structural consequences:

**0.1 No Render. Backend goes on Vercel (Pro).** This removes WebSockets from the design.
- `WS /ws/interview/{id}` → `POST /api/interviews/{id}/turns` with a client-supplied
  `turn_id` for idempotency. One HTTP request per answer, well inside the function duration limit.
- Proctoring events batch over HTTP every few seconds instead of streaming.
- Live state in Upstash Redis, durable record in Postgres.
- Background work (evaluation, JD matching) = Postgres job rows drained by Vercel Cron,
  never `asyncio.create_task`.
- Bundle must stay under 250 MB — dropping `sentence-transformers` is now a hard
  requirement, not a cleanup.
- Everything in §4 Phase 1b about "WS hardening" becomes **turn-endpoint hardening**:
  auth per request, `turn_id` idempotency, resume-from-Redis on reload.

**0.2 Roles renamed.** `officer` → `college_admin`, `super_admin` → `admin`. Three roles only.
JWT carries user ID + token version; **role is resolved from the DB on every request**, and
every college-scoped query filters by the caller's DB `college_id`. See §7.

**0.3 Credits → tokens.** One token = one interview, on an append-only ledger with
reserve/consume/release semantics. This replaces the whole `student_credits` /
`credit_transactions` design, not just its bugs. See §8.

**0.4 Groq model change.** `llama-3.3-70b-versatile` is now Enterprise-only. Default to
`openai/gpt-oss-120b` for question writing and grading, `gpt-oss-20b` for cheap tasks,
`whisper-large-v3-turbo` for STT. Model ID configurable **per task**. See §10.

**Also settled:** rotate `JWT_SECRET` now (9 users, forced re-login accepted) ·
Upstash Redis · populate `jd_chunks` + keyword search in Phase 1, pgvector revisited in
Phase 3 · `student_credits.updated_at` cast approved, snapshot first · GitHub PAT supplied
by you as an env var · proctoring flag-only except sustained multi-face/no-face ·
snapshots purged at 14 days via `pg_cron` · old folders and `Aditya17452/PlacePrepAI` abandoned.

Enrollment is no longer "email domain = proof". See §7.3 — roster + verified OTP is the
default, domains are opt-in per college, join codes never suffice alone.

---

## 1. Current architecture

### 1.1 Backend — `PlacePrepAi-Backend`

```
main.py            FastAPI app, CORS, router registration, startup hook
core/config.py     plain Settings class over os.getenv()
models/
  database.py      SQLAlchemy engine + 9 ORM models + 6 seeded JD templates
  schemas.py       EMPTY (0 bytes)
api/
  auth.py          register / login / me / Google OAuth
  interviews.py    start, WS /ws/interview/{id}, end, report, history
  resume.py        upload + PDF extract + link scrape + JD match
  credits.py       student credit read/consume + officer grant/reset
  credits_payment.py  Razorpay order/verify (+ an unguarded credit-add route)
  jd_upload.py     student-pasted custom JDs + background resume match
  officer.py       officer student list + AI shortlist
  super_admin.py   platform stats, college enrolment, credit admin
agents/
  interview_agent.py  question generation, live feedback, final evaluation
services/
  session_service.py  in-process dict holding live session state
  rag_service.py      keyword LIKE search over jd_chunks (+ unused embedder)
  resume_scraper.py   blocking requests → GitHub API / LeetCode / any website
  whisper_service.py  Groq whisper-large-v3 transcription
add_payment_table.py / create_profile_table.py / scripts/seed_data.py  ad-hoc DDL
render.yaml        single web service, no health check, DATABASE_URL=sqlite
```

**Request flow — an interview today**

1. `POST /api/interviews/start` with `{student_id, jd_id | custom_jd_id}` in the body.
   No authentication. Creates an `interview_sessions` row and an `InterviewAgent`
   stored in the module-level dict `active_agents[session_id]`.
2. Client opens `WS /ws/interview/{session_id}`. No authentication. If the process that
   holds `active_agents[session_id]` is not the one serving the socket, the server replies
   `{"type":"error","message":"Session not found."}` and closes.
3. Per turn the client sends `turn_complete` with a browser-STT `transcript` and/or a
   base64 WebM blob. The server prefers the browser transcript; otherwise it calls Groq
   Whisper (6 s timeout). It then calls Groq Llama 3.3 70B for the next question, writes a
   `session_transcripts` row, and returns `next_question`.
4. Webcam heuristics arrive as `vision_scores` every 3 s and are averaged in memory only.
5. On disconnect `_end_session` writes a pending `session_scores` row and fires
   `asyncio.create_task(_run_evaluation(...))` — one Groq call that grades the whole
   transcript and fills in every score.

**Question policy today** (`agents/interview_agent.py`): a fixed script — Q1–Q2 from a
hardcoded `WARMUP_QUESTIONS` list, Q11 and Q12 from `CLOSING_QUESTIONS`, Q3–Q10 free-form
LLM generation at `temperature=0.85`, repeat detection by lowercase substring containment,
`MAX_QUESTIONS = 12` hardcoded in the module (shadowing `settings.MAX_QUESTIONS`).
There is no competency model, no difficulty ladder, no per-question weight, and no rubric.

### 1.2 Frontend — `PlacePrepAi-Frontend`

Vite 5 + React 18 + TS + Tailwind + shadcn/ui, Lovable-generated (`lovable-tagger` still in
the build). 17 routes in `App.tsx`, all unguarded. `src/services/api.ts` is the typed API
client; several pages bypass it and `fetch` directly with their own `API` constant.

`src/pages/InterviewRoom.tsx` (1,129 lines) is the whole interview client: Web Speech
TTS with a voice-preference list, `webkitSpeechRecognition` for live text, `MediaRecorder`
→ base64 audio over the socket, MediaPipe FaceMesh loaded from jsDelivr at runtime,
posture/eye-contact scoring from landmark geometry, a 3-strike warning overlay, a 5 s
look-away timer, a 1 s watchdog that ends the session after 5 s with no face, and a
`visibilitychange` handler. A free-text answer box is always available.

### 1.3 Database — Supabase `nybywdmmlzgzncvrstoa` (live, has real data)

| Table | Rows | RLS |
|---|---|---|
| `students` | 9 | enabled, **no policies** |
| `colleges` | 1 | enabled, **no policies** |
| `student_profile_data` | 5 | enabled, **no policies** |
| `interview_sessions` | 67 | **disabled** |
| `session_transcripts` | 173 | **disabled** |
| `session_scores` | 58 | **disabled** |
| `job_descriptions` | 6 | **disabled** |
| `jd_chunks` | **0** | **disabled** |
| `student_jds` | 42 | **disabled** |
| `student_credits` | 10 | **disabled** |
| `credit_transactions` | 83 | **disabled** |
| `shortlists` | 0 | **disabled** |

- `payment_logs` **does not exist** in this project.
- Migration history is **empty** — the schema was created by `create_tables()` and ad-hoc scripts.
- Indexes exist only on primary keys plus `students.email`, `session_scores.session_id`,
  `student_credits.student_id`, `student_jds.student_id`. Nothing on
  `session_transcripts.session_id`, `interview_sessions.student_id`, or `credit_transactions.student_id`.
- `student_credits.updated_at` is typed **`text`**, not a timestamp.
- `pgvector` 0.8.0, `pgmq`, `pg_cron` are available but not installed; `pgcrypto` and
  `uuid-ossp` are installed.

---

## 2. Gaps vs the brief

### 2.1 Confirmed from the audit list

| Item | Finding |
|---|---|
| `role` from request body | `api/auth.py:92` — `role = "super_admin" if email in super_admin_emails else body.get("role", "student")`. Anyone passing `{"role":"officer"}` to `/api/auth/register` gets an officer JWT, and officer routes trust the JWT claim. **Confirmed.** |
| `JWT_SECRET` default | `core/config.py:14` — `os.getenv("JWT_SECRET", "secret")`. **Confirmed.** |
| Hardcoded super-admin emails | `core/config.py:48` — two Gmail addresses as the default value, in the public repo. **Confirmed.** |
| CORS `*` + credentials | `main.py:22-28`. **Confirmed.** |
| In-memory session state | `services/session_service.py` module-level `_store` dict, plus `active_agents` in `api/interviews.py`. Lost on restart; breaks with >1 worker. **Confirmed.** |
| `render.yaml` sqlite | `DATABASE_URL: sqlite:///./placeprep.db` is still in the file; production must be running on a dashboard override, because the live data is in Supabase. **Confirmed and worse than stated** — nothing in `render.yaml` declares `JWT_SECRET`, `REDIS_URL`, Google OAuth, or Razorpay keys. |
| `create_tables()` + ad-hoc scripts | `main.py:71`, `add_payment_table.py`, `create_profile_table.py`. Supabase migration history is empty. **Confirmed.** |
| Silent router import failures | `main.py:33-67` — five bare `try/except` blocks that `print` and continue. `api.profile_links` does not exist, so every boot logs a warning and continues. **Confirmed.** |
| `sentence-transformers` | In `requirements.txt`; `rag_service.get_embedder()` is defined but **never called anywhere**. So it is not a runtime RAM problem — it is a ~2 GB torch install on every build, for nothing. **Confirmed, cause slightly different.** |
| Blocking `requests` in async | `services/resume_scraper.py` uses `requests` + `time.sleep(0.3)`, called synchronously from the `async def upload_resume` handler. Up to 8 URLs × (8 s timeout + 0.3 s sleep) blocks the whole event loop. **Confirmed.** |
| `ALLOWED_STUDENT_DOMAIN` | Still the default for the **Google OAuth** path (`auth.py:243`), so Google sign-in only works for `@indoreinstitute.com`. `/api/auth/register` has already moved on to a `colleges` table lookup — the two paths disagree. **Confirmed, and inconsistent.** |
| `models/schemas.py` empty | 0 bytes; most endpoints take `body: dict`. **Confirmed.** |

### 2.2 Additional problems found (not in the brief)

Ordered by severity.

1. **Free credits for anyone.** `api/credits_payment.py` ends with a route appended under
   the payments router: `POST /api/payments/{student_id}/add` with body `{"amount": N}`.
   No authentication, no signature, no limit. Anyone can grant themselves unlimited
   interview credits. This also shadows the intended `/api/credits/{id}/add` path.
2. **Paid customers get nothing.** `POST /api/payments/verify` adds credits and then
   inserts into `payment_logs` using `lower(hex(randomblob(16)))` — a SQLite-only
   function, into a table that does not exist in Supabase. The insert raises, the
   `except` block calls `db.rollback()`, and **the credit grant is rolled back with it**.
   A successful Razorpay payment currently results in zero credits.
3. **Payment replay.** `/api/payments/verify` has no idempotency key and no uniqueness
   constraint on `payment_id`. The same valid signature can be posted N times for N× credits.
   There is also no Razorpay webhook endpoint at all.
4. **Interviews are free.** No endpoint deducts a credit server-side. `useCredit()` is
   called only from `JDUploadSection.tsx:246`, client-side, before `startInterview`.
   Calling `POST /api/interviews/start` directly skips it entirely.
5. **Interview-as-anyone.** `/api/interviews/start` reads `student_id` from the body with
   no auth, and if the student or JD is not found it falls back to
   `db.query(Student).first()` / `db.query(JobDescription).first()` — silently attributing
   the session to an arbitrary student.
6. **Report IDOR.** `GET /api/interviews/{session_id}/report`, `/history/{student_id}`,
   `/api/credits/{student_id}`, `/api/jd/list/{student_id}`, `/api/resume/upload` all take
   the identity from the path/query and verify nothing. `Report.tsx` doesn't even send the
   token. Session IDs are UUID4, so this is not trivially enumerable, but it is not access control.
7. **Unsalted SHA-256 passwords.** `auth.py:38` — `hashlib.sha256(password.encode())`.
   No salt, no work factor; rainbow-table recoverable. Needs a bcrypt/argon2 rehash-on-login migration.
8. **SSRF.** `resume_scraper.scrape_website()` fetches any URL found in an uploaded PDF,
   following redirects, with no scheme/host/IP filtering. On a cloud host this reaches the
   instance metadata endpoint and anything on the private network.
9. **OAuth token in a URL.** The Google callback redirects to
   `{FRONTEND_URL}/auth/callback?token={jwt}&role=...&name=...` — the JWT lands in browser
   history, the Referer header, and any proxy log.
10. **RAG is dead in production.** `jd_chunks` has 0 rows, so `retrieve_jd_context()`
    returns `"No specific JD requirements found."` on every single turn. `embed_jd()` is only
    called from `scripts/seed_data.py`, which was never run against Supabase. Every
    "JD-aware" question today is generated from the role title alone.
11. **DDL on the hot path.** `credits.py::_ensure_credits_table()` runs two
    `CREATE TABLE IF NOT EXISTS` statements, then `SELECT id FROM students`, then one
    `SELECT` per student — on **every** credit read and write. At 1,000 students that is
    1,000+ queries per page load. `resume.py` and `jd_upload.py` do the same kind of
    request-time DDL.
12. **Lost background work.** Both `_run_evaluation` and `_match_jd_async` are
    `asyncio.create_task` with no persistence. A restart mid-interview leaves
    `session_scores.evaluation_status = 'pending'` forever, and the report page polls every
    4 s in an unbounded recursion (`analyzeTranscript`) with no attempt cap.
13. **Broken officer shortlist.** `api.ts::generateShortlist` POSTs `{jd_id}` as a JSON
    body; `api/officer.py::generate_shortlist` declares `jd_id: str` as a **query**
    parameter. Every call 422s.
14. **Double `/api` prefix.** `AdminPanel.tsx:5` uses `VITE_API_BASE_URL` and then appends
    `/api/officer/students`, while every other page uses the same variable already
    containing `/api`. One of the two is broken in any given deployment. It also calls
    `/api/officer/payments`, which does not exist.
15. **Two different WS env vars.** `api.ts` reads `VITE_WS_BASE_URL`; `InterviewRoom.tsx:743`
    (the only code that actually opens the socket) reads `VITE_WS_URL`. Falls back to
    `ws://localhost:8000` in production if the wrong name is set.
16. **`pdfplumber` is not installed.** `resume.py::_extract_text` tries it first, but it is
    absent from `requirements.txt`, so production silently falls back to PyPDF2 — the exact
    weak extractor the brief wants replaced. Resume text is then truncated to **3,000 chars**
    both in the DB and in every prompt.
17. **No route guards.** `/super-admin`, `/officer`, `/admin`, `/dashboard` render for
    anyone; only `AdminPanel` and `SuperAdminPanel` do a `sessionStorage.getItem("role")`
    check, which is client-side and trivially forged. (The backend does guard
    `/api/officer/*` and `/api/super/*` — those are sound.)
18. **Frontend robustness.** `@tanstack/react-query` is a dependency but no
    `QueryClientProvider` is mounted; no error boundary; no `Toaster`/`Sonner` mounted
    despite `sonner` being used; one placeholder test (`expect(true).toBe(true)`); no CI;
    no `.env.example` in either repo; `vercel.json` sets SPA rewrites and no security headers.
19. **Tenancy by email suffix.** `officer.py` scopes students with
    `Student.email.like(f"%@{college.domain}")` instead of the existing
    `students.college_id` FK (which is unindexed and unused). A student who changes email
    domain leaves their college silently.
20. **Pooler mismatch.** `pool_size=10, max_overflow=20` per process × workers, against the
    Supabase pooler. Needs to be sized deliberately, and `NullPool`/small pool with
    `pgbouncer`-compatible settings if using the transaction pooler.

### 2.3 Gaps against the four new features

| Feature | Today | Missing |
|---|---|---|
| Resume-aware questioning | Raw text, 3,000-char cap, injected as a blob | Structured `candidate_profile` (education/skills/projects/experience with provenance), robust PDF+DOCX extraction, Pydantic validation, versioning, student correction UI |
| GitHub context | Unauthenticated API (60 req/h **per instance IP**, shared by all users), top 6 repos by `updated`, 3 READMEs, no caching | Server token, async client, stars/commit activity/pinned repos/languages, TTL cache, per-repo evidence linkage |
| LinkedIn | URL parsed, nothing fetched | PDF upload + paste path through the same structured extractor |
| Adaptive algorithm | Fixed script + free-form LLM | Competency map, ability estimates with uncertainty, priority-based selection, difficulty ladder, per-question weights, rubric-based structured grading, decision trace, stopping rule, similarity-based repeat check, unit tests |
| Proctoring | Client-side only, never reported to the server; 3-warning overlay; `maxNumFaces: 1` | Fullscreen enforcement, blur/copy/paste/right-click/devtools, multi-face, gaze duration, identity continuity, phone detection, audio checks, **server-side** event store + integrity score + termination policy, snapshots, consent/DPDP notice |
| Scale | 1 instance, in-memory state, no rate limits, no queue | Redis state, rate limiting, LLM concurrency control + backpressure, load test, always-on host |

---

## 3. Schema changes

Baseline first: `alembic stamp` the **current** Supabase schema as revision `0001_baseline`
so nothing existing is recreated or dropped. Every change below is additive except where
marked.

**New tables**

```
candidate_profiles        id, student_id FK, version, source ('resume'|'linkedin_pdf'|'manual'),
                          profile JSONB, raw_text_ref, extractor_version, confirmed_by_student,
                          created_at            -- unique (student_id, version)

candidate_links           id, student_id FK, kind ('github'|'leetcode'|'linkedin'|'portfolio'),
                          url, handle, verified, created_at

github_snapshots          id, student_id FK, handle, payload JSONB, fetched_at, etag,
                          expires_at            -- TTL cache
leetcode_snapshots        id, student_id FK, handle, payload JSONB, fetched_at, expires_at

candidate_context         id, student_id FK, version, context JSONB,
                          evidence JSONB,       -- per skill/project: claimed / corroborated / strong
                          built_at              -- what the interview engine reads

jd_requirements           id, jd_id, competency, importance NUMERIC, extracted_by, created_at

interview_plans           id, session_id FK, competency_map JSONB, config JSONB, created_at
interview_questions       id, session_id FK, turn, competency, qtype, difficulty,
                          weight NUMERIC, question TEXT, rubric JSONB, selection_trace JSONB,
                          asked_at
interview_answers         id, question_id FK, answer TEXT, transcript_source, grade JSONB,
                          correctness, depth, clarity, relevance, evidence_quotes JSONB,
                          graded_at, grader_model
competency_estimates      id, session_id FK, competency, rating NUMERIC, uncertainty NUMERIC,
                          n_questions, updated_at

proctoring_events         id, session_id FK, type, severity SMALLINT, detail JSONB,
                          client_ts, server_ts, snapshot_path   -- partitioned-ready
proctoring_summaries      id, session_id FK, integrity_score, verdict, timeline JSONB,
                          auto_terminated BOOLEAN, computed_at

consents                  id, student_id FK, kind ('proctoring'|'profile_processing'),
                          version, granted_at, revoked_at, ip, user_agent

payment_logs              id, student_id FK, order_id, payment_id UNIQUE, package,
                          credits_added, amount_paise, status, signature_verified,
                          raw_webhook JSONB, created_at        -- replaces the missing table

idempotency_keys          key PRIMARY KEY, scope, response JSONB, created_at
api_audit_log             id, actor_id, actor_role, action, target, detail JSONB, ip, created_at
```

**Changes to existing tables**

- `students`: add `auth_version SMALLINT DEFAULT 1` and `password_algo TEXT DEFAULT 'sha256'`
  to drive the bcrypt rehash-on-login migration. Make `college_id` the authoritative
  tenancy column and backfill it from email domain, then index it.
- `interview_sessions`: add `integrity_score`, `proctored BOOLEAN`, `plan_version`,
  `ended_reason`.
- `session_scores`: add `competency_scores JSONB`, `weighted_total`, `integrity_score`
  (kept separate from `overall_score`).
- `job_descriptions`: add `requirements_extracted_at`.
- `jd_chunks`: add `embedding vector(N)` **only if** we adopt pgvector (see decision 5);
  otherwise leave as-is and populate it, which alone fixes gap 2.2.10.
- **Type fix (needs approval):** `student_credits.updated_at` `text` → `timestamptz`.
  83 rows of `credit_transactions` and 10 of `student_credits` — a safe `USING` cast, but
  it is a destructive column rewrite, so I will not run it without a yes.

**Indexes to add:** `session_transcripts(session_id, turn_number)`,
`interview_sessions(student_id, started_at DESC)`, `interview_sessions(jd_id)`,
`credit_transactions(student_id, created_at DESC)`, `students(college_id)`,
`proctoring_events(session_id, server_ts)`, `interview_questions(session_id, turn)`.

**RLS:** the backend connects with the service role (which bypasses RLS). The risk is the
**anon key** reaching PostgREST directly: with RLS off on 9 tables, anyone holding the anon
key can read all students, transcripts and scores. Plan: enable RLS on every public table
with **no permissive policies** (deny-by-default for anon/authenticated), confirm the
backend's role bypasses it, and keep the three already-enabled tables as they are. This is
the correct fix *because* the frontend never talks to Supabase directly — I verified there
is no `@supabase/supabase-js` dependency and no Supabase call anywhere in the frontend.

---

## 4. Phase plan

Each phase is one feature branch per repo, small commits, tests green at each step, and
ends with: what changed / how to test it / open risks.

### Phase 0 — Groundwork (half a day, no behaviour change)

- `.env.example` in both repos; `RUNBOOK.md` skeleton.
- Alembic installed and baselined against live Supabase (`0001_baseline`, no-op).
- GitHub Actions: backend `ruff` + `mypy` + `pytest`; frontend `eslint` + `tsc --noEmit` + `vitest`.
- Delete `add_payment_table.py`, `create_profile_table.py`; fold seeding into a migration
  plus an explicit `scripts/seed.py` that is never called at import time.
- **Exit:** CI green on both repos, `alembic current` matches Supabase, zero runtime change.

### Phase 1 — Production foundation

**1a. Security hotfixes (ship first, on its own PR)**
1. Delete the unguarded `POST /api/payments/{student_id}/add` route.
2. Server-assigned roles: `register` ignores `role`; officer/admin only via
   `/api/super/*`. Re-verify every existing user's role claim against the DB on each
   request (don't trust the JWT claim alone).
3. `JWT_SECRET` required in production — startup fails without it. Rotate the current one
   (invalidates live sessions; needs a 24 h window since `JWT_EXPIRE_HOURS = 24`).
4. `SUPER_ADMIN_EMAILS` from env only, no default.
5. CORS from env: `https://www.placeprepai.fun`, `https://placeprepai.fun`, Vercel preview
   regex, `http://localhost:8080`.
6. Fix `/api/payments/verify`: create `payment_logs`, portable SQL, `payment_id` unique,
   idempotent, single transaction, credits committed.
7. Razorpay webhook endpoint with signature verification as the source of truth.
8. Server-side credit consumption inside `/api/interviews/start`, in one transaction with
   session creation.
9. Authenticate everything: `/interviews/start` takes the student from the JWT (no body
   `student_id`, no "first student" fallback); ownership checks on report, history,
   credits, resume, JD list/delete.
10. bcrypt (`passlib`) with rehash-on-login; `password_algo` column tracks progress.
11. SSRF allowlist in the scraper: `https` only, public IPs only (resolve and reject
    private/loopback/link-local), host allowlist for github.com / leetcode.com, size and
    time caps, no redirects to new hosts.
12. OAuth: swap the `?token=` redirect for a short-lived one-time code exchanged by the
    frontend over POST.
13. RLS enabled deny-by-default on all public tables; re-run both Supabase advisors.

**1b. Platform**
- `pydantic-settings` config with validation and a `ENV=production` strict mode;
  `models/schemas.py` filled in with request/response models for every endpoint;
  `body: dict` eliminated.
- `structlog` JSON logging, request-ID middleware, every `print()` replaced.
- `/health` (liveness) and `/ready` (DB + Redis round-trip).
- Rate limiting (`slowapi` or a Redis token bucket) per IP **and** per user on
  `/auth/*`, `/resume/upload`, `/interviews/start`, `/jd/submit`, payments.
- `core/llm.py`: single Groq wrapper — provider interface, timeout, bounded retries with
  jittered backoff, key fallback, per-call token budget, JSON-schema validated structured
  output with one re-ask on parse failure, and a global concurrency semaphore. All five
  current call sites move onto it.
- Redis (Upstash) session state replacing `_store` and `active_agents`: `SessionManager`
  keeps the same interface, state TTL ~2 h, Postgres remains the durable record.
- WS hardening: JWT in the first frame (subprotocol or `?token=` over wss) validated before
  `accept()`, ownership check on `session_id`, ping/pong heartbeat, reconnect-and-resume
  from Redis, `turn_id` for idempotent answer submission, per-socket answer size cap.
- `main.py`: `lifespan` instead of `on_event`, no `create_tables()`, real imports with no
  `try/except` swallowing, dead `api.profile_links` import removed.
- Uploads: 5 MB cap, magic-byte type check, resumes into a **private** Supabase Storage
  bucket with signed-URL reads; nothing on local disk.
- Drop `sentence-transformers` from `requirements.txt`; add `pdfplumber`/`pymupdf`,
  `python-docx`, `httpx` usage in the scraper.
- Populate `jd_chunks` for the 6 existing JDs and on every JD create — this alone restores
  JD-grounded questioning.
- Replace the per-request `_ensure_credits_table()` DDL with migrations.
- Durable background work: Postgres-backed job rows (or `pgmq`) + a worker loop for
  evaluation and JD matching, with a sweeper for `evaluation_status = 'pending'` older than
  N minutes.

**1c. Frontend**
- One `env.ts` module; `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` used consistently
  (`AdminPanel` and `InterviewRoom` fixed); fail fast in production if unset.
- `<ErrorBoundary>`, `QueryClientProvider`, `<Toaster/>` mounted; loading/empty/error
  states on Dashboard, Report, Officer, Admin.
- `<RequireAuth role=...>` wrappers on all private routes.
- Fix `generateShortlist` to match the backend contract; drop the dummy-File
  `matchResumeWithJDs`; remove the dead `/api/officer/payments` call.
- WS client: reconnect with backoff, resume, heartbeat, "connection lost" UI instead of
  "Refresh."
- Sentry on both sides (DSN via env, PII scrubbed); security headers in `vercel.json`.
- Real tests: API client, env resolution, the reducer logic pulled out of `InterviewRoom`.

> **Status (2026-11-27, branch `feat/phase1c-frontend`): done, pending end-to-end test on a Vercel preview.**
> - [x] `src/lib/env.ts` (fails fast in production); WebSocket env vars removed — the interview is HTTP turns now.
> - [x] Typed client generated from the backend OpenAPI schema (`npm run gen:api`), `ApiError` with status, 401 → re-login.
> - [x] `ErrorBoundary`, `QueryClientProvider`, toasters mounted; route-level code splitting.
> - [x] `RequireAuth` with roles `student` / `college_admin` / `admin`; old `/officer`, `/super-admin`, `/buy-credits` redirect.
> - [x] OAuth one-time-code exchange; email/phone OTP page; college-admin invite page; MFA code on login.
> - [x] Interview room on `POST /interviews/{id}/turns`: client `turn_id`, retry with backoff, resume after refresh, retry button.
> - [x] Proctoring batched to `POST /interviews/{id}/proctoring` every 5 s; server decides termination; no client auto-end.
> - [x] Tokens: wallet, plans, Razorpay checkout, status polling (webhook grants tokens); no client-side deduction.
> - [x] College-admin console (students + reports, roster CSV, join requests, allowance groups/overrides) and admin console (colleges, grant/revoke, freeze, verify domain, audit + ledger).
> - [x] Sentry (lazy, no PII), security headers in `vercel.json`, CI (lint, typecheck, tests, build, secret grep).
> - [x] Tests: API client, retry, session, CSV parser, proctoring batching.
> - [x] Shortlist UI — `/college → Shortlist`, role picker plus ranked table with integrity
>       in its own column.
> - [x] Server-side record of the proctoring consent — `POST /api/consents` stores kind,
>       version, IP and user agent; `/interviews/start` refuses a proctored session without
>       a current one.
>       Fixing this exposed an ordering bug: the notice was on `/pre-interview` but
>       `/interviews/start` ran one screen earlier on the dashboard, so the first interview
>       would have 403'd before the student ever saw the consent text. The session is now
>       created on `/pre-interview`, after they agree — which also stops a token being
>       reserved for someone who backs out of the checklist.
>
> **Phase 1 gaps closed (2026-11-27, branch `feat/phase1-backend-gaps`):**
> - [x] Consent endpoints, versioned, with the start gate. 20 tests.
> - [x] OTP delivery: Resend for email; MSG91 for SMS behind `SMS_ENABLED=false` until the
>       DLT template is approved. Both still return 503 when a channel is unavailable, and
>       the message says whether it is switched off or misconfigured.
> - [x] TOTP enrolment for admins (`/api/auth/mfa/setup` + `/confirm`), with the enrolment
>       section on `/admin → Security`. Confirming signs the account out everywhere.
> - [x] Confirmed **with tests**, not assertions: CORS reflects only configured origins and
>       never `*`; rate limits on login / OTP / interview start / payments return 429 with
>       `Retry-After`; `/ready` reports the in-memory Redis fallback honestly; resume upload
>       refuses >5 MB (413) and non-document bytes (400) regardless of declared content type.
> - [x] RLS deny-by-default migration `0004` — 32 tables, no policies, `anon` /
>       `authenticated` grants revoked. Not yet applied to Supabase.
> - [x] Backup procedure written into `RUNBOOK.md` (dashboard check + session-pooler
>       `pg_dump` + a verification step, because a truncated dump looks like a backup).
> - [x] Migrations applied to Supabase (2026-11-27, after backup confirmed). `alembic_version`
>       = `0006_fk_covering_indexes`. Applied through the Supabase MCP so no database
>       password had to move through a chat; `alembic_version` set to match so the CLI stays
>       correct. Verified: 8 student wallets / 472 tokens, college pool 457, 7 accounts
>       linked to the college, 6 in the default allowance group, 6 `jd_chunks`, 7 plans.
> - [x] Two gaps found *by verifying* rather than by tests: `students.college_id` was never
>       backfilled (college console would have shown zero students, and nobody could draw
>       from the pool) → `0005`; two unindexed foreign keys → `0006`.
> - [x] Advisors re-run. The 9 ERROR-level `rls_disabled_in_public` findings are gone;
>       `unindexed_foreign_keys` cleared. What remains is INFO-only and deliberately left:
>       `rls_enabled_no_policy` *is* deny-by-default (adding policies would grant the anon
>       key access), and `unused_index` only means no traffic has hit minutes-old indexes.
> - [ ] End-to-end run on Vercel previews.
>
> **Contract audit against backend `chore/project-structure` (2026-11-27): no mismatches.**
> Checked mechanically, not by eye — the committed `src/lib/api/openapi.json` was diffed
> against the live spec from `create_app().openapi()`:
> - 53 paths on each side, identical sets; no method differences on any shared path.
> - `components.schemas` identical: no field-name, extra-field or `required` differences.
> - Declared response status codes identical on every operation.
> - Every hand-written path in `src/services/api.ts` resolves to a real route.
> - The three query-parameter endpoints (`/officer/shortlist?jd_id`,
>   `/super/colleges/{id}/freeze?frozen`, `/officer/enrollment-requests/{id}?approve`)
>   are called with `query:`, not a JSON body — which is what the old `generateShortlist`
>   got wrong and 422'd on.
> - `withRetry` treats 503 as retryable, and is applied only to turn submission, where
>   503 means `LLMBusy` backpressure. The other 503 paths (OTP with no provider,
>   Razorpay unset) are permanent and are not retried.
>
> Nothing to fix here. The two unchecked boxes above are backend gaps, not mismatches.

**1d. Load test**
- k6: 100 concurrent WS interview sessions, ~12 turns each, Groq stubbed and live.
- Expected bottleneck: Groq tokens/min and requests/min on the shared key. Mitigation —
  the semaphore from 1b, a queue with a position estimate, and an explicit
  "interviewer is busy, retry in Ns" state in the UI rather than a silent fallback question.
- Document p50/p95 turn latency, error rate, and the measured ceiling in `RUNBOOK.md`.

**Exit:** all 20 audit items closed or consciously deferred; 100 concurrent sessions
survive with a documented ceiling; both advisors clean.

### Phase 2 — Candidate context

- `services/extraction/`: `pdfplumber` → `pymupdf` fallback for PDF, `python-docx` for
  DOCX, no character truncation (chunked for the LLM instead).
- Structured extraction into a Pydantic `CandidateProfile` (education, skills with the
  claim site, projects with name/stack/role/metrics, experience, achievements, links),
  low temperature, JSON-schema validated, stored as versioned JSONB.
- GitHub: `httpx.AsyncClient` + server PAT (5,000 req/h), top repos by stars and recency,
  languages, commit activity, pinned repos (GraphQL), README summaries; cached in
  `github_snapshots` with ETag and TTL; fully failure-tolerant.
- LeetCode: keep the GraphQL stats call, move to `httpx`, cache, tolerate failure.
- LinkedIn: **no scraping.** Student uploads their "Save to PDF" profile or pastes
  About/Experience; same structured extractor; URL kept as a reference only.
- `candidate_context` builder with an evidence score per skill/project:
  `claimed` (resume only) → `corroborated` (matching repo or stats) → `strong`
  (repo with matching code/commits and a README that backs the claim).
- Consent screen before any link processing; a "here's what we extracted" review screen
  where the student can correct or remove items; corrections write a new profile version.
- **Exit:** a real resume + LinkedIn PDF + GitHub handle produces a reviewed
  `candidate_context` with evidence levels; golden-file tests over 3 anonymised resumes.

### Phase 3 — Adaptive interview engine

New package `engine/`, pure and deterministic — **no network calls inside it**; the LLM is
injected as a question-writer and grader.

```
engine/competency.py   JD → competencies with importance weights (LLM-extracted, cached)
engine/ability.py      per-competency rating + uncertainty, Elo/IRT-style update
engine/selector.py     priority = importance × uncertainty × (1 + claim_gap_bonus) − coverage_penalty
engine/difficulty.py   next difficulty from current ability estimate; 1–2 drill-downs allowed
engine/weights.py      weight = importance × difficulty_mult × type_mult, normalised to 1.0
engine/rubric.py       rubric generated with each question: key points, depth signals, red flags
engine/grading.py      structured grade: correctness, depth, clarity, relevance, evidence quotes
engine/scoring.py      weighted total + per-competency + communication; integrity kept separate
engine/stopping.py     stop when high-importance competencies are below an uncertainty
                       threshold, or the question/time budget is spent
engine/similarity.py   normalised + embedding similarity so no question repeats
engine/trace.py        full decision trace persisted per turn
```

Question types: project deep-dive (grounded in a real repo/project from
`candidate_context`), concept, applied scenario, debugging, system design (role-dependent),
behavioural. Mix driven by role and seniority.

`agents/interview_agent.py` becomes a thin adapter: the engine decides *what and how hard*,
the LLM writes and grades, the agent moves bytes.

- `claim_gap_bonus` targets exactly the brief's bluffing case: strongly claimed, weakly evidenced.
- Grading at low temperature, schema-validated, re-graded once on parse failure, never
  silently defaulted to 70.
- Everything persisted: `interview_questions`, `interview_answers`, `competency_estimates`,
  `interview_plans`.
- **Unit tests with simulated candidates** (strong / weak / bluffing-on-resume-claims) using
  a scripted fake LLM, asserting: strong candidates climb the difficulty ladder; weak ones
  step down and get breadth; bluffers get drilled on claimed-but-unevidenced competencies
  and score below their claims; weights always sum to 1.0; no question repeats; the stopping
  rule fires.
- Report page rebuilt: overall score, per-competency radar, per-question breakdown with
  weight and *why it was asked*, strengths/gaps tied to evidence, integrity shown separately.
- **Exit:** simulated-candidate tests pass; a real interview produces a report that explains
  every question and weight.

### Phase 4 — Proctoring

**Client** (extends `InterviewRoom.tsx`, which I'd first split into hooks — it is 1,129 lines):
- Fullscreen required to start, exit detected and reported.
- `visibilitychange` + `blur`/`focus`, copy/paste/cut/contextmenu blocked in the interview
  area, devtools-open heuristic.
- FaceMesh with `maxNumFaces: 3` → no-face, multiple-faces, head-pose/gaze-away beyond N
  seconds, and face-embedding continuity against a frame captured at start.
- Optional phone detection (MediaPipe Object Detector / COCO-SSD) behind a feature flag.
- Audio: second-voice / long background speech if feasible; mic-muted detection at minimum.
- Throttled to a fixed budget (one inference per ~500 ms, downscaled frames) with a
  "degrade" path: no webcam → session marked **unproctored**, not crashed.

**Server:**
- Every event over the WS → `proctoring_events` (session, type, severity, client and server
  timestamps). The server, not the client, computes the integrity score from thresholds,
  severity and duration, and owns the auto-termination policy. The current client-side
  "5 s without a face ends the interview" becomes a server decision — it is far too
  trigger-happy for a student on a cheap laptop.
- Low-res snapshots **only on violations**, into a private Supabase Storage bucket with a
  short retention and a `pg_cron` purge.
- Integrity score + timeline on the report and the officer dashboard, never folded into the
  technical score.
- Consent screen and DPDP-compliant privacy notice before camera/mic start: what is
  captured, why, retention, who can see it, how to withdraw. Recorded in `consents`.
- **Exit:** events from a real session land server-side; integrity score reproducible from
  the stored events alone; no single noisy signal can fail a candidate.

### Phase 5 — Launch

- Render paid always-on instance (free instances sleep and will kill live interviews),
  health check path, `render.yaml` declaring every env var with `sync: false`, correct
  `DATABASE_URL` (Supabase pooler) and pool sizing.
- `api.placeprepai.fun` with HTTPS and verified `wss://` through it.
- Vercel: `www.placeprepai.fun`, separate preview/production env vars, preview deploys per PR.
- Razorpay: full test-mode E2E pass → live keys; webhook signature verification; refund path documented.
- Supabase: backups verified, PITR considered, migration runbook, key-rotation procedure.
- `RUNBOOK.md`: deploy, rollback, rotate keys, "interviews are failing" / "Groq is rate
  limiting" / "Redis is down" / "payments aren't crediting" playbooks.
- Final E2E: new student signup → resume + LinkedIn PDF → GitHub fetch → consent →
  interview with webcam → proctoring events → report → officer view.

---

## 5. Decisions I need from you

1. **Student signup policy.** The brief says it should work for any student, but
   `/api/auth/register` currently *requires* an enrolled college (and credits/billing hang
   off `colleges.total_credits`). Open self-signup with a free trial, or keep it
   college-gated with an optional public tier? This changes the credit model.
2. **JWT rotation.** Rotating `JWT_SECRET` logs out all 9 live users. Do it immediately, or
   schedule it?
3. **Paid Render instance** (~$7/mo Starter) — costs money, needs your go-ahead.
4. **Redis**: Upstash free tier (serverless, generous) or Render Key Value (paid)? I'd
   pick Upstash to start.
5. **Retrieval**: just populate `jd_chunks` and keep keyword search (free, fixes the dead
   RAG today), or install pgvector + a hosted embedding API (better, small ongoing cost)?
   I'd do the former in Phase 1 and revisit in Phase 3.
6. **`student_credits.updated_at` type fix** — destructive column rewrite on 10 rows. OK?
7. **GitHub PAT** — I need a fine-grained token with public-repo read only, set as a Render
   env var. You create it; I'll never put it in the repo.
8. **Proctoring severity policy** — do you want *any* auto-termination, or only flagging
   with the officer deciding? I'd start with flag-only plus a hard stop on sustained
   multi-face or no-face, and tune from real data.
9. **Snapshot retention** — 7 days? 30? DPDP wants this stated explicitly in the notice.
10. **Repo note:** the local folders (`D:\Backend PlacePrep`, `D:\Frontend Place prep`,
    `~\PlacePrepAI`) point at an older single repo, `Aditya17452/PlacePrepAI`, and
    `D:\Backend PlacePrep` has a damaged git index. I cloned the two canonical repos fresh
    and will work from those. Confirm the old folders are abandoned.

---

## 6. Risks

- **Groq rate limits** are the hard ceiling on concurrency, and Phase 3 increases LLM calls
  per interview (a grading call per answer on top of a question call). Budget this
  explicitly; the queue/backpressure work in Phase 1 is a prerequisite, not a nice-to-have.
- **MediaPipe on low-end laptops** — more models (object detection, face embedding) means
  more CPU during a live interview. Feature flags and a measured frame budget, or proctoring
  will degrade the interview it's protecting.
- **Phase 3 is a rewrite of the scoring behaviour.** Old reports and new reports will not be
  comparable. Version `session_scores` and keep the old renderer for historical sessions.
- **Live data.** 67 sessions and 83 credit transactions exist. Every migration is additive
  or approved; no `DROP` without an explicit yes from you.
- **Secrets.** `JWT_SECRET`, Groq keys, Razorpay keys and the Supabase service role are all
  currently set outside version control (good) but several have insecure defaults in code
  (bad). Phase 1a removes every default and fails startup instead.

---

## 7. Roles, access control, enrollment

### 7.1 Three roles

| Role | Scope |
|---|---|
| `admin` | Platform owner (our team). Colleges CRUD + soft-delete, invite/remove college admins, grant/revoke/adjust college pools with a mandatory reason, set per-student caps, platform analytics, payments, refunds, LLM cost. **TOTP MFA mandatory.** Admin list lives in the DB, bootstrapped once from env, never hard-coded. |
| `college_admin` | Read-only on results, scoped strictly to their own `college_id`: roster, pool balance and history, each student's reports and integrity summary, CSV export. Manages the roster and distributes allowances from the pool. Cannot create tokens, exceed the pool, see other colleges, see direct students, or edit scores. Sees snapshots only if the student's consent covers college sharing. |
| `student` | Own interviews, reports, profile, links, consents, direct plan purchases. `college_id` set (enrolled) or NULL (direct). |

### 7.2 Enforcement

- JWT carries **user ID + token version only**. Role and `college_id` are read from the DB
  on every request; a stale or tampered claim cannot escalate.
- Token version lets us invalidate a user's sessions on role change, password reset or revoke.
- Every college-scoped query filters on the caller's DB `college_id`, never a request value.
- Supabase RLS deny-by-default on all public tables.
- `api_audit_log` records every admin and college_admin action, every token movement, and
  every report view by a college admin.
- Frontend guards are UX only. The backend is the authority.

### 7.3 Enrollment — typing an email is never proof

In order of preference:

1. **Roster (default, works for every college).** College admin uploads CSV/XLSX
   (enrollment no., name, batch/branch, email and/or mobile). A student joins only if their
   **verified** email or mobile matches a roster row — OTP/magic link to that email, SMS OTP
   to that mobile, code entered. Rows carry a `valid_until` (batch end); expired or
   deactivated rows lose pool access automatically.
2. **Institutional domain (opt-in per college).** Admin adds the exact domain after
   confirming ownership (DNS TXT check preferred, else written confirmation). Students
   verify by OTP/magic link to that mailbox, or Google sign-in where the server checks the
   verified `hd` claim **and** `email_verified` — not an email suffix. Optionally still
   require a roster match or approval queue, because alumni keep mailboxes.
3. **Join code.** Never sufficient alone. Only together with a roster match or a
   college-admin approval queue.

Hard rules: lookalike domains can never be self-added, only exact admin-configured ones;
OTP rate-limited per email/phone/IP, 10-minute expiry, single use, max 5 attempts;
one person = one account (unique verified email **and** unique verified mobile);
a student who leaves keeps their account and personal wallet, and their college history
stays visible to that college per retention policy.

---

## 8. Tokens — one token = one interview

### 8.1 Model

```
token_wallets    id, owner_type ('student'|'college'), owner_id, balance, updated_at
token_lots       id, wallet_id, source ('grant'|'purchase'), qty, remaining,
                 expires_at, payment_id, created_at          -- FIFO by earliest expiry
token_ledger     id, wallet_id, lot_id, kind, amount, reason, actor_id,
                 session_id, payment_id, created_at          -- APPEND ONLY
```

`kind` is one of: grant, purchase, reserve, consume, release, refund, expire, revoke, adjust.
Balance = sum of the ledger, cached on the wallet row and written **in the same transaction**
under `SELECT ... FOR UPDATE`. DB check constraint `balance >= 0`.

### 8.2 Consumption lifecycle

- **Reserve** 1 token in the same transaction that creates the interview session.
  Order: college pool (if enrolled, college active, within per-student allowance) then personal wallet.
  Never trust the client.
- **Consume** at 3 answered questions or 5 minutes, whichever comes first.
- **Release** automatically before that threshold if the session dies on our side
  (LLM/STT outage, server error).
- After the threshold, quitting consumes the token.
- Abuse limits: max 2 automatic releases per student per day; one active interview per
  student at a time; platform hard cap on interviews per student per day (admin-set per
  college, default 3) regardless of allowance.
- Expiry: college pool tokens 12 months from grant, direct plan tokens per plan validity,
  FIFO by earliest expiry, notify 7 days before.

### 8.3 College distribution — the pool is the only source

Nothing is ever copied into student wallets. Allowances are **limits, not reservations**;
the sum of allowances may exceed the pool, and tokens leave the pool only on consume.

- **Allowance groups** built from roster filters (e.g. "Final year CSE 2027") with a
  per-student allowance (e.g. 10/month, or 20 for the term). Default group for every
  college: **4 per student per month**.
- **Drives** — time-boxed extra allowance for a named student list, optionally with a
  custom JD attached (e.g. "TCS drive prep: +5 until 15 Jan").
- **Individual top-up** with a reason.
- Pool below 10% or exhausted: notify college admin and admin; students see
  "college quota exhausted" and can buy a direct plan.
- Every allowance change goes to `api_audit_log`. Admin can override or freeze a college's
  distribution.

### 8.4 Free tier for direct students — 2 interviews, lifetime

- Granted only after **email verification AND phone OTP**. One free grant per verified
  phone number, ever.
- Disposable email domains blocked; signups rate-limited per IP and device fingerprint;
  shared device/phone accounts flagged.
- Free interviews are **full** interviews. The downloadable PDF report is paid-only.

### 8.5 Payments

- `plans` table (code, price_paise incl. GST, tokens, validity_days, active) is the source
  of truth. The client sends **only a plan code** — never a price.
- Razorpay order created server-side. Tokens granted **only** from the verified
  `payment.captured` webhook, signature checked, idempotent on a unique `payment_id`.
  The client-side verify call shows status and nothing else.
- Refunds admin-initiated; revokes unused tokens from that purchase lot.
- GST invoice per purchase (number series; GSTIN once registered).
- Colleges pay by invoice/bank transfer — admin records payment and grants the pool.
  Optional Razorpay payment link for small colleges.

---

## 9. Pricing (seeded into `plans`, changeable without a deploy)

**Direct students** — prices include 18% GST:

| Plan | Price | Tokens | Validity |
|---|---|---|---|
| Free | Rs 0 | 2 | lifetime, verified phone required |
| Starter | Rs 149 | 5 | 60 days |
| Pro *(recommended)* | Rs 449 | 20 | 180 days |
| Placement Season | Rs 999 | 50 | 365 days |

**Colleges** — plus GST, pool valid 12 months:

| Plan | Tokens | Price | Per token |
|---|---|---|---|
| Free pilot | 100 | Rs 0 (30 days, one per college) | — |
| Pilot | 500 | Rs 7,500 | Rs 15 |
| Campus | 2,500 | Rs 30,000 | Rs 12 |
| Campus Pro | 6,000 | Rs 60,000 | Rs 10 |
| University | 15,000+ | custom | floor Rs 9 |

**Guardrail:** an admin metric `cost per interview` = (`llm_usage` + fixed infra) / interviews.
Alert above 40% of the lowest per-token price (Rs 9). **Do not launch the Rs 10 and Rs 9
tiers until measured cost per interview is below Rs 5.**

---

## 10. LLM layer — models and cost tracking

`llama-3.3-70b-versatile` and `llama-3.1-8b-instant` are now Enterprise / Contact Sales on
Groq. Self-serve production defaults:

| Task | Model | Price (per 1M tokens) |
|---|---|---|
| Question writing, grading, extraction, final evaluation | `openai/gpt-oss-120b` | $0.15 in / $0.60 out |
| Cheap tasks (filler analysis, live tips) | `openai/gpt-oss-20b` | $0.075 / $0.30 |
| Speech-to-text | `whisper-large-v3-turbo` | $0.04 / audio hour |

- Model ID configurable **per task** in `core/llm.py`, not one global constant.
- Browser STT preferred when available; Whisper is the fallback.
- Before switching production: run the Phase 3 simulated-candidate tests **and** 10 real
  transcripts through both models and compare grading agreement. Keep Llama as a fallback
  only while our key still has access.
- `llm_usage` table logs tokens in/out and STT seconds per interview, so cost per interview
  is measured, not estimated. This feeds the §9 guardrail.

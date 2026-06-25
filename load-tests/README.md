# Research load tests

These scripts use [k6](https://k6.io/) to simulate participant traffic against the research runner APIs.

Use only with a disposable test study slug. These tests create real Supabase runtime rows: sessions, tokens, task runs, flow step runs, screen events, and completion records.

## Recommended prep

1. Use a test study, for example `ai-support`.
2. Make sure the study is active in Sanity.
3. Make sure at least one variant has a prototype task in Study Flow or Legacy tasks.
4. Clear old runtime rows before and after the test.

```sql
select public.clear_research_runtime_data('ai-support');
```

## Install k6

macOS:

```bash
brew install k6
```

Windows:

```powershell
winget install k6 --source winget
```

## Smoke test first

```bash
BASE_URL=https://www.farhanje.com \
STUDY_SLUG=ai-support \
k6 run load-tests/research-smoke.js
```

Default smoke shape:

- ramps to 2 virtual users
- then 5 virtual users
- finishes in about 1 minute

## Stress test

```bash
BASE_URL=https://www.farhanje.com \
STUDY_SLUG=ai-support \
CLICKS_PER_TASK=5 \
THINK_TIME_SECONDS=1 \
k6 run load-tests/research-stress.js
```

Default stress shape:

- 25 users
- 50 users
- 100 users
- 150 users
- ramp down

Do not jump to 500 or 1,000 users until the 100–150 user run is stable.

## What the script does

Each virtual participant:

1. Calls `/api/research/start` with a unique device ID.
2. Calls `/api/research/config`.
3. Finds the assigned variant and first prototype task.
4. Starts the task.
5. Sends several click events.
6. Completes the task.
7. Completes the session.

## Pass criteria

Good enough for internal testing:

- `http_req_failed` below 2–3%.
- p95 under 1.5–2 seconds.
- no obvious Supabase connection errors.
- no Vercel 5xx spike.

## Watch during the test

- Vercel Functions logs.
- Supabase database CPU.
- Supabase database connections.
- Supabase API errors.
- Supabase table row growth.

## Cleanup after test

```sql
select public.clear_research_runtime_data('ai-support');
```

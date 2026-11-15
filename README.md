# Smart Attendance

Mobile-first attendance management for CSE-4B, with teacher-confirmed biometric recognition review.

## Run locally

1. Copy `.env.example` to `.env` and set `JWT_SECRET` and `DEV_SEED_PASSWORD`.
2. Create the MySQL database `smart_attendance` and provide its `DATABASE_URL` (or run `docker compose up -d mysql`).
3. Run `npm run db:migrate`, then `npm run db:seed`.
4. Run `npm run dev`.

The initial seed is idempotent. It creates CSE-4B (Semester 4, Section B), Teacher1's class-teacher and AIML Lab assignments, twelve fictional demo students, B2 BATCH enrollments, biometric enrollment metadata, and one sample confirmed lab session.

Set `RECOGNITION_PROVIDER=demo` for the manual placeholder workflow. It performs no recognition and is explicitly not AI inference. Set `RECOGNITION_PROVIDER=fastapi` only after configuring and verifying the separate Python service; see [DEMO and FASTAPI modes](docs/demo-recognition.md).

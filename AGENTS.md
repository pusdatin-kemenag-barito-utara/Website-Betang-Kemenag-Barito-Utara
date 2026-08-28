# SI BETANG - Architecture Guidelines

Repositori ini menggunakan arsitektur monorepo:
- **Frontend** (`frontend/`): Astro v7 (SSR mode: standalone) + React Islands + Tailwind CSS v4.
- **Backend** (`backend/`): Go (Fiber v3) + PostgreSQL (pgx v5) + Supabase Auth.

Jangan gunakan konvensi Next.js lama karena codebase telah di-rewrite penuh ke Astro dan Go.

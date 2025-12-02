# Repository Guidelines

## Project Structure & Module Organization
- Back end: Django project in `Back-End/backend` with apps such as `accounts`, `invoices`, and `airflow_integration`. Management entrypoint is `Back-End/manage.py`.
- Front end: React app in `Front-End/my-react-app` (Vite-based). Static assets live under `public` and React source under `src`.
- Docker: `docker-compose.yaml` orchestrates services; each side also has its own `Dockerfile`.

## Build, Test, and Development Commands
- Backend setup:  
  - `cd Back-End`  
  - `python -m venv .venv && source .venv/bin/activate`  
  - `pip install -r requirements.txt`
- Run backend: `cd Back-End && python manage.py runserver`.
- Backend tests: `cd Back-End && python manage.py test accounts`.
- Frontend install: `cd Front-End/my-react-app && npm install`.
- Frontend dev server: `cd Front-End/my-react-app && npm run dev`.
- Frontend build: `cd Front-End/my-react-app && npm run build`.

## Coding Style & Naming Conventions
- Python: follow PEP 8, 4-space indentation, snake_case for functions/variables, PascalCase for classes. Keep Django apps modular; group logic into `models.py`, `views.py`, `serializers.py`, `signals.py`, and `tests.py`.
- JavaScript/TypeScript: use ES modules, functional React components, and hooks. Prefer descriptive names (`InvoiceListPage`, `useAuth`) over abbreviations.
- Linting: use ESLint via `cd Front-End/my-react-app && npm run lint`. Keep changes passing lint and backend tests.

## Testing Guidelines
- Primary tests live in app-level `tests.py` (for example `Back-End/accounts/tests.py`).
- Write tests for new views, serializers, and signals before or alongside code. Use Django’s `TestCase` and factory-style helpers where possible.
- Run `python manage.py test` in `Back-End` before opening a PR. For frontend changes, at minimum run `npm run lint`.

## Commit & Pull Request Guidelines
- Commits: use clear, imperative subjects (e.g., `Add invoice PDF export`, `Fix account signup validation`). Group related changes into a single commit when reasonable.
- Pull requests: include a short summary, implementation notes, and how to reproduce/test. Link related issues and attach screenshots or GIFs for UI changes.

## Agent-Specific Instructions
- Prefer minimal, focused diffs and avoid drive-by refactors.
- Align new code with the existing structure of the relevant Django app or React feature.
- After changes, run the most specific relevant backend tests and `npm run lint` for frontend work.

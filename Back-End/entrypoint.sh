#!/usr/bin/env bash
set -euo pipefail

# Run migrations and collect static assets before starting the app.
until python manage.py migrate --noinput; do
  echo "Waiting for database to be ready..."
  sleep 5
done

python manage.py collectstatic --noinput

exec gunicorn backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --threads "${GUNICORN_THREADS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"

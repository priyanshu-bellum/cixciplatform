# CIXCI Platform — Developer Makefile

.PHONY: help up down backend frontend migrate createsuperuser test shell

help:
	@echo "CIXCI Platform dev commands:"
	@echo ""
	@echo "--- NO DOCKER (local dev, SQLite) ---"
	@echo "  make dev            — Run backend with SQLite (no Docker needed)"
	@echo "  make dev-migrate    — Apply all migrations to local SQLite"
	@echo "  make dev-superuser  — Create admin@cixci.com (local SQLite)"
	@echo "  make dev-test       — Run all backend tests (local SQLite)"
	@echo ""
	@echo "--- WITH DOCKER (postgres + redis) ---"
	@echo "  make up             — Start Postgres and Redis (docker compose)"
	@echo "  make down           — Stop all services"
	@echo "  make migrate        — Run Django migrations (Postgres)"
	@echo "  make superuser      — Create CIXCI System Admin (Postgres)"
	@echo "  make test           — Run backend tests (Postgres)"
	@echo "  make shell          — Django shell (Postgres)"
	@echo "  make frontend       — Start React dev server"

dev:
	cd backend && python manage.py runserver --settings=config.settings_local

dev-migrate:
	cd backend && python manage.py migrate --settings=config.settings_local

dev-superuser:
	cd backend && python manage.py shell --settings=config.settings_local -c "from apps.tenant.models import User; User.objects.filter(email='admin@cixci.com').exists() or User.objects.create_superuser(email='admin@cixci.com', password='cixci1234', is_cixci_admin=True); print('Done.')"

dev-test:
	cd backend && python -m pytest apps/ -v --settings=config.settings_local

up:
	docker compose up -d db redis
	@echo "Postgres and Redis running. Start backend with: make backend"

down:
	docker-compose down

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

migrate:
	cd backend && python manage.py migrate

superuser:
	cd backend && python manage.py createsuperuser --email admin@cixci.com

test:
	cd backend && python -m pytest apps/ -v

shell:
	cd backend && python manage.py shell

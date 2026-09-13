.PHONY: up down restart logs test migrate migration lock reset ps shell-db shell-api

up:            ## Start the whole project
	docker compose up --build

down:          ## Stop
	docker compose down

restart:       ## Restart
	docker compose restart

logs:          ## Logs of all services
	docker compose logs -f

test:          ## Run backend tests
	docker compose exec backend pytest

migrate:       ## Apply migrations manually
	docker compose exec backend alembic upgrade head

migration:     ## Create a migration: make migration m="description"
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

lock:          ## Recompute uv.lock after changing dependencies
	cd backend && uv lock

reset:         ## Tear everything down, including the database and files
	docker compose down -v

ps:            ## Container status
	docker compose ps

shell-db:      ## psql in the database container
	docker compose exec db psql -U vision -d vision_tasks

shell-api:     ## Shell in the backend container
	docker compose exec backend bash

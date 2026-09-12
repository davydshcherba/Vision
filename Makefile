.PHONY: up down restart logs test migrate migration lock reset ps shell-db shell-api

up:            ## Підняти весь проєкт
	docker compose up --build

down:          ## Зупинити
	docker compose down

restart:       ## Перезапустити
	docker compose restart

logs:          ## Логи всіх сервісів
	docker compose logs -f

test:          ## Прогнати тести бекенду
	docker compose exec backend pytest

migrate:       ## Накатити міграції вручну
	docker compose exec backend alembic upgrade head

migration:     ## Створити міграцію: make migration m="опис змін"
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

lock:          ## Перерахувати uv.lock після зміни залежностей
	cd backend && uv lock

reset:         ## Знести все разом з базою і файлами
	docker compose down -v

ps:            ## Статус контейнерів
	docker compose ps

shell-db:      ## psql у контейнері бази
	docker compose exec db psql -U vision -d vision_tasks

shell-api:     ## Термінал у контейнері бекенду
	docker compose exec backend bash

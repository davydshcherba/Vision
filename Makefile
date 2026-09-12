.PHONY: up down restart logs seed test migrate migration reset ps shell-db shell-api

up:            ## Підняти весь проєкт
	docker compose up --build

down:          ## Зупинити
	docker compose down

restart:       ## Перезапустити
	docker compose restart

logs:          ## Логи всіх сервісів
	docker compose logs -f

seed:          ## Наповнити базу тестовими задачами
	docker compose exec backend python seed.py

test:          ## Прогнати тести бекенду
	docker compose exec backend python -m pytest

migrate:       ## Накатити міграції вручну
	docker compose exec backend alembic upgrade head

migration:     ## Створити міграцію: make migration m="опис змін"
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

reset:         ## Знести все разом з базою і файлами
	docker compose down -v

ps:            ## Статус контейнерів
	docker compose ps

shell-db:      ## psql у контейнері бази
	docker compose exec db psql -U vision -d vision_tasks

shell-api:     ## Термінал у контейнері бекенду
	docker compose exec backend bash

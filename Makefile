.PHONY: up help down restart logs ps build pull clean-images clean-all ports frontend-install front

up:
	docker compose up -d --build
	@$(MAKE) --no-print-directory ports

help:
	@echo "make up            - docker compose up -d --build"
	@echo "make down          - docker compose down"
	@echo "make restart       - docker compose down && up"
	@echo "make logs          - docker compose logs -f"
	@echo "make ps            - docker compose ps"
	@echo "make build         - docker compose build"
	@echo "make pull          - docker compose pull"
	@echo "make clean-images  - docker compose down --rmi all --remove-orphans"
	@echo "make clean-all     - docker compose down --rmi all -v --remove-orphans"
	@echo "make ports         - แสดงสรุปพอร์ตของทุก service"
	@echo "make frontend-install - ติดตั้ง package ของ frontend (cbt-lms)"
	@echo "make front         - รัน backend ด้วย docker + รัน frontend local (hot reload)"

down:
	docker compose down

restart: down up

re: restart

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build

pull:
	docker compose pull

clean-images:
	docker compose down --rmi all --remove-orphans

clean-all:
	docker compose down --rmi all -v --remove-orphans

ports:
	@FRONTEND_PORT=$$(grep -E '^FRONTEND_PORT=' .env | tail -n1 | cut -d '=' -f2-); \
	API_PORT=$$(grep -E '^API_PORT=' .env | tail -n1 | cut -d '=' -f2-); \
	POSTGRES_PORT=$$(grep -E '^POSTGRES_PORT=' .env | tail -n1 | cut -d '=' -f2-); \
	PGADMIN_PORT=$$(grep -E '^PGADMIN_PORT=' .env | tail -n1 | cut -d '=' -f2-); \
	echo ""; \
	echo "Service Ports"; \
	echo "-------------"; \
	echo "React App   : http://localhost:$$FRONTEND_PORT"; \
	echo "Fiber API   : http://localhost:$$API_PORT"; \
	echo "Swagger UI  : http://localhost:$$API_PORT/swagger"; \
	echo "Swagger Spec: http://localhost:$$API_PORT/openapi.yaml"; \
	echo "PostgreSQL  : localhost:$$POSTGRES_PORT"; \
	echo "pgAdmin     : http://localhost:$$PGADMIN_PORT"; \
	echo ""

frontend-install:
	bash ./scripts/frontend-setup.sh

front:
	@FRONTEND_PORT=$$(grep -E '^FRONTEND_PORT=' .env | tail -n1 | cut -d '=' -f2-); \
	VITE_API_BASE_URL=$$(grep -E '^VITE_API_BASE_URL=' .env | tail -n1 | cut -d '=' -f2-); \
	if [ -z "$$FRONTEND_PORT" ]; then FRONTEND_PORT=5173; fi; \
	echo ">> Start backend services (postgres, pgadmin, fiber-api) via docker..."; \
	docker compose up -d postgres postgres-ui fiber-api; \
	echo ">> Stop docker frontend container (if running) to avoid port conflict..."; \
	docker compose stop react-app >/dev/null 2>&1 || true; \
	echo ">> Run frontend locally on http://localhost:$$FRONTEND_PORT"; \
	cd cbt-lms && VITE_API_BASE_URL="$$VITE_API_BASE_URL" npm run dev -- --host 0.0.0.0 --port $$FRONTEND_PORT

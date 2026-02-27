.PHONY: up help down restart logs ps build pull clean-images clean-all ports frontend-install

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

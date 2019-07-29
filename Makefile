export FOOD_PORT ?= 3000

DOCKER_COMPOSE=docker-compose -f docker-compose.yml
DOCKER_COMPOSE_DEV=$(DOCKER_COMPOSE) -f dev.docker-compose.yml

build: Dockerfile package.json
	$(DOCKER_COMPOSE) build node

start: build
	$(DOCKER_COMPOSE) up

start-dev: build
	$(DOCKER_COMPOSE_DEV) up

start-daemon: build
	$(DOCKER_COMPOSE) up -d

restart:
	$(DOCKER_COMPOSE) restart

stop:
	$(DOCKER_COMPOSE) stop

npm-build:
	$(DOCKER_COMPOSE) exec node npm run build

ssh-node:
	$(DOCKER_COMPOSE) exec node sh

ssh-redis:
	$(DOCKER_COMPOSE) exec redis sh

trigger-rebuild: stop start-daemon

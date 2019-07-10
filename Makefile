export FOOD_PORT ?= 3000

build: Dockerfile package.json
	docker-compose build node

start: build
	docker-compose up

start-daemon: build
	docker-compose up -d

restart:
	docker-compose restart

stop:
	docker-compose stop

npm-build:
	docker-compose exec node npm run build

ssh-node:
	docker-compose exec node sh

ssh-redis:
	docker-compose exec redis sh

trigger-rebuild: stop start-daemon

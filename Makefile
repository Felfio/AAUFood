export FOOD_PORT ?= 3000

start:
	docker-compose up --build

start-daemon:
	docker-compose up --build -d

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

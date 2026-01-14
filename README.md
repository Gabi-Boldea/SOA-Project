# SOA Assignment

# SOA Project (Node.js) — Microservices + Nginx LB + RabbitMQ + Kafka + FaaS + Micro-frontends

This repository contains a distributed system implementing:
- Secured REST (Auth service issues JWT)
- API Gateway (JWT verification, forwards user id downstream)
- Task Service (REST API, load-balanced via Nginx)
- Notification Service (Socket.IO notifications)
- RabbitMQ (message broker)
- Kafka (event streaming)
- FaaS function service (HTTP function used by Task Service)
- Micro-frontend UI (Shell + Tasks widget + Notifications widget)

## Architecture
Client (Shell MFE) calls:
- REST via Nginx: `http://localhost:3010/api/...`
- Socket.IO via Nginx: `http://localhost:3010/socket.io/`

Nginx load-balances Task Service instances and proxies Socket.IO to the notification service.

## Prerequisites
- Node.js (v18+ recommended; works with newer versions)
- Docker Desktop (for RabbitMQ/Kafka/Nginx if you containerize them)
- npm

## Ports
- Nginx LB: 3010
- API Gateway: 3000
- Auth service: 3001
- Task service: 3002 (instance A) and 3005 (instance B)
- Notification service: 3003
- FaaS function: 4010
- RabbitMQ: 5672 (AMQP), 15672 (UI)
- Kafka: 9092, Zookeeper: 2181
- Shell MFE: 5173
- mf-tasks: 5174
- mf-notifications: 5175

## Run (dev)
Open multiple terminals and start each service:

### 1) Infrastructure
Start RabbitMQ + Kafka (and any other infra you have compose for):
- RabbitMQ UI: http://localhost:15672 (guest/guest)

### 2) Backend services
In separate terminals:
- `auth-service`: `npm start`
- `api-gateway`: `npm start`
- `task-service` (A): `npm start`
- `task-service` (B): run with `PORT=3005 INSTANCE_ID=B npm start`
- `notification-service`: `npm start`
- `faas-function`: `npm start`

### 3) Nginx
Use `nginx.conf` to run the load balancer on port 3010.

### 4) Frontend (micro-frontends)
In separate terminals:
- `shell`: `npm run dev`
- `mf-tasks`: `npm run dev`
- `mf-notifications`: `npm run dev`

Open: http://localhost:5173

## Quick verification
### RabbitMQ evidence
Queue `task_events` shows publish/deliver/ack.

### Kafka evidence
Topic `task-events` contains JSON events like `task.created`.

### FaaS evidence
`POST http://localhost:4010/generate-summary` returns `{ summary, at }` and task creation stores `summary`.

### Notifications evidence
Create a task in the UI → notification appears in Notifications widget.

## Notes
- The Task service currently expects `x-user-id` header (in dev). If routed through the API Gateway, the gateway can inject this header after verifying the JWT.

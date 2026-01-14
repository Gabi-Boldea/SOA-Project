# SOA Assignment

## Microservices + Nginx LB + RabbitMQ + Kafka + FaaS + Micro-frontends

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

### Architecture overview
This diagram shows how the micro-frontends, Nginx load balancer, backend services, and messaging/eventing components interact.

```mermaid
flowchart LR
  user((User)) --> shell[Shell MFE :5173]
  shell --> mf_tasks[mf-tasks MFE :5174]
  shell --> mf_notif[mf-notifications MFE :5175]

  mf_tasks -->|REST| nginx[Nginx LB :3010]
  mf_notif -->|Socket.IO| nginx

  nginx -->|/api/auth/*| api_gateway[API Gateway :3000]
  nginx -->|/api/* or /tasks| taskA[Task Service A :3002]
  nginx -->|/api/* or /tasks| taskB[Task Service B :3005]
  nginx -->|/socket.io/*| notif_service[Notification Service :3003]

  api_gateway -->|proxy| auth_service[Auth Service :3001]
  api_gateway -->|proxy| taskA
  api_gateway -->|proxy| taskB

  taskA -->|HTTP call| faas[FaaS Function :4010]
  taskB -->|HTTP call| faas

  taskA -->|publish| rabbit[(RabbitMQ :5672)]
  taskB -->|publish| rabbit
  rabbit -->|consume| notif_service

  taskA -->|produce| kafka[(Kafka :9092)]
  taskB -->|produce| kafka
  analytics[Analytics Service] -->|consume| kafka

### Sequence (Create task → FaaS → RabbitMQ/Kafka → Notifications)

This sequence shows the main user flow: creating a task calls a FaaS function to generate a summary, then emits events to RabbitMQ and Kafka, and finally notifies the UI via Socket.IO.

```mermaid
sequenceDiagram
  participant UI as Shell/mf-tasks
  participant N as Nginx (3010)
  participant GW as API Gateway (3000)
  participant TS as Task Service (3002/3005)
  participant F as FaaS (4010)
  participant R as RabbitMQ (5672)
  participant NS as Notification Service (3003)
  participant UI2 as mf-notifications

  UI->>N: POST /api/tasks (Bearer JWT)
  N->>GW: forward /api/tasks
  GW->>TS: forward + inject x-user-id
  TS->>F: POST /generate-summary {title}
  F-->>TS: {summary}
  TS-->>GW: 201 Created {task+summary}
  GW-->>N: 201 Created
  N-->>UI: 201 Created

  TS->>R: publish task.created
  R-->>NS: deliver task.created
  NS-->>UI2: socket emit "notification"

  TS->>kafka: produce task.created
  
## C4 models

### C4 Level 1 — System Context
Shows the system as a black box and the main external dependencies.

```mermaid
flowchart TB
  user((User)) --> system[SOA Assignment System]
  system --> rabbit[(RabbitMQ)]
  system --> kafka[(Kafka)]

### C4 Level 2 — Containers
Shows the main deployable units (frontends, gateway, services, infra).

flowchart LR
  user((User)) --> shell[Web App (Micro-frontends)]
  shell --> nginx[Nginx LB]
  nginx --> gw[API Gateway]
  gw --> auth[Auth Service]
  gw --> tasks[Task Service (scaled)]
  nginx --> notif[Notification Service (Socket.IO)]
  tasks --> rabbit[(RabbitMQ)]
  tasks --> kafka[(Kafka)]
  tasks --> faas[FaaS Function]
  kafka --> analytics[Analytics Service]

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

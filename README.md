# Backend Submission

Repository contents:

```
.
├── logging_middleware/             reusable Log() package, used by both services
├── vehicle_maintence_scheduler/    Q1 - knapsack-based daily maintenance planner
├── notification_app_be/            Q2 Stage 6 - Priority Inbox API
├── notification_system_design.md   Q2 Stages 1-5 + 6 design write-up
├── TEST.md                         curl / Postman commands for capturing screenshots
└── .gitignore
```

Each microservice follows the layered pattern:

```
<service>/
├── routes/         URL -> controller wiring
├── controllers/    request / response handling, calls service
├── services/       business logic (knapsack, priority scoring)
├── models/         data layer - calls upstream evaluation API
├── middleware/     error handler, etc.
├── utils/          pure helpers (heap, knapsack DP)
├── app.js          entry point
└── package.json
```

## Local setup

Each microservice is a standalone Express app. The logging middleware is consumed by relative `require('../logging_middleware/src')`.

```
cd logging_middleware     && npm install
cd ../vehicle_maintence_scheduler && npm install
cp .env.example .env      # fill in credentials from /register + /auth
node app.js               # http://localhost:3000

cd ../notification_app_be && npm install
cp .env.example .env
node app.js               # http://localhost:3001
```

## Endpoints

**vehicle_maintence_scheduler** (port 3000)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/schedule`                | Optimal task subset for every depot |
| GET  | `/api/schedule/:depotId`       | Optimal subset for one depot |
| POST | `/api/schedule/custom`         | Custom budget: body `{ "budget": 100 }` |

**notification_app_be** (port 3001)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/notifications`               | All notifications (raw) |
| GET | `/api/notifications/priority?n=10` | Top-N priority inbox (placement > result > event, then recency) |

## Logging

`Log(stack, level, package, message)` - every controller, service, and the error-handling middleware in both apps call it. No `console.log` is used in request paths.

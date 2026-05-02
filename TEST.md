# Testing reference

Use these to capture the request body / response / response time screenshots required by the brief. Postman or Insomnia is fine; curl works too.

## 0. Get a token (one time)

```bash
# Register (only once - save clientID / clientSecret)
curl -X POST http://20.207.122.201/evaluation-service/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<your-college-email>",
    "name": "<your-name>",
    "mobileNo": "<10-digit>",
    "githubUsername": "<github-username>",
    "rollNo": "RA2311030010236",
    "accessCode": "<accessCode-from-email>"
  }'

# Authenticate (whenever the token expires)
curl -X POST http://20.207.122.201/evaluation-service/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<your-college-email>",
    "name": "<your-name>",
    "rollNo": "RA2311030010236",
    "accessCode": "<accessCode-from-email>",
    "clientID": "<from-register>",
    "clientSecret": "<from-register>"
  }'
```

Drop the `clientID` / `clientSecret` etc into both `.env` files. The logging middleware uses them to fetch and cache the bearer token automatically.

## 1. Vehicle Maintenance Scheduler

Start it: `cd vehicle_maintence_scheduler && npm install && node app.js` (port 3000).

```bash
# All depots planned
curl http://localhost:3000/api/schedule

# One depot
curl http://localhost:3000/api/schedule/2

# Custom budget
curl -X POST http://localhost:3000/api/schedule/custom \
  -H "Content-Type: application/json" \
  -d '{ "budget": 50 }'

# Health
curl http://localhost:3000/health
```

Capture screenshots of:
- Request body (for the POST)
- Response JSON (showing `totalImpact`, `totalDurationUsed`, the `tasks` array)
- Response time (Postman shows it in the bottom-right; Insomnia in the timeline)

## 2. Notifications - Priority Inbox (Stage 6)

Start it: `cd notification_app_be && npm install && node app.js` (port 3001).

```bash
# Raw notifications (for sanity)
curl http://localhost:3001/api/notifications

# Top-10 priority inbox
curl "http://localhost:3001/api/notifications/priority?n=10"

# Top-5
curl "http://localhost:3001/api/notifications/priority?n=5"
```

Screenshot the priority response - placements should rank above results, results above events, with newer items winning ties inside the same type.

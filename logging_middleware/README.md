# Logging Middleware

Reusable logging package. Calls the Test Server `/logs` API and is consumed by both microservices in this repo.

## Use

```js
const { Log } = require('../logging_middleware/src')

await Log('backend', 'error', 'handler', 'received string, expected bool')
```

## Required environment variables

```
LOG_EMAIL=
LOG_NAME=
LOG_ROLL_NO=
LOG_ACCESS_CODE=
LOG_CLIENT_ID=
LOG_CLIENT_SECRET=
```

These are obtained via the registration + auth flow described in the assessment brief. Token caching and a single 401 retry are handled internally so callers just call `Log(...)`.

## Allowed values

- `stack`: backend, frontend
- `level`: debug, info, warn, error, fatal
- `package` (backend): cache, controller, cron_job, db, domain, handler, repository, route, service, auth, config, middleware, utils

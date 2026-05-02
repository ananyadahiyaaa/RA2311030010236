# Campus Notifications - System Design

A campus notification platform that pushes real-time updates for **Placements**, **Events** and **Results** to students. This document covers Stages 1 through 6.

---

## Stage 1

### Core actions the platform supports

- Fetch a student's notifications (with filters: type, read/unread, pagination)
- Mark one or many notifications as read
- Push a notification to one student or to all students (HR / admin path)
- Receive notifications in real time over a persistent connection
- Manage per-student preferences (mute placement / event / result, etc.)

### REST endpoints

Base path: `/api/v1`. Authentication is assumed (per the brief).

| Method | URL | Purpose |
|---|---|---|
| GET    | `/notifications`                               | List notifications for the calling student |
| GET    | `/notifications/:id`                           | Single notification |
| PATCH  | `/notifications/:id/read`                      | Mark one as read |
| PATCH  | `/notifications/read`                          | Bulk mark-as-read |
| POST   | `/notifications`                               | Create a notification (admin / HR) |
| POST   | `/notifications/broadcast`                     | "Notify all" (admin / HR) |
| GET    | `/notifications/preferences`                   | Read calling student's prefs |
| PUT    | `/notifications/preferences`                   | Update calling student's prefs |
| GET    | `/notifications/stream`                        | Real-time stream (SSE / WebSocket) |

### JSON contracts

**`GET /notifications?status=unread&type=placement&limit=20&cursor=<opaque>`**

Response 200:
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Result",
      "message": "mid-sem",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ],
  "nextCursor": "eyJpZCI6Li4ufQ=="
}
```

**`POST /notifications`** (admin)
```json
{
  "studentIds": [1042, 1043],
  "type": "Placement",
  "message": "CSX Corporation hiring"
}
```
Response 201:
```json
{ "createdIds": ["b283218f-ea5a-4b7c-93a9-1f2f240d64b0"] }
```

**`POST /notifications/broadcast`** (admin "Notify All")
```json
{ "type": "Placement", "message": "CSX Corporation hiring", "audience": "ALL" }
```
Response 202:
```json
{ "broadcastId": "br_8721", "estimatedRecipients": 50000, "status": "QUEUED" }
```

### Headers

Every request:
```
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>
```

### Real-time mechanism

- Default: **WebSocket** at `wss://.../api/v1/notifications/stream`. The connection is authenticated on upgrade with the bearer token; the server then pushes `{event: "notification.created", payload: {...}}` frames whenever a notification targets that student.
- Fallback for restricted clients: **Server-Sent Events** at the same path with `Accept: text/event-stream`.
- A pub/sub layer (Redis pub/sub or NATS) sits behind both transports so any backend pod can publish and every connected pod sees it.

---

## Stage 2

### Storage choice: PostgreSQL

Picked **PostgreSQL** because:

- Notifications are highly relational (notification belongs to student, student has prefs, broadcast has many recipients).
- We need durable per-row state (`is_read`), filterable queries (by type / time / read flag) and consistent counts ("unread = N").
- ACID is useful when "create notification + push to delivery queue" must succeed or fail together.
- JSONB gives us a soft-schema escape hatch for type-specific payload fields without an extra table.

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id           BIGSERIAL PRIMARY KEY,
    roll_no      TEXT UNIQUE NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    message           TEXT NOT NULL,
    payload           JSONB,
    is_read           BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at           TIMESTAMPTZ
);

CREATE TABLE notification_preferences (
    student_id     BIGINT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    mute_event     BOOLEAN NOT NULL DEFAULT false,
    mute_result    BOOLEAN NOT NULL DEFAULT false,
    mute_placement BOOLEAN NOT NULL DEFAULT false,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broadcasts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        notification_type NOT NULL,
    message     TEXT NOT NULL,
    created_by  BIGINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Queries (one per Stage 1 endpoint)

`GET /notifications?status=unread&type=placement&limit=20`
```sql
SELECT id, notification_type, message, created_at, is_read
FROM   notifications
WHERE  student_id = $1
  AND  ($2::notification_type IS NULL OR notification_type = $2)
  AND  ($3::boolean IS NULL OR is_read = $3)
ORDER  BY created_at DESC
LIMIT  $4;
```

`GET /notifications/:id`
```sql
SELECT id, notification_type, message, payload, is_read, created_at, read_at
FROM   notifications
WHERE  id = $1 AND student_id = $2;
```

`PATCH /notifications/:id/read`
```sql
UPDATE notifications
SET    is_read = true, read_at = now()
WHERE  id = $1 AND student_id = $2 AND is_read = false
RETURNING id;
```

`PATCH /notifications/read` (bulk)
```sql
UPDATE notifications
SET    is_read = true, read_at = now()
WHERE  student_id = $1 AND id = ANY($2::uuid[]) AND is_read = false;
```

`POST /notifications` (admin, targeted)
```sql
INSERT INTO notifications (student_id, notification_type, message, payload)
SELECT unnest($1::bigint[]), $2, $3, $4
RETURNING id;
```

`POST /notifications/broadcast` - register the broadcast, then a worker fans out:
```sql
INSERT INTO broadcasts (id, type, message, created_by)
VALUES ($1, $2, $3, $4);

-- worker, called per chunk of student ids
INSERT INTO notifications (student_id, notification_type, message)
SELECT id, $1, $2 FROM students WHERE id = ANY($3::bigint[])
ON CONFLICT (broadcast_id, student_id) DO NOTHING;
```

`GET /notifications/preferences`
```sql
SELECT mute_event, mute_result, mute_placement
FROM   notification_preferences
WHERE  student_id = $1;
```

`PUT /notifications/preferences`
```sql
INSERT INTO notification_preferences
       (student_id, mute_event, mute_result, mute_placement, updated_at)
VALUES ($1, $2, $3, $4, now())
ON CONFLICT (student_id) DO UPDATE SET
    mute_event     = EXCLUDED.mute_event,
    mute_result    = EXCLUDED.mute_result,
    mute_placement = EXCLUDED.mute_placement,
    updated_at     = now();
```

Unread badge count (cheap path - read from cached column):
```sql
SELECT unread_count FROM students WHERE id = $1;
```

### Problems as data volume grows

- **Hot table**: notifications grow unbounded; sequential scans on `WHERE student_id = ? AND is_read = false` get slow.
- **VACUUM pressure**: heavy `UPDATE`s on `is_read` produce dead tuples and bloat.
- **Broadcast write amplification**: a single "Notify All" with 50k students writes 50k rows in one transaction.
- **Hot count**: "how many unread?" is a count over a growing partition.

### Mitigations

- Index `(student_id, is_read, created_at DESC)` - covers the unread query path.
- Partition `notifications` by `created_at` (monthly). Old partitions can be detached / archived to cold storage.
- Replace the count query with a cached `unread_count` column on `students`, maintained by a trigger or by application code.
- For broadcasts: insert into a `broadcasts` row, then enqueue a background job that fans out in batches of ~5k inserts.

---

## Stage 3

### Is the original query accurate? Why is it slow?

```sql
SELECT * FROM notifications
WHERE  studentID = 1042 AND isRead = false
ORDER  BY createdAt DESC;
```

- It is **functionally** correct but **operationally** wrong:
    - `SELECT *` pulls every column including any large `payload` JSONB, blowing up bytes-on-wire and buffer cache.
    - No `LIMIT` - on a student with thousands of unread items the server materialises and sorts the lot.
    - With 5,000,000 rows and no supporting composite index, the planner falls back to a sequential scan + on-disk sort.

### What I would change

```sql
SELECT id, notification_type, message, created_at
FROM   notifications
WHERE  student_id = 1042 AND is_read = false
ORDER  BY created_at DESC
LIMIT  20;
```

Plus the index:
```sql
CREATE INDEX idx_notifications_student_unread_created
    ON notifications (student_id, created_at DESC)
    WHERE is_read = false;
```

A **partial index** on `is_read = false` is small (only the unread subset) and the planner uses it directly for the predicate above. Cost drops from O(N) seq-scan + sort to O(log N) index scan + a bounded heap read for the 20 returned rows.

### "Add an index on every column" - effective?

No.

- Every index has to be maintained on every `INSERT`, `UPDATE`, `DELETE`. Indexing 10 columns roughly multiplies write cost.
- Indexes consume disk and buffer cache.
- The planner only uses indexes that match the actual query shape; a single-column index on `message` does nothing for our predicate.
- Indexes should be designed against **observed query patterns** (composite, partial, covering), not column lists.

### Placement notifications in the last 7 days

```sql
SELECT DISTINCT n.student_id
FROM   notifications n
WHERE  n.notification_type = 'Placement'
  AND  n.created_at >= now() - INTERVAL '7 days';
```

Supporting index:
```sql
CREATE INDEX idx_notifications_type_created
    ON notifications (notification_type, created_at DESC);
```

If a single student can receive many placement notifications in the window, `DISTINCT` removes the duplicates. For very large result sets, prefer `EXISTS`-based deduplication via a subquery or aggregate to avoid a hash-distinct.

---

## Stage 4

### Symptom

Every page load triggers a fresh DB read for unread notifications. With 50k students concurrent during placement / results season, the `notifications` table is read-saturated.

### Solution stack

1. **Cache the unread inbox per student in Redis** (`notif:unread:<studentId>`) with a short TTL (~30s) and an explicit invalidation when a write occurs (new notification, mark-as-read). The cache stores the small, paginated JSON the API would have returned.
2. **HTTP caching** - the API returns `Cache-Control: private, max-age=15` and an `ETag` derived from `(unread_count, max(created_at))`. Browser repeats with `If-None-Match` and we 304 cheaply.
3. **Push, don't poll** - a connected WebSocket means the client knows when something changed and only refetches on a push event, eliminating "page load = DB read" entirely.
4. **CQRS-style read model** - a denormalised `unread_count` column on `students` (maintained by trigger) lets the badge render without touching `notifications`.
5. **Read replicas** - point list endpoints at a Postgres read replica; writes still go to primary.

### Tradeoffs

| Strategy | Pro | Con |
|---|---|---|
| Redis cache | Massive read offload | Cache invalidation logic; brief staleness |
| HTTP cache + ETag | Free, no infra changes | Per-user variance (`Vary`) limits CDN reuse |
| WebSocket push | Best UX, lowest read load | Sticky sessions / pub-sub fan-out cost |
| `unread_count` column | O(1) badge query | One more thing to keep consistent |
| Read replicas | Horizontal scale on reads | Replication lag (read-your-write hazards) |

In practice we'd ship (1) + (3) first (Redis + WebSocket) and add (2) and (4) as the metrics demand.

---

## Stage 5

### Shortcomings of the original `notify_all`

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # in-app push
```

- **Synchronous loop of 50k students** - the request blocks until the last student is processed, the HTTP call probably times out and the HR user gets no feedback.
- **A single `send_email` failure (network blip, rate limit) breaks the loop** so subsequent students never get notified.
- **No idempotency** - if HR retries because they didn't see a response, students get duplicate emails.
- **Email + DB insert + push happen in the same call path** but they're independent failure domains. If the email API is down, do we want to skip persistence too?
- **No batching** - 50k synchronous network calls + 50k single-row inserts is brutal on both the email vendor and Postgres.
- **No backpressure / observability** - no per-student status, no rate limiting, no progress.

### When the email step fails for 200 students

We need to be able to **answer who succeeded and who didn't, and retry only the failures**. That is structurally impossible with the original code. We need a job model with persisted per-recipient state.

### Should "save to DB" and "send email" run together?

**No.** The DB row is the source of truth that the notification *exists*. Email and in-app push are *delivery channels* that may fail or be retried independently. Persist first, then dispatch async per channel.

### Revised pseudocode

```python
def notify_all(student_ids, message, type, requested_by):
    # 1. Persist the broadcast intent atomically and return fast
    broadcast_id = uuid()
    db.execute("""
        INSERT INTO broadcasts (id, type, message, created_by, created_at)
        VALUES (%s, %s, %s, %s, now())
    """, [broadcast_id, type, message, requested_by])

    # 2. Fan out into a durable queue in batches (chunks of ~1000)
    for chunk in batched(student_ids, size=1000):
        queue.publish("notification.deliver", {
            "broadcast_id": broadcast_id,
            "student_ids":  chunk,
            "type":         type,
            "message":      message
        })

    return {"broadcast_id": broadcast_id, "status": "QUEUED"}


# Background workers consume "notification.deliver" - one per channel.
def worker_persist(msg):
    db.execute("""
        INSERT INTO notifications (id, student_id, notification_type, message)
        SELECT gen_random_uuid(), unnest(%s::bigint[]), %s, %s
        ON CONFLICT (broadcast_id, student_id) DO NOTHING
    """, [msg.student_ids, msg.type, msg.message])

def worker_email(msg):
    for sid in msg.student_ids:
        try:
            email_api.send(sid, msg.message)
            db.execute("UPDATE delivery SET status='SENT' WHERE broadcast_id=%s AND student_id=%s",
                       [msg.broadcast_id, sid])
        except RetryableError:
            queue.publish_delayed("notification.deliver.email.retry", {...}, delay=backoff(attempt))
        except FatalError as e:
            db.execute("UPDATE delivery SET status='FAILED', error=%s WHERE ...", [str(e), ...])

def worker_push(msg):
    realtime.publish_to_students(msg.student_ids, msg.payload())
```

Key properties:

- **Sub-second response** to the HR user; the broadcast is immediately durable.
- **Per-student state** in a `delivery` table - we can retry only failed rows.
- **Idempotency** via `(broadcast_id, student_id)` unique constraint prevents duplicate emails on retry.
- **Independent channels** - a flaky email vendor doesn't stop the in-app push.
- **Backpressure** comes for free from the queue - workers consume at the rate they can.

---

## Stage 6 - Priority Inbox

Implementation lives in `notification_app_be/`. Highlights:

- **Score**: `priorityScore(notif) = TYPE_WEIGHT[type] * 1e12 + epoch_seconds(timestamp)`.
    - `TYPE_WEIGHT = { placement: 3, result: 2, event: 1 }` per the spec ("placement > result > event").
    - The `1e12` scale guarantees type strictly outranks recency, so a brand-new event will never beat an older placement.
- **Top-N maintenance**: a fixed-capacity **min-heap** of size `n` (`utils/minHeap.js`).
    - Stream-style: `push()` is O(log n). When full and the incoming score beats the current min, swap and sift down; otherwise drop.
    - Total cost over `N` total notifications: **O(N log n)** - independent of the table size when `n` is small.
    - Memory is O(n), not O(N).
- This same code path works whether we hand the heap a finite list (current API call) or fed it from a WebSocket stream of incoming notifications - the heap just keeps the live top-N.
- API: `GET /api/notifications/priority?n=10` returns the top `n` ranked highest first.

### Why a heap and not "sort the whole list"?

- Sorting is O(N log N) and uses O(N) extra memory.
- Heap is O(N log n) and O(n) extra memory; for `n=10` and `N=5_000_000`, that's a ~17x CPU win and a 500_000x memory win.
- Sorting also can't process a stream incrementally - the heap can.

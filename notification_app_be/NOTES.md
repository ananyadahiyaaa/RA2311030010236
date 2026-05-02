# notes

quick scratch notes while building stage 6.

- priority = type weight first, then recency
- placement(3) > result(2) > event(1)
- using a min-heap of size n so we don't sort everything when N is huge
- score formula: w * 1e12 + epoch_seconds (the 1e12 just makes type dominate, no math meaning)

things I might come back to:
- pagination on /priority? for now n is capped at 100, good enough
- websocket push for live updates (mentioned in design doc stage 1)
- if same notification arrives twice (retry), dedupe by ID -> need a Set

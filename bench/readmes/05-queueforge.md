# queueforge

A job queue for Python on top of Postgres. Jobs are rows; workers claim them with `SELECT ... FOR UPDATE SKIP LOCKED`.

```python
from queueforge import Queue

q = Queue("postgresql://localhost/app")

@q.task(retries=3)
def send_email(user_id): ...

send_email.delay(42)
```

Run workers with `queueforge work --queues default`.

## Guarantees

At-least-once delivery. A job that raises is retried with exponential backoff, then moved to `dead`. Tasks must be idempotent.

## Not included

No scheduler, no web UI, no result backend. Use cron for schedules.

## Benchmarks

On a 4-core laptop: about 2,400 jobs/second with 8 workers. Script in `bench/`.

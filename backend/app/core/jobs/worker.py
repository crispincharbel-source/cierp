"""
CI ERP — Standalone Background Worker Process

Usage
-----
    # Inside Docker container:
    python -m app.core.jobs.worker

    # Or via docker-compose:
    docker-compose run --rm backend python -m app.core.jobs.worker

    # Or as a separate service (recommended for production):
    # See docker-compose.worker.yml

Environment variables used
--------------------------
    DATABASE_URL   — PostgreSQL connection string
    REDIS_URL      — Redis connection string (falls back to in-memory if absent)
    TENANT_ID      — Tenant to process jobs for (default: cierp)
    ENVIRONMENT    — production | development
    LOG_LEVEL      — DEBUG | INFO | WARNING (default: INFO)
    WORKER_POLL    — Poll interval seconds (default: 2.0)

What it does
------------
- Connects to Redis (or falls back to in-memory queue)
- Runs JobWorker.run() in an asyncio event loop
- Handles SIGTERM/SIGINT for graceful shutdown
- Logs structured JSON to stdout
- Can be horizontally scaled (multiple worker containers)

Job types handled
-----------------
    send_email       — SMTP email dispatch
    generate_pdf     — ReportLab PDF generation
    process_payroll  — Payroll batch processing
    export_report    — CSV/PDF report export
    notify           — In-app notifications
    sync_data        — Background data synchronisation
"""
import asyncio
import logging
import os
import signal
import sys

# ── Bootstrap path ─────────────────────────────────────────────────────────────
# Allow running as: python -m app.core.jobs.worker from /backend directory
if __name__ == "__main__":
    import pathlib
    backend_root = str(pathlib.Path(__file__).parent.parent.parent.parent)
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)


def _setup_logging():
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )


def _get_settings():
    from app.core.config import settings
    return settings


async def _run_worker(tenant_id: str, poll_interval: float):
    from app.core.jobs_impl import JobWorker

    worker = JobWorker(tenant_id=tenant_id, poll_interval=poll_interval)

    loop = asyncio.get_running_loop()

    # Graceful shutdown on SIGTERM / SIGINT
    def _stop(*_):
        logging.getLogger("cierp.worker").info("Shutdown signal received — stopping worker...")
        worker.stop()

    loop.add_signal_handler(signal.SIGTERM, _stop)
    loop.add_signal_handler(signal.SIGINT,  _stop)

    await worker.run()


def main():
    _setup_logging()
    logger = logging.getLogger("cierp.worker")

    settings = _get_settings()
    tenant_id    = settings.TENANT_ID
    poll_interval = float(os.environ.get("WORKER_POLL", "2.0"))

    logger.info(
        f"CI ERP Background Worker starting — "
        f"tenant={tenant_id}  env={settings.ENVIRONMENT}  poll={poll_interval}s"
    )

    try:
        asyncio.run(_run_worker(tenant_id, poll_interval))
    except KeyboardInterrupt:
        logger.info("Worker stopped by keyboard interrupt.")
    finally:
        logger.info("Worker process exited.")


if __name__ == "__main__":
    main()

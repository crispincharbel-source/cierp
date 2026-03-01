"""
CI ERP — Background Jobs package

Entry point for the standalone worker process:
    python -m app.core.jobs.worker

Or import the core queue helpers directly:
    from app.core.jobs import enqueue_job, JobType, JobWorker
"""
# Re-export everything from the main jobs module for backward compatibility
from app.core.jobs_impl import (  # noqa: F401
    enqueue_job,
    get_job_status,
    get_dead_letters,
    retry_dead_letter,
    JobWorker,
    JobType,
    JobStatus,
    enqueue_email,
    enqueue_pdf,
)

"""
CI ERP — Jobs API
Endpoints to inspect job status, dead-letters, and trigger retries.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import require_auth, require_superadmin
from app.modules.identity.models import User
from app.core.jobs import get_job_status, get_dead_letters, retry_dead_letter, enqueue_job, JobType

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.get("/status/{job_id}")
async def job_status(job_id: str, user: User = Depends(require_auth)):
    """Check status of a background job."""
    job = await get_job_status(job_id, user.tenant_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/dead-letters")
async def dead_letters(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_superadmin),
):
    """List dead-lettered jobs (exhausted all retries)."""
    items = await get_dead_letters(user.tenant_id, limit=limit)
    return {"items": items, "total": len(items)}


@router.post("/dead-letters/{job_id}/retry")
async def retry_dead(job_id: str, user: User = Depends(require_superadmin)):
    """Re-enqueue a dead-lettered job for another attempt."""
    ok = await retry_dead_letter(job_id, user.tenant_id)
    if not ok:
        raise HTTPException(404, "Dead-letter job not found")
    return {"status": "re-enqueued", "job_id": job_id}


@router.post("/test")
async def enqueue_test_job(user: User = Depends(require_superadmin)):
    """Enqueue a test notification job (dev/testing only)."""
    job_id = await enqueue_job(
        JobType.NOTIFY,
        {"user_id": user.id, "message": "Test job from CI ERP", "level": "info"},
        tenant_id=user.tenant_id,
        user_id=user.id,
    )
    return {"job_id": job_id, "status": "enqueued"}

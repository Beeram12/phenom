"""
Food Events API.

Receives user-interaction events from the food-ordering frontend over REST, validates them
against the event contract (app/event_schemas.py), and publishes them to Kafka.
Invalid events are published to the dead-letter topic with the validation error.
The service is stateless: it has no database.
"""
import logging
from typing import Optional
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app import config
from app.event_schemas import EVENT_REGISTRY, validate_event
from app.producer import EventProducer, FileProducer

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("events-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if config.KAFKA_BOOTSTRAP_SERVERS:
        app.state.producer = EventProducer()
        log.info("Kafka producer connected to %s", config.KAFKA_BOOTSTRAP_SERVERS)
    else:
        app.state.producer = FileProducer(config.EVENTS_FILE)
        log.warning("KAFKA_BOOTSTRAP_SERVERS is not set; writing events to %s",
                    config.EVENTS_FILE)
    yield
    app.state.producer.flush()  # deliver anything still queued before shutdown


app = FastAPI(title="Food Events API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])


def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    """Reject requests that do not carry the shared API key."""
    if x_api_key != config.API_KEY:
        raise HTTPException(401, "Invalid or missing X-API-Key")


def _format_error(e: Exception) -> str:
    """Flatten a validation error into a single readable line."""
    if isinstance(e, ValidationError):
        return "; ".join(f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                         for err in e.errors())
    return str(e)


def _process(producer, raw) -> tuple[bool, Optional[str]]:
    """
    Validate one event and publish it. Invalid events are sent to the DLQ
    (never dropped silently). Returns (accepted, error_reason).
    """
    try:
        if not isinstance(raw, dict):
            raise ValueError("Event must be a JSON object")
        event, topic, key = validate_event(raw)
        producer.send(topic, key, event)
        return True, None
    except Exception as e:
        reason = _format_error(e)
        producer.send(config.TOPIC_DLQ, None, {
            "reason": reason,
            "raw": raw,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        return False, reason


@app.get("/health")
def health():
    """Liveness check. `kafka` is false when running in file-output mode."""
    return {"status": "ok", "kafka": bool(config.KAFKA_BOOTSTRAP_SERVERS)}


@app.get("/api/v1/event-types", dependencies=[Depends(require_api_key)])
def event_types():
    """List every supported event type with its topic and payload JSON schema."""
    return {name: {"topic": topic, "payload_schema": model.model_json_schema()}
            for name, (model, topic) in EVENT_REGISTRY.items()}


@app.post("/api/v1/events", status_code=202, dependencies=[Depends(require_api_key)])
async def ingest_one(request: Request):
    """Ingest a single event. Returns 422 with the reason if it is invalid."""
    raw = await request.json()
    ok, reason = _process(request.app.state.producer, raw)
    if not ok:
        raise HTTPException(422, reason)
    return {"accepted": 1}


@app.post("/api/v1/events/batch", status_code=202, dependencies=[Depends(require_api_key)])
async def ingest_batch(request: Request):
    """
    Ingest a batch of events: `{"events": [...]}`.
    Valid events are accepted even if others in the batch are rejected.
    """
    body = await request.json()
    events = body.get("events") if isinstance(body, dict) else body
    if not isinstance(events, list):
        raise HTTPException(400, 'Request body must be {"events": [...]}')
    if len(events) > config.MAX_BATCH_SIZE:
        raise HTTPException(413, f"Maximum {config.MAX_BATCH_SIZE} events per batch")

    errors = []
    for i, raw in enumerate(events):
        ok, reason = _process(request.app.state.producer, raw)
        if not ok:
            errors.append({"index": i, "reason": reason})
    return {"accepted": len(events) - len(errors), "rejected": len(errors), "errors": errors}

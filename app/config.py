"""
Application configuration.

All settings are read from environment variables (optionally loaded from a local `.env`
file). Empty values fall back to the defaults below.
"""
import os
from pathlib import Path

# Project root (the folder containing app/, scripts/, .env and ca.pem).
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _path(value: str) -> str:
    """Resolve a relative file path against the project root, so scripts work from any directory."""
    if not value:
        return value
    p = Path(value)
    return str(p if p.is_absolute() else PROJECT_ROOT / p)


try:
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:  # python-dotenv is optional; plain environment variables still work
    pass

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
# Shared secret the frontend sends in the `X-API-Key` header.
API_KEY = os.getenv("API_KEY") or "dev-key-change-me"

# Allowed browser origins for CORS (comma-separated). "*" allows any origin.
CORS_ORIGINS = [o.strip() for o in (os.getenv("CORS_ORIGINS") or "*").split(",")]

# Maximum number of events accepted in a single batch request.
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE") or "100")

# ---------------------------------------------------------------------------
# Kafka
# ---------------------------------------------------------------------------
# When empty, events are written to EVENTS_FILE instead of Kafka (local development mode).
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
EVENTS_FILE = _path(os.getenv("EVENTS_FILE") or "events_out.jsonl")

# Only required for managed/hosted Kafka clusters.
KAFKA_SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL", "")  # e.g. SASL_SSL
KAFKA_SASL_MECHANISM = os.getenv("KAFKA_SASL_MECHANISM", "")        # e.g. PLAIN, SCRAM-SHA-256
KAFKA_SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME", "")
KAFKA_SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD", "")
# Path to the cluster's CA certificate (required by Aiven and most managed services).
KAFKA_SSL_CA_LOCATION = _path(os.getenv("KAFKA_SSL_CA_LOCATION", ""))

# ---------------------------------------------------------------------------
# Topics (shared contract with the aggregation layer)
# ---------------------------------------------------------------------------
# Each name can be overridden via environment variables to match an existing cluster setup.
TOPIC_USER = os.getenv("TOPIC_USER") or "events.user"
TOPIC_BROWSE = os.getenv("TOPIC_BROWSE") or "events.browse"
TOPIC_CART = os.getenv("TOPIC_CART") or "events.cart"
TOPIC_PAYMENT = os.getenv("TOPIC_PAYMENT") or "events.payment"
TOPIC_ORDER = os.getenv("TOPIC_ORDER") or "events.order"
TOPIC_REVIEW = os.getenv("TOPIC_REVIEW") or "events.review"
TOPIC_DLQ = os.getenv("TOPIC_DLQ") or "events.dlq"  # dead-letter queue for invalid events

# If set, every valid event is published to this single topic instead of the per-domain
# topics above (consumers then filter on `event_type`). The DLQ topic is unaffected.
KAFKA_SINGLE_TOPIC = os.getenv("KAFKA_SINGLE_TOPIC", "")

if KAFKA_SINGLE_TOPIC:
    ALL_TOPICS = [KAFKA_SINGLE_TOPIC, TOPIC_DLQ]
else:
    ALL_TOPICS = [TOPIC_USER, TOPIC_BROWSE, TOPIC_CART, TOPIC_PAYMENT,
                  TOPIC_ORDER, TOPIC_REVIEW, TOPIC_DLQ]


def kafka_client_config() -> dict:
    """Build the librdkafka client configuration shared by producer, consumer and admin clients."""
    conf = {"bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS}
    if KAFKA_SECURITY_PROTOCOL:
        conf["security.protocol"] = KAFKA_SECURITY_PROTOCOL
    if KAFKA_SASL_MECHANISM:
        conf["sasl.mechanism"] = KAFKA_SASL_MECHANISM
        conf["sasl.username"] = KAFKA_SASL_USERNAME
        conf["sasl.password"] = KAFKA_SASL_PASSWORD
    if KAFKA_SSL_CA_LOCATION:
        conf["ssl.ca.location"] = KAFKA_SSL_CA_LOCATION
    return conf

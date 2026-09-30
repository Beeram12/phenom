"""
Verify the Kafka connection end to end: connect, list topics, produce one test message
and wait for the broker acknowledgement.

Usage:
    python scripts/check_kafka.py
"""
import json
import sys
from datetime import datetime, timezone

from confluent_kafka import Producer

sys.path.insert(0, ".")
from app import config  # noqa: E402

if not config.KAFKA_BOOTSTRAP_SERVERS:
    sys.exit("KAFKA_BOOTSTRAP_SERVERS is not set. Configure it in .env first.")

print("Connecting to", config.KAFKA_BOOTSTRAP_SERVERS)
producer = Producer(config.kafka_client_config())
try:
    md = producer.list_topics(timeout=15)
except Exception as e:
    sys.exit(f"FAILED to connect: {e}\nCheck host/port, username/password and the CA certificate path.")

print(f"OK: connected ({len(md.brokers)} brokers)")
user_topics = sorted(t for t in md.topics if not t.startswith("_"))
print("Topics:", ", ".join(user_topics) or "(none)")

missing = [t for t in config.ALL_TOPICS if t not in md.topics]
if missing:
    sys.exit(f"Missing topics: {', '.join(missing)}. Run: python scripts/create_topics.py")

result = {}
producer.produce(config.TOPIC_DLQ, value=json.dumps({
    "reason": "connectivity_check", "raw": None,
    "received_at": datetime.now(timezone.utc).isoformat()}).encode(),
    on_delivery=lambda err, msg: result.update(err=err, msg=msg))
producer.flush(15)
if result.get("err") or "msg" not in result:
    sys.exit(f"FAILED to produce test message: {result.get('err')}")
m = result["msg"]
print(f"OK: test message written to {m.topic()} [partition {m.partition()}, offset {m.offset()}]")

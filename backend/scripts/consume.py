"""
Tail one or more Kafka topics and pretty-print incoming events.
Useful for verifying that events are reaching Kafka.

Usage:
    python scripts/consume.py                          # all topics
    python scripts/consume.py events.order events.dlq  # specific topics
"""
import json
import sys

from confluent_kafka import Consumer

sys.path.insert(0, ".")
from app import config  # noqa: E402

if not config.KAFKA_BOOTSTRAP_SERVERS:
    sys.exit("KAFKA_BOOTSTRAP_SERVERS is not set. Configure it in .env first.")

topics = sys.argv[1:] or config.ALL_TOPICS
conf = config.kafka_client_config()
conf.update({"group.id": "debug-tail", "auto.offset.reset": "earliest"})

consumer = Consumer(conf)
consumer.subscribe(topics)
print("Listening on:", ", ".join(topics))
try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print("Error:", msg.error())
            continue
        key = msg.key().decode() if msg.key() else None
        print(f"\n[{msg.topic()}] key={key}")
        print(json.dumps(json.loads(msg.value()), indent=2))
except KeyboardInterrupt:
    pass
finally:
    consumer.close()

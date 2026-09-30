"""
Event sinks.

`EventProducer` publishes to Kafka. `FileProducer` is a drop-in replacement used when no
Kafka cluster is configured, so the API can be developed and tested without a broker.
Both expose the same `send()` / `flush()` interface.
"""
import json
import logging
from typing import Optional

from confluent_kafka import Producer

from app import config

log = logging.getLogger("producer")


class EventProducer:
    """Thin wrapper around the confluent-kafka Producer that serialises events as JSON."""

    def __init__(self):
        conf = config.kafka_client_config()
        conf.update({
            "acks": "all",                # wait for all in-sync replicas (no silent data loss)
            "enable.idempotence": True,   # broker-side dedupe of producer retries
            "linger.ms": 20,              # small batching window for higher throughput
        })
        self._producer = Producer(conf)
        self._check_topics()

    def _check_topics(self) -> None:
        """Verify connectivity at startup and warn about topics that do not exist yet."""
        try:
            existing = set(self._producer.list_topics(timeout=10).topics)
        except Exception as e:
            log.error("Could not reach Kafka at %s: %s", config.KAFKA_BOOTSTRAP_SERVERS, e)
            return
        missing = [t for t in config.ALL_TOPICS if t not in existing]
        if missing:
            log.warning("Missing topics (run scripts/create_topics.py): %s", ", ".join(missing))
        else:
            log.info("Connected to Kafka; all %d topics exist", len(config.ALL_TOPICS))

    @staticmethod
    def _on_delivery(err, msg):
        if err:
            log.error("Delivery failed: topic=%s error=%s", msg.topic(), err)

    def send(self, topic: str, key: Optional[str], value: dict) -> None:
        """Queue one event for asynchronous delivery to `topic`."""
        data = json.dumps(value, default=str).encode()
        encoded_key = key.encode() if key else None
        try:
            self._producer.produce(topic, key=encoded_key, value=data,
                                   on_delivery=self._on_delivery)
        except BufferError:
            # Local send queue is full: let in-flight messages drain, then retry once.
            self._producer.poll(1)
            self._producer.produce(topic, key=encoded_key, value=data,
                                   on_delivery=self._on_delivery)
        self._producer.poll(0)  # serve pending delivery callbacks without blocking

    def flush(self, timeout: float = 5.0) -> int:
        """Block until queued messages are delivered; returns the number still pending."""
        return self._producer.flush(timeout)


class FileProducer:
    """Development fallback: logs each event and appends it to a JSON Lines file."""

    def __init__(self, path: str):
        self._file = open(path, "a", encoding="utf-8")

    def send(self, topic: str, key: Optional[str], value: dict) -> None:
        line = json.dumps({"topic": topic, "key": key, "value": value}, default=str)
        self._file.write(line + "\n")
        self._file.flush()
        log.info("[%s] %s key=%s", topic, value.get("event_type", "invalid_event"), key)

    def flush(self, timeout: float = 5.0) -> int:
        self._file.flush()
        return 0

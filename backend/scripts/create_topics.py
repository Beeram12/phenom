"""
Create all event topics on the configured Kafka cluster (idempotent; existing topics are skipped).
Managed Kafka services such as Aiven disable topic auto-creation, so run this once per cluster.

Usage:
    python scripts/create_topics.py [--partitions 3] [--replication N]

By default the replication factor is min(3, number of brokers).
"""
import argparse
import sys

from confluent_kafka.admin import AdminClient, NewTopic

sys.path.insert(0, ".")
from app import config  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("--partitions", type=int, default=3)
parser.add_argument("--replication", type=int, default=None)
args = parser.parse_args()

if not config.KAFKA_BOOTSTRAP_SERVERS:
    sys.exit("KAFKA_BOOTSTRAP_SERVERS is not set. Configure it in .env first.")

admin = AdminClient(config.kafka_client_config())
try:
    metadata = admin.list_topics(timeout=15)
except Exception as e:
    sys.exit(f"Could not connect to Kafka: {e}")

replication = args.replication or min(3, len(metadata.brokers))
print(f"Connected. Brokers: {len(metadata.brokers)}, replication factor: {replication}")

existing = set(metadata.topics)
new_topics = [NewTopic(t, args.partitions, replication)
              for t in config.ALL_TOPICS if t not in existing]

if not new_topics:
    print("All topics already exist.")
for topic, future in admin.create_topics(new_topics).items():
    try:
        future.result()
        print("Created", topic)
    except Exception as e:
        print("Failed to create", topic, "-", e)

"""
Event contract.

Every event is a common envelope (id, type, timestamps, user, session, city) plus an
event-specific payload. This module defines both, maps each event type to its Kafka topic,
and enriches valid events with server-side metadata.

Schema evolution: payload models allow extra fields, so producers can add new fields without
breaking validation or downstream consumers. Only the required fields are enforced.
Events that fail validation are routed to the dead-letter topic by the API layer.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app import config


class Loose(BaseModel):
    """Base payload model that keeps unknown fields (forward-compatible schemas)."""

    model_config = ConfigDict(extra="allow")


# ---------------------------------------------------------------------------
# Shared payload components
# ---------------------------------------------------------------------------
class OrderItem(Loose):
    item_id: str
    name: str
    category: Optional[str] = None
    unit_price: float = Field(ge=0)
    quantity: int = Field(ge=1)


class ItemRating(Loose):
    item_id: str
    rating: int = Field(ge=1, le=5)


# ---------------------------------------------------------------------------
# User / session events
# ---------------------------------------------------------------------------
class UserRegister(Loose):
    method: Literal["email", "phone", "google"] = "phone"


class UserLogin(Loose):
    method: Literal["email", "phone", "google"] = "phone"


class SessionStarted(Loose):
    entry_point: str = "home"
    referrer: Optional[str] = None


# ---------------------------------------------------------------------------
# Browsing events
# ---------------------------------------------------------------------------
class RestaurantViewed(Loose):
    restaurant_id: str
    restaurant_name: Optional[str] = None
    cuisine: Optional[str] = None


class PriceFilterApplied(Loose):
    min_price: float = Field(ge=0)
    max_price: float = Field(ge=0)
    category: Optional[str] = None
    restaurant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Cart events
# ---------------------------------------------------------------------------
class CartItemChange(Loose):
    item_id: str
    restaurant_id: str
    unit_price: float = Field(ge=0)
    quantity: int = Field(ge=1)
    name: Optional[str] = None
    category: Optional[str] = None


class CheckoutStarted(Loose):
    restaurant_id: str
    item_count: int = Field(ge=1)
    cart_value: float = Field(ge=0)
    order_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Payment events
# ---------------------------------------------------------------------------
class PaymentSuccess(Loose):
    order_id: str
    payment_id: str
    amount: float = Field(ge=0)
    method: str                       # upi | card | cod | wallet
    restaurant_id: Optional[str] = None


class PaymentFailed(Loose):
    order_id: Optional[str] = None
    amount: float = Field(ge=0)
    method: str
    reason: str                       # e.g. declined, timeout, insufficient_funds
    restaurant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Order lifecycle events
# ---------------------------------------------------------------------------
class OrderCreated(Loose):
    order_id: str
    restaurant_id: str
    items: List[OrderItem] = Field(min_length=1)
    subtotal: float = Field(ge=0)
    discount: float = Field(default=0, ge=0)
    total: float = Field(ge=0)
    currency: str = "INR"
    order_type: Literal["delivery", "pickup", "dine_in"] = "delivery"
    promised_eta_min: Optional[int] = Field(default=None, ge=1)


class OrderDelivered(Loose):
    order_id: str
    restaurant_id: str
    promised_eta_min: Optional[int] = Field(default=None, ge=1)
    actual_delivery_min: Optional[int] = Field(default=None, ge=1)


class OrderCancelled(Loose):
    order_id: str
    restaurant_id: str
    reason: str
    cancelled_by: Literal["user", "restaurant", "system"] = "user"


# ---------------------------------------------------------------------------
# Review events
# ---------------------------------------------------------------------------
class ItemReviewed(Loose):
    order_id: str
    restaurant_id: str
    overall_rating: int = Field(ge=1, le=5)
    item_ratings: List[ItemRating] = []
    tags: List[str] = []
    comment: Optional[str] = None


# event_type -> (payload model, Kafka topic)
EVENT_REGISTRY = {
    "user_register":          (UserRegister, config.TOPIC_USER),
    "user_login":             (UserLogin, config.TOPIC_USER),
    "session_started":        (SessionStarted, config.TOPIC_USER),
    "restaurant_viewed":      (RestaurantViewed, config.TOPIC_BROWSE),
    "price_filter_applied":   (PriceFilterApplied, config.TOPIC_BROWSE),
    "item_added_to_cart":     (CartItemChange, config.TOPIC_CART),
    "item_removed_from_cart": (CartItemChange, config.TOPIC_CART),
    "checkout_started":       (CheckoutStarted, config.TOPIC_CART),
    "payment_success":        (PaymentSuccess, config.TOPIC_PAYMENT),
    "payment_failed":         (PaymentFailed, config.TOPIC_PAYMENT),
    "order_created":          (OrderCreated, config.TOPIC_ORDER),
    "order_delivered":        (OrderDelivered, config.TOPIC_ORDER),
    "order_cancelled":        (OrderCancelled, config.TOPIC_ORDER),
    "item_reviewed":          (ItemReviewed, config.TOPIC_REVIEW),
}


# ---------------------------------------------------------------------------
# Envelope and validation
# ---------------------------------------------------------------------------
class EventEnvelope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    schema_version: int = 1
    source: Literal["web", "mobile", "backend"] = "web"
    event_time: datetime              # when the event occurred (client clock)
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    city: Optional[str] = None        # used for region-wise analytics
    payload: dict = Field(default_factory=dict)

    @field_validator("event_type")
    @classmethod
    def known_type(cls, v: str) -> str:
        if v not in EVENT_REGISTRY:
            raise ValueError(f"unknown event_type '{v}'")
        return v

    @field_validator("event_time")
    @classmethod
    def to_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:          # naive timestamps are treated as UTC
            v = v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    @field_validator("city")
    @classmethod
    def norm_city(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v else v


def validate_event(raw: dict) -> tuple[dict, str, Optional[str]]:
    """
    Validate a raw event and enrich it with server-side metadata.

    Returns (enriched_event, topic, partition_key).
    Raises pydantic.ValidationError or ValueError if the event is invalid.
    """
    env = EventEnvelope.model_validate(raw)
    model, topic = EVENT_REGISTRY[env.event_type]
    payload = model.model_validate(env.payload).model_dump(mode="json")

    # Derive delivery delay server-side so every consumer uses the same definition.
    if env.event_type == "order_delivered":
        eta, actual = payload.get("promised_eta_min"), payload.get("actual_delivery_min")
        if eta and actual:
            payload["delay_min"] = max(0, actual - eta)
            payload["is_late"] = actual > eta

    if config.KAFKA_SINGLE_TOPIC:
        topic = config.KAFKA_SINGLE_TOPIC

    received_at = datetime.now(timezone.utc)
    event = env.model_dump(mode="json")
    event["payload"] = payload
    event["received_at"] = received_at.isoformat()
    # Metadata for detecting late-arriving events and client clock skew.
    event["lateness_sec"] = round((received_at - env.event_time).total_seconds(), 3)
    event["clock_skew"] = env.event_time > received_at + timedelta(minutes=5)

    # Partition by restaurant so its events stay ordered within one partition.
    key = payload.get("restaurant_id") or env.user_id or env.session_id
    return event, topic, key

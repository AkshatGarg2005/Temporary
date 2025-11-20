import re
from typing import Dict, Tuple, List, Optional

import dateparser


def _extract_quantity(text: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Very simple quantity + unit extraction, e.g. "1 litre milk", "2 packets", "3 kg rice".
    """
    pattern = re.compile(
        r"(?P<value>\d+(\.\d+)?)\s*(?P<unit>litre|liter|ltr|kg|kilo|kilogram|gm|g|packet|pack|bottle|box|dozen)",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None, None
    value = float(match.group("value"))
    unit = match.group("unit").lower()
    return value, unit


def _extract_product(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract a rough product name and category for groceries.
    Examples:
      "order me a biscuit" -> (None, "biscuit")
      "order oreo biscuit" -> ("oreo biscuit", "biscuit")
      "1 litre milk" -> (None, "milk")
      "order me fanta" -> ("fanta", None)
      "order fanta for me" -> ("fanta", None)
    """
    lower = text.lower()
    categories = [
        "biscuit",
        "biscuits",
        "milk",
        "bread",
        "egg",
        "eggs",
        "rice",
        "atta",
        "oil",
        "chocolate",
        "drink",
        "cold drink",
        "juice",
    ]

    found_category = None
    for cat in categories:
        if cat in lower:
            if cat.endswith("s"):
                found_category = cat[:-1]
            else:
                found_category = cat
            break

    product_name = None
    if found_category:
        pattern = re.compile(r"([\w\s]{0,30})\b" + re.escape(found_category) + r"s?\b")
        m = pattern.search(lower)
        if m:
            phrase = m.group(1).strip()
            phrase = re.sub(
                r"\b(order|buy|get|me|some|please|reorder|my|usual|a|an|the)\b",
                "",
                phrase,
            )
            phrase = re.sub(r"\s+", " ", phrase).strip()
            if phrase:
                product_name = phrase + " " + found_category

    # Fallback: treat remaining content as product name (fixes "order fanta for me")
    if not found_category and not product_name:
        words = re.findall(r"[a-zA-Z]+", lower)
        stopwords = {
            "order",
            "buy",
            "get",
            "me",
            "some",
            "please",
            "reorder",
            "my",
            "usual",
            "a",
            "an",
            "the",
            "add",
            "to",
            "cold",
            "drink",
            "drinks",
            "for",
        }
        candidates = [w for w in words if w not in stopwords]
        if candidates:
            product_name = " ".join(candidates)

    return product_name, found_category


def _extract_from_to(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract origin/destination for cab, using patterns like 'from X to Y'.
    """
    pattern = re.compile(r"from\s+(?P<origin>.+?)\s+to\s+(?P<dest>.+)", re.IGNORECASE)
    m = pattern.search(text)
    if m:
        origin = m.group("origin").strip()
        dest = m.group("dest").strip()
        return origin, dest
    return None, None


def _extract_location(text: str) -> Optional[str]:
    """
    Extract a rough location for housing / general.
    """
    lower = text.lower()
    pattern = re.compile(r"(in|near|around|at)\s+([a-zA-Z\s]+)$")
    m = pattern.search(lower)
    if m:
        loc = m.group(2).strip()
        return loc
    return None


def _extract_booking_mode(text: str) -> Optional[str]:
    """
    For housing: detect 'daily' vs 'monthly'.
    Returns 'DAILY', 'MONTHLY' or None.
    """
    lower = text.lower()
    if any(
        x in lower
        for x in [
            "per day",
            "per night",
            "daily",
            "for 2 days",
            "for two days",
            "for 3 days",
            "for three days",
        ]
    ):
        return "DAILY"
    if any(
        x in lower
        for x in [
            "per month",
            "monthly",
            "for a month",
            "for one month",
            "for 1 month",
        ]
    ):
        return "MONTHLY"
    return None


def _extract_datetime(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Use dateparser to extract a datetime. Returns (datetime_iso, datetime_text_used).
    """
    settings = {"PREFER_DATES_FROM": "future"}
    dt = dateparser.parse(text, settings=settings)
    if dt is None:
        return None, None
    return dt.isoformat(), text


def _extract_service_category(text: str) -> str:
    """
    Classify home_service into one of:
    'Plumber', 'Electrician', 'Carpenter', 'Cleaner',
    'AC Repair', 'Painter', 'Gardener', 'Appliance Repair', 'Other'
    """
    lower = text.lower()

    mapping = {
        "Plumber": [
            "tap",
            "pipe",
            "leak",
            "plumb",
            "toilet",
            "sink",
            "water is leaking",
        ],
        "Electrician": [
            "electric",
            "light",
            "lights",
            "fan",
            "switch",
            "socket",
            "power",
            "wiring",
            "short circuit",
        ],
        "Carpenter": [
            "carpenter",
            "wood",
            "door",
            "furniture",
            "bed frame",
            "almirah",
            "table",
        ],
        "Cleaner": [
            "clean",
            "cleaning",
            "deep cleaning",
            "maid",
            "sweep",
            "mop",
            "dusting",
        ],
        "AC Repair": [
            "ac",
            "air conditioner",
            "aircon",
            "cooling",
            "ac not cooling",
            "ac repair",
        ],
        "Painter": [
            "paint",
            "painting",
            "wall color",
            "repaint",
        ],
        "Gardener": [
            "garden",
            "gardener",
            "lawn",
            "grass",
            "plants",
            "tree",
        ],
        "Appliance Repair": [
            "fridge",
            "refrigerator",
            "washing machine",
            "tv",
            "microwave",
            "oven",
            "geyser",
            "appliance",
        ],
    }

    for category, keywords in mapping.items():
        for kw in keywords:
            if kw in lower:
                return category

    return "Other"


def extract_slots(text: str, intent: str) -> Dict[str, object]:
    """
    Main slot extraction entrypoint.
    """
    quantity_value, quantity_unit = _extract_quantity(text)
    product_name, product_category = _extract_product(text)
    origin, destination = _extract_from_to(text)
    location = _extract_location(text)
    booking_mode = _extract_booking_mode(text)
    datetime_iso, datetime_text = _extract_datetime(text)
    service_category = _extract_service_category(text)

    slots: Dict[str, object] = {
        "quantity_value": quantity_value,
        "quantity_unit": quantity_unit,
        "product_name": product_name,
        "product_category": product_category,
        "origin": origin,
        "destination": destination,
        "location": location,
        "booking_mode": booking_mode,
        "datetime_iso": datetime_iso,
        "datetime_text": datetime_text,
        "symptom_text": text if intent == "health_symptom" else None,
        "service_category": service_category,
    }

    return slots


def decide_followup(intent: str, slots: Dict[str, object]) -> Tuple[List[str], Optional[str]]:
    """
    Decide which slots are missing and what follow-up question (if any) to ask.
    """
    missing: List[str] = []
    question: Optional[str] = None

    if intent == "book_cab":
        if not slots.get("origin") or not slots.get("destination"):
            if not slots.get("origin"):
                missing.append("origin")
            if not slots.get("destination"):
                missing.append("destination")
            question = (
                "For your cab, please tell me the pickup location and drop location "
                "(for example: 'book me a cab from X to Y')."
            )
        elif not slots.get("datetime_iso"):
            missing.append("datetime")
            question = "At what date and time should I book your cab?"
    elif intent == "doctor_consult":
        if not slots.get("datetime_iso"):
            missing.append("datetime")
            question = "When would you like to consult the doctor? Please specify a date and time."
    elif intent == "health_symptom":
        # Only ask for datetime if not already present
        if not slots.get("datetime_iso"):
            missing.append("datetime")
            question = (
                "I detected health symptoms. Would you like me to book a doctor consultation? "
                "If yes, please tell me your preferred date and time."
            )
    elif intent in ("book_housing", "housing_search"):
        if not slots.get("location"):
            missing.append("location")
        if intent == "book_housing":
            if not slots.get("booking_mode"):
                missing.append("booking_mode")
            if not slots.get("datetime_iso"):
                missing.append("datetime")
        if missing:
            if intent == "housing_search":
                question = (
                    "To help with housing, please confirm the location (for example 'in Sehore') "
                    "and roughly when you want to stay."
                )
            else:
                question = (
                    "To book this property, please tell me if you want it on a daily or monthly basis, "
                    "and from which date."
                )
    elif intent == "order_grocery":
        if not slots.get("product_name") and not slots.get("product_category"):
            missing.append("product")
            question = "Which item would you like to order (for example 'biscuit', 'milk', 'fanta', etc.)?"
    elif intent == "home_service":
        # Ask for datetime if missing, so we can schedule the worker
        if not slots.get("datetime_iso"):
            missing.append("datetime")
            question = "When should the worker visit? Please specify a date and time."

    return missing, question

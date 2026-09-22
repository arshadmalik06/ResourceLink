from math import radians, sin, cos, sqrt, atan2


def category_score(request_category, resource_category):
    if not request_category:
        return 100
        
    if not resource_category:
        return 0

    if request_category.lower() == resource_category.lower():
        return 100

    return 0


def capability_score(required, available):
    if not required:
        return 100

    if not available:
        return 0

    required = [x.lower() for x in required]
    available = [x.lower() for x in available]

    matched = sum(1 for item in required if item in available)

    return (matched / len(required)) * 100


def distance_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None

    R = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(R * c, 2)


def distance_score(distance):
    if distance is None:
        return 50

    if distance <= 5:
        return 100

    if distance <= 10:
        return 90

    if distance <= 25:
        return 75

    if distance <= 50:
        return 60

    if distance <= 100:
        return 40

    return 20


def cost_score(hourly_rate, budget, duration_hours):
    if budget is None:
        return 50

    total_cost = hourly_rate * duration_hours

    if total_cost <= budget:
        return 100

    if total_cost <= budget * 1.25:
        return 70

    if total_cost <= budget * 1.5:
        return 40

    return 0


def trust_score(is_verified, trust):
    if not is_verified:
        return 30

    return min(max(trust, 0), 100)


def final_score(
    capability,
    availability,
    distance,
    cost,
    trust,
    category=100
):
    """
    Weighted final match score.

    Capability + Category combined = 40%
      (category acts as a strong signal inside the
      capability weight, since capability_score already
      returns 0 when nothing matches)
    Availability = 25%
    Distance     = 15%
    Cost         = 10%
    Trust        = 10%
    """

    combined_capability = (
        capability * 0.5 + category * 0.5
    )

    return round(
        combined_capability * 0.40
        + availability * 0.25
        + distance * 0.15
        + cost * 0.10
        + trust * 0.10,
        2
    )
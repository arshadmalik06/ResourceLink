import json
from datetime import datetime, timezone

from scoring import (
    capability_score,
    category_score,
    distance_km,
    distance_score,
    cost_score,
    trust_score,
    final_score
)


def parse_time(time_value):
    """
    Convert a timestamp/string into a timezone-aware datetime.
    Handles Supabase timestamps and normal ISO timestamps.
    """

    if isinstance(time_value, datetime):
        dt = time_value
    else:
        dt = datetime.fromisoformat(
            str(time_value).replace("Z", "+00:00")
        )

    # If timestamp has no timezone, treat it as UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt


def availability_score(
    resource_id,
    time_slots,
    requested_start,
    requested_end
):
    """
    Check whether a resource has an available slot
    that overlaps with the requested time.
    """

    for slot in time_slots:

        # Check resource
        if slot.get("resource_id") != resource_id:
            continue

        # Only consider available slots
        if slot.get("status", "").lower() != "available":
            continue

        slot_start = parse_time(slot["start_time"])
        slot_end = parse_time(slot["end_time"])

        # Requested time must overlap with the available slot
        if (
            slot_start < requested_end
            and slot_end > requested_start
        ):
            return 100

    return 0


def match_resources(
    resources,
    time_slots,
    institutions,
    request
):
    """
    Match a resource request with available institutional resources.

    Scoring:
    Capability + Category = 40%
    Availability           = 25%
    Distance                = 15%
    Cost                     = 10%
    Trust                    = 10%
    """

    requested_start = parse_time(
        request["start_time"]
    )

    requested_end = parse_time(
        request["end_time"]
    )

    # Calculate requested duration
    duration_hours = (
        requested_end - requested_start
    ).total_seconds() / 3600

    if duration_hours <= 0:
        return []

    # Create institution lookup
    institution_map = {
        institution["id"]: institution
        for institution in institutions
    }

    request_category = request.get("category")
    request_capabilities = request.get("required_capability", [])

    matches = []

    # Check every resource
    for resource in resources:

        institution = institution_map.get(
            resource.get("institution_id")
        )

        # Skip resources whose institution doesn't exist
        if not institution:
            continue

        # ------------------------------------------------
        # 1. CATEGORY
        # ------------------------------------------------

        resource_category = resource.get(
            "category"
        )

        category = category_score(
            request_category,
            resource_category
        )

        # Hard filter: if the requester specified a category,
        # resources in a different category are not relevant
        # at all and should never be returned.
        if request_category and category == 0:
            continue

        # ------------------------------------------------
        # 2. CAPABILITY
        # ------------------------------------------------

        capabilities = resource.get(
            "capability_tags"
        ) or []

        # Supabase JSONB can sometimes come as a string
        if isinstance(capabilities, str):
            try:
                capabilities = json.loads(
                    capabilities
                )
            except Exception:
                capabilities = [
                    capabilities
                ]

        capability = capability_score(
            request_capabilities,
            capabilities
        )

        # Hard filter: if the requester specified required
        # capabilities, resources with zero overlap are not
        # relevant at all and should never be returned.
        if request_capabilities and capability == 0:
            continue

        # ------------------------------------------------
        # 3. AVAILABILITY
        # ------------------------------------------------

        availability = availability_score(
            resource["id"],
            time_slots,
            requested_start,
            requested_end
        )

        # Don't recommend unavailable resources
        if availability == 0:
            continue

        # ------------------------------------------------
        # 4. LOCATION
        # ------------------------------------------------

        distance = distance_km(
            request.get("latitude"),
            request.get("longitude"),
            institution.get("latitude"),
            institution.get("longitude")
        )

        distance_points = distance_score(
            distance
        )

        # ------------------------------------------------
        # 5. COST
        # ------------------------------------------------

        hourly_rate = float(
            resource.get(
                "hourly_rate_algo"
            ) or 0
        )

        budget = request.get(
            "budget"
        )

        cost = cost_score(
            hourly_rate,
            budget,
            duration_hours
        )

        estimated_cost = round(
            hourly_rate * duration_hours,
            2
        )

        # ------------------------------------------------
        # 6. TRUST
        # ------------------------------------------------

        verified = institution.get(
            "is_verified",
            False
        )

        institution_trust = institution.get(
            "trust_score",
            0
        )

        trust = trust_score(
            verified,
            institution_trust
        )

        # ------------------------------------------------
        # 7. OPERATOR REQUIREMENT
        # ------------------------------------------------

        operator_required = request.get(
            "operator_required",
            False
        )

        resource_operator = resource.get(
            "operator_required",
            False
        )

        # If requester needs an operator,
        # resource must provide one
        if (
            operator_required
            and not resource_operator
        ):
            continue

        # ------------------------------------------------
        # 8. FINAL SCORE
        # ------------------------------------------------

        score = final_score(
            capability,
            availability,
            distance_points,
            cost,
            trust,
            category
        )

        # ------------------------------------------------
        # 9. EXPLANATION
        # ------------------------------------------------

        reasons = []

        if category == 100:
            reasons.append(
                "Category matched"
            )

        if capability >= 75:
            reasons.append(
                "Required capabilities matched"
            )

        elif capability > 0:
            reasons.append(
                "Partially matched capabilities"
            )

        if availability == 100:
            reasons.append(
                "Available during requested time"
            )

        if distance is not None:
            reasons.append(
                f"{distance} km from requester"
            )

        if cost >= 100:
            reasons.append(
                "Within budget"
            )

        elif cost > 0:
            reasons.append(
                "Slightly above budget"
            )

        if verified:
            reasons.append(
                "Verified institution"
            )

        if resource.get(
            "verification_status"
        ) == "verified":
            reasons.append(
                "Verified resource"
            )

        if resource_operator:
            reasons.append(
                "Operator available"
            )

        # ------------------------------------------------
        # 10. ADD RESULT
        # ------------------------------------------------

        matches.append({

            "resource_id":
                resource["id"],

            "resource_name":
                resource.get("name"),

            "facility_name":
                resource.get("facility_name"),

            "institution_id":
                institution["id"],

            "institution_name":
                institution.get("name"),

            "category":
                resource.get("category"),

            "capability_tags":
                capabilities,

            "verification_status":
                resource.get(
                    "verification_status"
                ),

            "match_score":
                score,

            "distance_km":
                distance,

            "hourly_rate_algo":
                hourly_rate,

            "estimated_cost_algo":
                estimated_cost,

            "operator_required":
                resource_operator,

            "requires_approval":
                resource.get(
                    "requires_approval",
                    True
                ),

            "reasons":
                reasons
        })

    matches.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return matches
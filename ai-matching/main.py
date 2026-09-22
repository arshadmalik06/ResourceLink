from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import supabase
from matcher import match_resources


app = FastAPI(
    title="ResourceLink AI Matching API",
    description="Matches institutional resource requests with available resources",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for hackathon; tighten to your actual frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "ResourceLink Matching API is running"
    }


@app.get("/test-supabase")
def test_supabase():

    try:

        institutions = (
            supabase
            .table("institutions")
            .select("*")
            .execute()
        )

        resources = (
            supabase
            .table("resources")
            .select("*")
            .execute()
        )

        time_slots = (
            supabase
            .table("time_slots")
            .select("*")
            .execute()
        )

        return {
            "institutions": len(institutions.data),
            "resources": len(resources.data),
            "time_slots": len(time_slots.data),
            "status": "Supabase connected successfully"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/match")
def match(request: dict):

    try:

        # Fetch institutions
        institutions_response = (
            supabase
            .table("institutions")
            .select("*")
            .execute()
        )

        # Fetch resources
        resources_response = (
            supabase
            .table("resources")
            .select("*")
            .execute()
        )

        # Fetch time slots
        time_slots_response = (
            supabase
            .table("time_slots")
            .select("*")
            .execute()
        )

        institutions = institutions_response.data
        resources = resources_response.data
        time_slots = time_slots_response.data

        # Run matching algorithm
        matches = match_resources(
            resources,
            time_slots,
            institutions,
            request
        )

        return {
            "request": request,
            "total_matches": len(matches),
            "matches": matches
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
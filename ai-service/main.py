
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

app = FastAPI(title="ApplyWise AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://applywise-frontend.onrender.com"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=api_key) if api_key else None


class JobMatchRequest(BaseModel):
    skills: str = Field(min_length=1, max_length=3000)
    job_description: str = Field(min_length=1, max_length=12000)


@app.get("/")
def home():
    return {"message": "ApplyWise AI service is running!"}


@app.post("/api/analyze")
def analyze_job(request: JobMatchRequest):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured."
        )

    prompt = f"""
    You are ApplyWise, an AI career assistant.

    Compare the candidate's skills with the job description.

    Candidate skills:
    {request.skills}

    Job description:
    {request.job_description}

    Provide:
    1. An estimated job match score from 0 to 100.
    2. Skills that match the job requirements.
    3. Important skills the candidate may need to improve.
    4. A practical preparation plan with recommended topics.

    Be realistic. Do not claim the candidate has skills they
    have not provided. Explain that the score is an estimate.
    Use clear headings and concise bullet points.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return {"analysis": response.text}

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Gemini analysis failed. Check your API access and model availability."
        )

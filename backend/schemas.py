"""
schemas.py — Pydantic models with detailed score breakdown.
"""

from pydantic import BaseModel, Field

class ScoreBreakdown(BaseModel):
    technical_skills: int = Field(..., ge=0, le=100)
    experience: int = Field(..., ge=0, le=100)
    domain_knowledge: int = Field(..., ge=0, le=100)
    education: int = Field(..., ge=0, le=100)

class ScreeningResult(BaseModel):
    """Structured output with breakdown for better trust."""
    score: int = Field(..., ge=0, le=100)
    breakdown: ScoreBreakdown
    summary: str
    strengths: list[str]
    gaps: list[str]
    recommendation: str
    preparation_tips: list[str] = []
    expected_questions: list[str] = []
    interview_rounds: list[str] = []
    areas_of_concern: list[str] = []
    
    leetcode_links: list[dict] = []
    youtube_links: list[dict] = []
    github_repos: list[dict] = []
    related_jobs: list[dict] = []

class ErrorResponse(BaseModel):
    detail: str

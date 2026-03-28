"""
main.py — FastAPI application entry point.
"""

import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas import ScreeningResult, ErrorResponse
from services.analyzer import screen_resume
from utils.ai_helper import (
    analyze_with_groq, 
    get_premium_suite,
    tailor_resume_with_groq, 
    generate_cover_letter_with_groq
)
from utils.parser import extract_text_from_pdf

load_dotenv()

app = FastAPI(title="SkillSync AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "SkillSync AI"}

@app.post("/api/analyze", response_model=ScreeningResult)
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    pdf_bytes = await resume.read()
    try:
        result = await screen_resume(pdf_bytes, job_description)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/premium")
async def premium_suite(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    """
    ONE-STOP PREMIUM: Returns both tailored resume and cover letter.
    """
    try:
        pdf_bytes = await resume.read()
        resume_text = extract_text_from_pdf(pdf_bytes)
        
        # Single AI call for both documents
        result = get_premium_suite(resume_text, job_description)
        return result
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tailor")
async def tailor_cv(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    try:
        pdf_bytes = await resume.read()
        resume_text = extract_text_from_pdf(pdf_bytes)
        tailored_markdown = tailor_resume_with_groq(resume_text, job_description)
        return {"tailored_resume": tailored_markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cover-letter")
async def cover_letter(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    try:
        pdf_bytes = await resume.read()
        resume_text = extract_text_from_pdf(pdf_bytes)
        cl_markdown = generate_cover_letter_with_groq(resume_text, job_description)
        return {"cover_letter": cl_markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

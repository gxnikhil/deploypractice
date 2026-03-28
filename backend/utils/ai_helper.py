import os
import json
import logging
import random
from groq import Groq, RateLimitError
from openai import OpenAI  # Used for xAI Grok API
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Multi-Provider Configuration ---
# Collects all keys and sorts them by provider
raw_env_keys = os.getenv("GROQ_API_KEY", "").split(",")
GROQ_KEYS = [k.strip() for k in raw_env_keys if k.strip().startswith("gsk_")]
XAI_KEYS = [k.strip() for k in raw_env_keys if k.strip().startswith("xai-")]

# Add explicit xAI key support if provided separately
extra_xai = os.getenv("XAI_API_KEY", "").split(",")
XAI_KEYS.extend([k.strip() for k in extra_xai if k.strip()])

def call_ai_with_retry(prompt, model="llama-3.3-70b-versatile", response_format=None):
    """
    Fallback Chain:
    1. Try random Groq Key (70B model)
    2. Try random xAI Key (Grok model)
    3. Fallback to Groq 8B (High Limits)
    """
    
    # 1. Try Groq (Fastest/Cheapest)
    if GROQ_KEYS:
        shuffled_groq = list(GROQ_KEYS)
        random.shuffle(shuffled_groq)
        for key in shuffled_groq:
            try:
                client = Groq(api_key=key)
                res = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model,
                    response_format=response_format
                )
                return res.choices[0].message.content
            except RateLimitError:
                continue
            except Exception as e:
                logger.error(f"Groq Error: {str(e)}")
                continue

    # 2. Try xAI (Reliable alternative)
    if XAI_KEYS:
        shuffled_xai = list(XAI_KEYS)
        random.shuffle(shuffled_xai)
        for key in shuffled_xai:
            try:
                # xAI is OpenAI compatible
                xclient = OpenAI(api_key=key, base_url="https://api.x.ai/v1")
                # xAI JSON mode works differently - usually best to just prompt for it
                res = xclient.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="grok-beta", # Standard xAI model
                )
                return res.choices[0].message.content
            except Exception as e:
                logger.error(f"xAI Error: {str(e)}")
                continue

    # 3. Last Resort Fallback: Llama 8B (High Free Tier Limits)
    if GROQ_KEYS:
        try:
            client = Groq(api_key=random.choice(GROQ_KEYS))
            res = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                response_format=response_format
            )
            return res.choices[0].message.content
        except:
            pass
            
    raise Exception("All AI Providers (Groq Cloud & xAI) are currently exhausted. Please add more keys or try later.")

def analyze_with_groq(resume_text: str, job_description: str):
    """Main analysis with provider fallback."""
    prompt = f"""
    You are an expert HR Manager. Analyze this Resume vs JD.
    
    JD: {job_description}
    RESUME: {resume_text}
    
    Return ONLY a raw JSON object with:
    - score (0-100)
    - analysis (text)
    - strengths (array)
    - weaknesses (array)
    - roadmap (array)
    - leetcode_links ({{title: name, url: url}} array)
    - youtube_links ({{title: name, url: url}} array)
    - github_projects (array)
    - related_jobs ({{platform: name, url: url}} array)
    """
    
    try:
        content = call_ai_with_retry(prompt, response_format={"type": "json_object"})
        # Clean xAI response if it included markdown backticks
        if content.strip().startswith("```"):
            content = content.strip().split("```json")[-1].split("```")[0].strip()
        return json.loads(content)
    except Exception as e:
        logger.error(f"AI Suite Failed: {str(e)}")
        raise e

def get_premium_suite(resume_text: str, job_description: str):
    """Premium CV + Cover Letter with fallback."""
    prompt = f"""
    Generate a tailored Resume and Cover Letter.
    JD: {job_description}
    RESUME: {resume_text}
    Return JSON with: tailored_resume, cover_letter.
    """
    try:
        content = call_ai_with_retry(prompt, response_format={"type": "json_object"})
        if content.strip().startswith("```"):
            content = content.strip().split("```json")[-1].split("```")[0].strip()
        return json.loads(content)
    except Exception as e:
        raise e

def tailor_resume_with_groq(resume_text: str, job_description: str):
    return get_premium_suite(resume_text, job_description).get("tailored_resume", "")

def generate_cover_letter_with_groq(resume_text: str, job_description: str):
    return get_premium_suite(resume_text, job_description).get("cover_letter", "")

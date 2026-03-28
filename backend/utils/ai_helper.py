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
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")


def call_ai_with_retry(prompt, model="llama-3.3-70b-versatile", response_format=None):
    """
    Fallback Chain:
    1. Try NVIDIA Gemma
    2. Try Groq (Fallback)
    3. Fallback to Groq 8B (High Limits)
    """
    # 1. Try NVIDIA Gemma (Primary - based on user request)
    if NVIDIA_API_KEY:
        try:
            # NVIDIA NIM is OpenAI compatible
            xclient = OpenAI(api_key=NVIDIA_API_KEY, base_url="https://integrate.api.nvidia.com/v1")
            
            res = xclient.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="google/gemma-3n-e2b-it",
            )
            return res.choices[0].message.content
        except Exception as e:
            logger.error(f"NVIDIA Gemma Error: {str(e)}")

    # 2. Try Groq (Fallback)
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
            
    raise Exception("All AI Providers (NVIDIA NIM & Groq Cloud) are currently exhausted. Please add more keys or try later.")

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
        
        # Extract JSON using string search if it contains markdown or extra text
        import re
        match = re.search(r'\{(?:[^{}]|(?R))*\}', content, re.DOTALL) if hasattr(re, 'error') else None 
        # Since Python re doesn't support recursive, let's use a simple greedy match for the outermost braces
        # A simpler approach: find first '{' and last '}'
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1:
            content = content[start:end+1]
            
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
        
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1:
            content = content[start:end+1]
            
        return json.loads(content)
    except Exception as e:
        raise e

def tailor_resume_with_groq(resume_text: str, job_description: str):
    return get_premium_suite(resume_text, job_description).get("tailored_resume", "")

def generate_cover_letter_with_groq(resume_text: str, job_description: str):
    return get_premium_suite(resume_text, job_description).get("cover_letter", "")

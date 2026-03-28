import logging
from utils.parser import extract_text_from_pdf
from utils.ai_helper import analyze_with_groq
from schemas import ScreeningResult

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def screen_resume(resume_bytes: bytes, job_description: str) -> ScreeningResult:
    """
    Complete pipeline: PDF parsing -> Groq Analysis -> Validation.
    """
    if not resume_bytes:
        raise ValueError("Resume file is empty.")

    # 1. Parse PDF
    logger.info("Starting PDF parsing...")
    resume_text = extract_text_from_pdf(resume_bytes)

    # 2. Analyze with Groq (Llama-3.3-70B)
    logger.info("Starting Groq analysis...")
    ai_result = analyze_with_groq(resume_text, job_description)

    # 3. Validate structure with Pydantic
    logger.info("Validating result with Pydantic...")
    validated_result = ScreeningResult(**ai_result)

    return validated_result

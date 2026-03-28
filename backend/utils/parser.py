"""
parser.py — Extracts text content from uploaded PDF resumes.

Purpose: Convert binary PDF data into clean text for AI analysis.
Used by: services/analyzer.py
Common mistake: Not handling encrypted/malformed PDFs — always wrap in try/except.
"""

import io
from PyPDF2 import PdfReader
from fastapi import HTTPException


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Read PDF bytes and return extracted text.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        Cleaned text content from all pages.

    Raises:
        HTTPException(400): If the PDF is unreadable or contains no text.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []

        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())

        full_text = "\n\n".join(pages_text)

        if not full_text.strip():
            raise HTTPException(
                status_code=400,
                detail="PDF has no extractable text. It may be scanned/image-based.",
            )

        return full_text

    except HTTPException:
        raise  # re-raise our own errors
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse PDF: {str(e)}",
        )

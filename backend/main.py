"""
VaaniBridge Backend — FastAPI
Securely generates AssemblyAI temporary tokens for the frontend.
The ASSEMBLYAI_API_KEY never leaves the server.
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx

# Load .env file (in development)
load_dotenv()

# Configure logging — never log the API key
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VaaniBridge API",
    description="Backend for VaaniBridge real-time AI voice agent",
    version="1.0.0",
)

# CORS — allow local dev servers, production frontend (Vercel), and custom origins
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://vaanibridge.vercel.app",
    "https://vaani-bridge.vercel.app",
]

# Add origins from ALLOWED_ORIGINS environment variable if present (comma-separated or '*')
env_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
if env_origins:
    if env_origins == "*":
        allowed_origins = ["*"]
    else:
        for origin in env_origins.split(","):
            cleaned = origin.strip()
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AssemblyAI Voice Agent official endpoints
ASSEMBLYAI_TOKEN_URL = "https://agents.assemblyai.com/v1/token"
ASSEMBLYAI_AGENT_WS = "wss://agents.assemblyai.com/v1/ws"


def _get_api_key() -> str:
    """Retrieve the API key from environment. Raises if missing."""
    key = os.environ.get("ASSEMBLYAI_API_KEY", "").strip()
    if not key or key == "your_key_here":
        raise HTTPException(
            status_code=500,
            detail="ASSEMBLYAI_API_KEY is not configured. Set it in backend/.env",
        )
    return key


@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    key = os.environ.get("ASSEMBLYAI_API_KEY", "")
    key_configured = bool(key and key != "your_key_here")
    return {
        "status": "ok",
        "service": "VaaniBridge Backend",
        "api_key_configured": key_configured,
    }


@app.post("/api/token")
@app.get("/api/token")
async def generate_token():
    """
    Generate a single-use AssemblyAI Voice Agent temporary token for the browser.
    Official Endpoint: GET https://agents.assemblyai.com/v1/token

    The permanent API key is NEVER sent to the frontend.
    """
    api_key = _get_api_key()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # AssemblyAI Voice Agent documentation specifies GET request with Authorization header and expires_in_seconds query param
            response = await client.get(
                ASSEMBLYAI_TOKEN_URL,
                headers={
                    "Authorization": api_key,
                },
                params={
                    "expires_in_seconds": 60,
                },
            )

        if response.status_code == 401:
            logger.error("AssemblyAI authentication failed — check API key")
            raise HTTPException(
                status_code=401,
                detail="Invalid AssemblyAI API key. Check your backend/.env file.",
            )

        if response.status_code != 200:
            logger.error(
                "AssemblyAI token endpoint returned %d: %s",
                response.status_code,
                response.text,
            )
            raise HTTPException(
                status_code=502,
                detail=f"AssemblyAI token generation failed (HTTP {response.status_code})",
            )

        data = response.json()
        token = data.get("token")

        if not token:
            logger.error("AssemblyAI response missing token field: %s", data)
            raise HTTPException(
                status_code=502,
                detail="AssemblyAI returned an unexpected response (no token)",
            )

        logger.info("Generated AssemblyAI Voice Agent temporary token successfully")

        return {
            "token": token,
            "ws_url": ASSEMBLYAI_AGENT_WS,
        }

    except httpx.TimeoutException:
        logger.error("Timeout reaching AssemblyAI token endpoint")
        raise HTTPException(
            status_code=504,
            detail="Timeout connecting to AssemblyAI. Check your network.",
        )
    except httpx.RequestError as exc:
        logger.error("Network error reaching AssemblyAI: %s", str(exc))
        raise HTTPException(
            status_code=502,
            detail="Network error reaching AssemblyAI",
        )


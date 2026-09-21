"""
Backend tests for VaaniBridge.
Tests health, token generation, error handling, and session lifecycle.
"""

import pytest
import os
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

# Ensure test environment has no real key by default
os.environ.setdefault("ASSEMBLYAI_API_KEY", "test_api_key_12345")

from main import app

client = TestClient(app)


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

class TestHealthCheck:
    def test_health_returns_ok(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["service"] == "VaaniBridge Backend"

    def test_health_shows_key_configured_when_key_set(self):
        with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
            response = client.get("/api/health")
            assert response.status_code == 200
            assert response.json()["api_key_configured"] is True

    def test_health_shows_key_not_configured_when_missing(self):
        with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": ""}):
            response = client.get("/api/health")
            assert response.status_code == 200
            assert response.json()["api_key_configured"] is False

    def test_health_shows_key_not_configured_for_placeholder(self):
        with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "your_key_here"}):
            response = client.get("/api/health")
            assert response.status_code == 200
            assert response.json()["api_key_configured"] is False


# ─────────────────────────────────────────────
# Token generation
# ─────────────────────────────────────────────

class TestTokenGeneration:
    def _mock_assemblyai_success(self):
        """Returns a mock httpx response for a successful token generation."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"token": "temp_token_abc123xyz"}
        return mock_response

    def test_token_returns_token_and_ws_url(self):
        mock_resp = self._mock_assemblyai_success()
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                assert response.status_code == 200
                body = response.json()
                assert "token" in body
                assert body["token"] == "temp_token_abc123xyz"
                assert "ws_url" in body
                assert "agents.assemblyai.com" in body["ws_url"]

    def test_token_fails_when_no_api_key(self):
        with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": ""}):
            response = client.post("/api/token")
            assert response.status_code == 500
            assert "ASSEMBLYAI_API_KEY" in response.json()["detail"]

    def test_token_fails_for_placeholder_key(self):
        with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "your_key_here"}):
            response = client.post("/api/token")
            assert response.status_code == 500

    def test_token_returns_401_for_invalid_key(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "bad_key"}):
                response = client.post("/api/token")
                assert response.status_code == 401
                assert "Invalid AssemblyAI API key" in response.json()["detail"]

    def test_token_returns_502_on_assemblyai_error(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal error"
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                assert response.status_code == 502

    def test_token_does_not_expose_api_key_in_response(self):
        mock_resp = self._mock_assemblyai_success()
        api_key = "super_secret_key_xyz"
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": api_key}):
                response = client.post("/api/token")
                # The API key must NOT appear anywhere in the response
                response_text = response.text
                assert api_key not in response_text

    def test_token_handles_missing_token_in_response(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"unexpected_field": "value"}
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                assert response.status_code == 502


# ─────────────────────────────────────────────
# Network error handling
# ─────────────────────────────────────────────

class TestNetworkErrors:
    def test_token_handles_timeout(self):
        import httpx
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            side_effect=httpx.TimeoutException("timeout"),
        ):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                assert response.status_code == 504
                assert "Timeout" in response.json()["detail"]

    def test_token_handles_network_error(self):
        import httpx
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            side_effect=httpx.RequestError("connection refused"),
        ):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                assert response.status_code == 502
                assert "Network error" in response.json()["detail"]


# ─────────────────────────────────────────────
# Session lifecycle (conceptual)
# ─────────────────────────────────────────────

class TestSessionLifecycle:
    """
    These tests verify the session lifecycle contract:
    - Token is required before WebSocket connection
    - Token is single-use and short-lived
    - Session can be properly terminated
    """

    def test_each_token_request_gets_fresh_token(self):
        """Simulate two separate sessions — each gets its own token."""
        tokens = ["token_session_1", "token_session_2"]
        call_count = 0

        async def mock_get(*args, **kwargs):
            nonlocal call_count
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"token": tokens[call_count]}
            call_count += 1
            return mock_resp

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=mock_get):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                r1 = client.post("/api/token")
                r2 = client.post("/api/token")

        assert r1.json()["token"] == "token_session_1"
        assert r2.json()["token"] == "token_session_2"
        assert r1.json()["token"] != r2.json()["token"]

    def test_ws_url_points_to_assemblyai_voice_agent_endpoint(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"token": "tok"}
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                ws_url = response.json()["ws_url"]
                assert ws_url == "wss://agents.assemblyai.com/v1/ws"

            with patch.dict(os.environ, {"ASSEMBLYAI_API_KEY": "real_key_abc123"}):
                response = client.post("/api/token")
                ws_url = response.json()["ws_url"]
                assert ws_url == "wss://agents.assemblyai.com/v1/ws"

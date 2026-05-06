import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """INFR-01: /api/health endpoint should respond."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

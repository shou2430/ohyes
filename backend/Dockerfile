FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first (cache layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Create photo storage directory (Railway volume will mount over this)
RUN mkdir -p /data/photos

# Run with shell form to expand $PORT
CMD uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

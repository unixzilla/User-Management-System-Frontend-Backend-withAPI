FROM python:3.11-slim

WORKDIR /app

# Install system deps for Python packages (cryptography, psycopg2, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    libssl-dev \
    libffi-dev \
    python3-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml .

# Install Python deps (non-editable to avoid path issues)
RUN pip install --no-cache-dir ".[dev]"

# Copy application
COPY . .

# Ensure app module is importable
ENV PYTHONPATH=/app

# Create exports directory
RUN mkdir -p exports

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

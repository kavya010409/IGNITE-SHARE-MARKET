# Multi-stage production Python build
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Expose FastAPI ASGI port
EXPOSE 8000

# Script entry point to run DB seeding then launch Uvicorn server
CMD ["sh", "-c", "python -m scripts.seed_data && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

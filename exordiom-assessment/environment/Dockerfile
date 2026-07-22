FROM python:3.12-slim

RUN apt-get update && apt-get install -y curl && \
    curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

# Install dependencies (Layer cached)
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

# Copy the environment source
COPY . /app/

# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install git and other build dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Clone and install SWE-agent in a single layer
RUN git clone --depth 1 https://github.com/SWE-agent/SWE-agent.git /tmp/SWE-agent \
    && cd /tmp/SWE-agent \
    && pip install --no-cache-dir --editable . \
    && cd /app \
    && rm -rf /tmp/SWE-agent \
    && apt-get purge -y git build-essential \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PORT=8000
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"] 
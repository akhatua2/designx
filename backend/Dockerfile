# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install git (needed for SWE-agent to clone target repos)
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy local SWE-agent repo and install it
COPY SWE-agent/ /app/SWE-agent/
RUN cd /app/SWE-agent \
    && python -m pip install --upgrade pip \
    && pip install --editable . \
    && pip install 'swe-rex[modal]' \
    && mkdir -p trajectories

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app/SWE-agent:$PYTHONPATH

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"] 
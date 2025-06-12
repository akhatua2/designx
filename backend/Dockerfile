
# --- Builder Stage ---
FROM python:3.9-slim as builder

# Set the working directory
WORKDIR /app

# Install build dependencies
RUN pip install --upgrade pip

# Copy and install requirements
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

#
# --- Final Stage ---
#
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copy the wheels and install them
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application
# Use 0.0.0.0 to make it accessible from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
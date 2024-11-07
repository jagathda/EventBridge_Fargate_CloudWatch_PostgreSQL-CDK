# Use the official Python 3.12 slim image
FROM python:3.12-slim

# Set environment variables to minimize Python warnings and configure container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for PostgreSQL and other utilities
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements.txt file and install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the Python script(s) into the /app directory
COPY message_logger.py /app/

# Add a health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
    CMD pg_isready -h $PG_HOST -p $PG_PORT || exit 1

# Run the Python script (ensure the name matches your script file)
CMD ["python", "/app/message_logger.py"]

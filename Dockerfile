# Use an official Python runtime as a base image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install psycopg2 and system dependencies for PostgreSQL in one RUN command
RUN apt-get update && \
    apt-get install -y libpq-dev gcc && \
    pip install psycopg2-binary && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container
COPY . .

# Define the command to run the application
CMD ["python", "message_logger.py"]

import logging
import json
import psycopg2
import os

# Configure logging
logging.basicConfig(level=logging.INFO)

# PostgreSQL connection details from environment variables
DB_HOST = os.getenv('PG_HOST')
DB_NAME = os.getenv('PG_DB')
DB_USER = os.getenv('PG_USER')
DB_PASSWORD = os.getenv('PG_PASSWORD')
DB_PORT = os.getenv('PG_PORT', '5432')  # Default to port 5432 if not set

# Log the database connection details (excluding the password for security reasons)
logging.info(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} with user {DB_USER}")

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        return psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT
        )
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        raise

def log_event_to_db(event):
    """Log the event to the PostgreSQL database."""
    with connect_to_db() as conn:
        with conn.cursor() as cursor:
            # Create the table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS event_logs (
                    id SERIAL PRIMARY KEY,
                    event_type VARCHAR(255),
                    event_data JSONB,
                    received_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            
            # Log the entire event data into the database
            cursor.execute("""
                INSERT INTO event_logs (event_type, event_data) 
                VALUES (%s, %s)
            """, (event.get('detail-type', 'Unknown'), json.dumps(event)))
            
        # Commit the transaction
        conn.commit()
    
    logging.info("Event logged successfully.")

def handler(event, context):
    """Main event handler function."""
    
    # Add more logging at the beginning to verify the function is being invoked
    logging.info("Handler function invoked.")
    
    if event:
        logging.info(f"Received event: {json.dumps(event, indent=4)}")
    else:
        logging.warning("No event received.")
        return "No event received"

    # Log event to PostgreSQL
    logging.info("Processing event for database logging.")
    log_event_to_db(event)
    
    return "Event processed and logged successfully"

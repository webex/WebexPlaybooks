import os
from dotenv import load_dotenv

# Load environment variables from a .env file in the project root
load_dotenv()

class Config:
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')  # Default for local dev

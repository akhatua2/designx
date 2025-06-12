#!/bin/bash

# DesignX Backend Start Script

echo "🚀 Starting DesignX Backend..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please create a .env file with your GitHub OAuth credentials."
    echo ""
    echo "Example .env file:"
    echo "GITHUB_CLIENT_ID=your_github_client_id_here"
    echo "GITHUB_CLIENT_SECRET=your_github_client_secret_here"
    echo "PORT=8000"
    echo "HOST=0.0.0.0"
    echo "DEBUG=True"
    echo ""
    echo "Get your GitHub OAuth credentials at:"
    echo "https://github.com/settings/developers"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo "🌟 Starting FastAPI server..."
echo "Backend will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo ""
python main.py 
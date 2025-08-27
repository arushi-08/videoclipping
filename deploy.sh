#!/bin/bash

echo "🚀 Video Editor Deployment Script"
echo "=================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# API Configuration
API_KEY=your_api_key_here
BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat

# Application Settings
UPLOAD_DIR=uploads
PROCESSED_DIR=processed
MUSIC_UPLOAD_DIR=bg_music
WHISPER_MODEL=base
DEFAULT_DUP_THRESH=0.85
DEFAULT_FONT_SIZE=28
EOF
    echo "✅ .env file created. Please update it with your actual API keys."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the .env file with your API keys"
echo "2. Run: python run.py"
echo "3. Open: http://localhost:8000"
echo ""
echo "For deployment:"
echo "1. Push to GitHub"
echo "2. Connect to Railway/Render/Heroku"
echo "3. Set environment variables in your hosting platform"

#!/bin/bash

echo "🚀 Setting up Modern Chrome Extension..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""

# Build the extension
echo "🔨 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Extension built successfully"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📖 Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Enable 'Developer mode' (top-right toggle)"
    echo "3. Click 'Load unpacked' and select the 'dist' folder"
    echo "4. The extension should now be loaded!"
    echo ""
    echo "🔧 Development:"
    echo "Run 'npm run dev' for development with hot reload"
    echo ""
else
    echo "❌ Failed to build extension"
    exit 1
fi 
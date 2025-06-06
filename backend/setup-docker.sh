#!/bin/bash

echo "🚀 Setting up Docker-based Code Execution API..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Docker daemon is not running. Please start Docker first."
    exit 1
fi

echo "Docker is installed and running"

# Create project structure
mkdir -p app
echo "📁 Created project structure"

# Build the Python executor image first
echo "🔨 Building Python executor image..."
docker build -f Dockerfile.executor -t python-executor:latest .

if [ $? -eq 0 ]; then
    echo "Python executor image built successfully"
else
    echo "Failed to build Python executor image"
    exit 1
fi

# Install Python dependencies for the API
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "Python dependencies installed successfully"
else
    echo "Failed to install Python dependencies"
    echo "You may need to create a virtual environment first:"
    echo "python -m venv venv"
    echo "source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
    echo "pip install -r requirements.txt"
fi

# Set permissions for Docker socket (Linux/Mac)
if [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "darwin"* ]]; then
    echo "🔧 Setting up Docker socket permissions..."
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || echo "⚠️  Could not set Docker socket permissions. You may need to run with sudo."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the API server:"
echo "   python api.py"
echo ""
echo "🌐 The API will be available at:"
echo "   http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""
echo "🔧 To test the setup:"
echo "   curl -X POST http://localhost:8000/execute \\"
echo "   -H \"Content-Type: application/json\" \\"
echo "   -d '{\"sourceCode\": \"print(\\\"Hello Docker!\\\")\"})'"
echo ""
echo "📋 Available features:"
echo "   Real Python execution in isolated containers"
echo "   Real pip package installation"
echo "   File persistence across commands"
echo "   Image generation (matplotlib, etc.)"
echo "   WebSocket terminal interface"
echo "   File download support"
echo ""
echo "⚠️  Note: Make sure your frontend is configured to connect to http://localhost:8000"

#!/bin/bash
echo "========================================"
echo "   Starting with Docker"
echo "========================================"
echo ""

# Check if Docker is installed
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please install Docker from https://docs.docker.com/engine/install/"
    exit 1
fi
echo "Docker found:"
docker --version
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp ".env.example" ".env"
    echo ""
    echo "IMPORTANT: Please edit .env file with your production values!"
    read -p "Press Enter after editing .env file..."
fi

echo "Starting Docker containers..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to start Docker containers"
    exit 1
fi

echo ""
echo "========================================"
echo "   Docker Containers Started!"
echo "========================================"
echo ""
echo "Frontend: http://localhost"
echo "Backend:  http://localhost:5000"
echo "Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  - View logs:    docker-compose logs -f"
echo "  - Stop:         docker-compose down"
echo "  - Restart:      docker-compose restart"
echo ""
echo "========================================"

#!/bin/bash
# Setup script for LinkedIn Scraper Server (Linux/macOS)

# Exit on error
set -e

# Navigate to script directory
cd "$(dirname "$0")"

echo "Creating virtual environment..."
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

$PYTHON_CMD -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "To run the server:"
echo "  1. Activate venv:  source venv/bin/activate"
echo "  2. Run server:     python main.py"
echo ""

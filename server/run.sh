#!/bin/bash
# Run server script (Linux/macOS)

# Navigate to script directory
cd "$(dirname "$0")"

# Activate venv if exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Run server
python main.py

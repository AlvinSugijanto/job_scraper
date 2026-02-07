@echo off
REM Setup script for LinkedIn Scraper Server (Windows)

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To run the server:
echo   1. Activate venv:  venv\Scripts\activate
echo   2. Run server:     python main.py
echo.

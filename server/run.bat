@echo off
REM Run server script (Windows)

REM Activate venv if exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Run server
python main.py

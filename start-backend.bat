@echo off
echo Starting StockPlay Backend Server...
cd /d "e:\python projects\StockPlay\stock_api"
echo Current directory: %CD%
echo.
echo Installing requirements...
pip install -r requirements.txt
echo.
echo Starting FastAPI server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause

from fastapi import APIRouter, HTTPException
import yfinance as yf
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    period: Optional[str] = "1y",
    interval: Optional[str] = "1d"
):
    try:
        # Add -USD suffix if not present
        if not symbol.endswith('-USD'):
            symbol = f"{symbol}-USD"
            
        # Fetch data from yfinance
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for symbol {symbol}"
            )
            
        # Convert to list format for frontend
        result = {
            "dates": data.index.strftime('%Y-%m-%d %H:%M:%S').tolist(),
            "open": data['Open'].tolist(),
            "high": data['High'].tolist(),
            "low": data['Low'].tolist(),
            "close": data['Close'].tolist(),
            "volume": data['Volume'].tolist()
        }
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching data: {str(e)}"
        )

@router.get("/info/{symbol}")
async def get_symbol_info(symbol: str):
    try:
        # Add -USD suffix if not present
        if not symbol.endswith('-USD'):
            symbol = f"{symbol}-USD"
            
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info:
            raise HTTPException(
                status_code=404,
                detail=f"No information found for symbol {symbol}"
            )
            
        return {
            "name": info.get("longName", ""),
            "symbol": symbol,
            "currentPrice": info.get("currentPrice", 0),
            "marketCap": info.get("marketCap", 0),
            "volume24h": info.get("volume24h", 0),
            "change24h": info.get("regularMarketChangePercent", 0)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching symbol info: {str(e)}"
        ) 
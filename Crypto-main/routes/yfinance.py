from fastapi import APIRouter, HTTPException
import yfinance as yf
from typing import Optional
from datetime import datetime, timedelta
import time

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
        
        # Implement retries with exponential backoff
        max_retries = 3
        retry_delay = 2  # Initial delay in seconds
        
        for attempt in range(max_retries):
            try:
                # Fetch data from yfinance with progress disabled
                ticker = yf.Ticker(symbol)
                data = ticker.history(period=period, interval=interval, progress=False)
                
                if not data.empty:
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
                if attempt < max_retries - 1:
                    print(f"Attempt {attempt + 1} failed for {symbol}: {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to fetch data for {symbol} after {max_retries} attempts: {str(e)}"
                    )
        
        raise HTTPException(
            status_code=404,
            detail=f"No data found for symbol {symbol}"
        )
        
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
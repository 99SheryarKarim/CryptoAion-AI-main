import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
import yfinance as yf
import joblib
from sklearn.preprocessing import MinMaxScaler
from config import settings
from fastapi import HTTPException
import time
from requests.exceptions import RequestException
from functools import lru_cache
from datetime import datetime, timedelta
import json
import pickle
from pathlib import Path

# Constants
LOOKBACK = 60
EPOCHS = 50
MODEL_PATH = "models"  # Directory to store models for different coins
CACHE_PATH = "cache"   # Directory to store cached data
MAX_RETRIES = 5
RETRY_DELAY = 30
CACHE_DURATION = 1800  # 30 minutes
RATE_LIMIT_WINDOW = 300  # 5 minutes
MAX_REQUESTS_PER_WINDOW = 1

# Create necessary directories
os.makedirs(MODEL_PATH, exist_ok=True)
os.makedirs(CACHE_PATH, exist_ok=True)

# Timeframe mapping for yfinance
TIMEFRAME_MAP = {
    "30m": {"period": "7d", "interval": "30m"},
    "1h": {"period": "60d", "interval": "1h"},
    "4h": {"period": "60d", "interval": "1h"},
    "24h": {"period": "730d", "interval": "1d"}
}

# Cache for storing data
_data_cache = {}
_last_request_time = {}
_request_history = {}

def _save_cache_to_disk(cache_key, data):
    """Save data to disk cache"""
    cache_file = os.path.join(CACHE_PATH, f"{cache_key}.pkl")
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump({
                'data': data,
                'timestamp': datetime.now()
            }, f)
    except Exception as e:
        print(f"Error saving cache to disk: {str(e)}")

def _load_cache_from_disk(cache_key):
    """Load data from disk cache"""
    cache_file = os.path.join(CACHE_PATH, f"{cache_key}.pkl")
    try:
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                cache_data = pickle.load(f)
                if (datetime.now() - cache_data['timestamp']).total_seconds() < CACHE_DURATION:
                    return cache_data['data']
    except Exception as e:
        print(f"Error loading cache from disk: {str(e)}")
    return None

def _check_rate_limit(symbol):
    """Check if we're within rate limits for a symbol"""
    current_time = datetime.now()
    
    if symbol not in _request_history:
        _request_history[symbol] = []
    
    _request_history[symbol] = [
        t for t in _request_history[symbol]
        if (current_time - t).total_seconds() < RATE_LIMIT_WINDOW
    ]
    
    if len(_request_history[symbol]) >= MAX_REQUESTS_PER_WINDOW:
        oldest_request = _request_history[symbol][0]
        wait_time = RATE_LIMIT_WINDOW - (current_time - oldest_request).total_seconds()
        if wait_time > 0:
            print(f"Rate limit reached for {symbol}. Waiting {wait_time:.1f} seconds...")
            time.sleep(wait_time)
            return _check_rate_limit(symbol)
    
    _request_history[symbol].append(current_time)
    return True

def get_latest_data(symbol, timeframe="1h"):
    """Get latest data with proper timeframe handling and caching"""
    if timeframe not in TIMEFRAME_MAP:
        raise ValueError(f"Invalid timeframe. Must be one of {list(TIMEFRAME_MAP.keys())}")
    
    if not symbol.endswith('-USD'):
        symbol = f"{symbol}-USD"
    
    cache_key = f"{symbol}_{timeframe}"
    current_time = datetime.now()
    
    # Check memory cache first
    if cache_key in _data_cache:
        cache_time = _last_request_time.get(cache_key, datetime.min)
        if (current_time - cache_time).total_seconds() < CACHE_DURATION:
            print(f"Using memory cached data for {symbol}")
            return _data_cache[cache_key]
    
    # Check disk cache
    cached_data = _load_cache_from_disk(cache_key)
    if cached_data is not None:
        print(f"Using disk cached data for {symbol}")
        _data_cache[cache_key] = cached_data
        _last_request_time[cache_key] = current_time
        return cached_data
    
    # If no cache, fetch new data
    _check_rate_limit(symbol)
    tf_config = TIMEFRAME_MAP[timeframe]
    data = None
    
    for attempt in range(MAX_RETRIES):
        try:
            print(f"Attempting to fetch data for {symbol} (attempt {attempt + 1}/{MAX_RETRIES})")
            data = yf.download(
                tickers=symbol,
                period=tf_config["period"],
                interval=tf_config["interval"],
                timeout=60
            )
            
            if not data.empty:
                # Process data
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = [col[0] for col in data.columns]
                data.columns = [str(col).replace(' ', '_') for col in data.columns]
                
                # Add technical indicators
                data['SMA_10'] = data['Close'].rolling(window=10).mean()
                data['RSI'] = 100 - (100 / (1 + (data['Close'].diff().rolling(14).mean() / data['Close'].diff().rolling(14).std())))
                data['MACD'] = data['Close'].ewm(span=12, adjust=False).mean() - data['Close'].ewm(span=26, adjust=False).mean()
                data['Bollinger_Upper'] = data['Close'].rolling(window=20).mean() + 2 * data['Close'].rolling(window=20).std()
                data['Bollinger_Lower'] = data['Close'].rolling(window=20).mean() - 2 * data['Close'].rolling(window=20).std()
                
                data.dropna(inplace=True)
                
                # Update both memory and disk cache
                _data_cache[cache_key] = data
                _last_request_time[cache_key] = current_time
                _save_cache_to_disk(cache_key, data)
                
                print(f"Successfully fetched and cached data for {symbol}")
                break
            
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAY * (2 ** attempt)
                print(f"Empty data received for {symbol}, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                
        except Exception as e:
            if "YFRateLimitError" in str(e):
                wait_time = RETRY_DELAY * (2 ** attempt)
                print(f"Rate limit hit for {symbol}, waiting {wait_time} seconds...")
                time.sleep(wait_time)
            elif attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAY * (2 ** attempt)
                print(f"Error on attempt {attempt + 1}: {str(e)}")
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise ValueError(f"Failed to fetch data after {MAX_RETRIES} attempts: {str(e)}")
    
    if data is None or data.empty:
        raise ValueError(f"No data retrieved for {symbol}. Please try again later.")
    
    return data

def predict_next_price(symbol, timeframe="1h"):
    """Predict next price with better error handling and logging"""
    try:
        print(f"Starting prediction for {symbol} with timeframe {timeframe}")
        
        # Get latest data with caching
        try:
            data = get_latest_data(symbol, timeframe)
            print(f"Successfully retrieved data for {symbol}, shape: {data.shape}")
        except Exception as e:
            print(f"Error getting latest data: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch data for {symbol}: {str(e)}"
            )
        
        if data.empty:
            error_msg = f"No data available for prediction for {symbol}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Prepare data for prediction
        try:
            features = ['Close', 'SMA_10', 'RSI', 'MACD', 'Bollinger_Upper', 'Bollinger_Lower']
            data = data[features].values
            print(f"Prepared data shape: {data.shape}")
        except Exception as e:
            error_msg = f"Error preparing data: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Normalize data
        try:
            scaler = MinMaxScaler()
            data_normalized = scaler.fit_transform(data)
            print("Data normalized successfully")
        except Exception as e:
            error_msg = f"Error normalizing data: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Prepare sequence
        try:
            X = []
            for i in range(LOOKBACK, len(data_normalized)):
                X.append(data_normalized[i-LOOKBACK:i])
            X = np.array(X)
            print(f"Prepared sequence shape: {X.shape}")
        except Exception as e:
            error_msg = f"Error preparing sequence: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Convert to PyTorch tensor
        try:
            X = torch.FloatTensor(X)
            print("Converted to PyTorch tensor")
        except Exception as e:
            error_msg = f"Error converting to tensor: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Load model
        try:
            model_path = os.path.join(MODEL_PATH, f"{symbol.replace('-USD', '')}_{timeframe}_model.pth")
            print(f"Looking for model at: {model_path}")
            
            if not os.path.exists(model_path):
                error_msg = f"Model not found at {model_path}"
                print(error_msg)
                raise HTTPException(status_code=404, detail=error_msg)
            
            model = BiLSTMWithAttention(input_size=6, hidden_size=128, num_layers=3)
            model.load_state_dict(torch.load(model_path))
            model.eval()
            print("Model loaded successfully")
        except Exception as e:
            error_msg = f"Error loading model: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Make prediction
        try:
            with torch.no_grad():
                prediction = model(X[-1:])
                prediction = prediction.numpy()
            print("Prediction made successfully")
        except Exception as e:
            error_msg = f"Error making prediction: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Inverse transform prediction
        try:
            prediction = scaler.inverse_transform(np.concatenate([np.zeros((1, len(features)-1)), prediction.reshape(-1, 1)], axis=1))[:, -1]
            print(f"Prediction transformed: {prediction[0]}")
        except Exception as e:
            error_msg = f"Error transforming prediction: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "predicted_price": float(prediction[0]),
            "current_price": float(data[-1, 0]),  # Close price
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error predicting price for {symbol}: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

def get_next_timestamp(last_timestamp, timeframe):
    """Calculate next timestamp based on timeframe"""
    timeframe_deltas = {
        "30m": pd.Timedelta(minutes=30),
        "1h": pd.Timedelta(hours=1),
        "4h": pd.Timedelta(hours=4),
        "24h": pd.Timedelta(days=1)
    }
    return last_timestamp + timeframe_deltas[timeframe]

class BiLSTMWithAttention(nn.Module):
    def __init__(self, input_size=6, hidden_size=128, num_layers=3):
        super(BiLSTMWithAttention, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True
        )
        self.attn = nn.Linear(hidden_size * 2, 1)
        self.fc = nn.Linear(hidden_size * 2, 1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        attention_weights = torch.softmax(self.attn(lstm_out), dim=1)
        attended_output = torch.sum(attention_weights * lstm_out, dim=1)
        return self.fc(attended_output)

def add_technical_indicators(symbol, timeframe="24h"):
    """Add technical indicators with timeframe support"""
    data = get_latest_data(symbol, timeframe)
    
    # Normalize Data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data[['Close', 'SMA_10', 'RSI', 'MACD', 'Bollinger_Upper', 'Bollinger_Lower']])

    # Prepare Input for LSTM
    X, y = [], []
    for i in range(len(scaled_data) - LOOKBACK - 1):
        X.append(scaled_data[i:i+LOOKBACK])
        y.append(scaled_data[i+LOOKBACK, 0])
    X, y = np.array(X), np.array(y)

    # Convert to Tensors
    X_train, y_train = torch.FloatTensor(X), torch.FloatTensor(y)

    model = BiLSTMWithAttention(input_size=6, hidden_size=128, num_layers=3)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)

    return X_train, y_train, model, criterion, optimizer, scaler, scaled_data

def get_model(symbol, timeframe="24h"):
    """Get or train model with timeframe support"""
    # Create models directory if it doesn't exist
    os.makedirs(MODEL_PATH, exist_ok=True)
    
    # Create model path with symbol and timeframe
    model_path = os.path.join(MODEL_PATH, f"{symbol}_{timeframe}_model.pth")
    scaler_path = os.path.join(MODEL_PATH, f"{symbol}_{timeframe}_scaler.pkl")
    
    X_train, y_train, model, criterion, optimizer, scaler, scaled_data = add_technical_indicators(symbol, timeframe)
    
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        print(f"Loading pre-trained model for {symbol} {timeframe} timeframe...")
        model = BiLSTMWithAttention(input_size=6, hidden_size=128, num_layers=3)
        model.load_state_dict(torch.load(model_path))
        scaler = joblib.load(scaler_path)
    else:
        print(f"Training model for {symbol} {timeframe} timeframe...")
        for epoch in range(EPOCHS):
            model.train()
            optimizer.zero_grad()
            output = model(X_train)
            loss = criterion(output.squeeze(), y_train)
            loss.backward()
            optimizer.step()
            if epoch % 10 == 0:
                print(f"Epoch {epoch}, Loss: {loss.item()}")

        # Save model and scaler
        torch.save(model.state_dict(), model_path)
        joblib.dump(scaler, scaler_path)
        print(f"Model saved for {symbol} {timeframe} timeframe.")

    return model, X_train, scaler, scaled_data

def prepare_data_for_prediction(symbol, timeframe="24h"):
    """Prepare prediction data with timeframe support"""
    try:
        # Get latest data first to validate the symbol and timeframe
        latest_data = get_latest_data(symbol, timeframe)
        
        # Get model and data
        model, X_train, scaler, scaled_data = get_model(symbol, timeframe)
        model.eval()
        
        with torch.no_grad():
            predictions = model(X_train).numpy()
        
        # Denormalize predictions
        predictions_denorm = scaler.inverse_transform(
            np.concatenate([predictions, np.zeros((len(predictions), 5))], axis=1)
        )[:, 0]
        
        # Get actual prices
        actuals = latest_data['Close'].values[-len(predictions_denorm):]
        
        return actuals, predictions_denorm
    except Exception as e:
        print(f"Error in prepare_data_for_prediction: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Failed to prepare prediction data: {str(e)}"
        )
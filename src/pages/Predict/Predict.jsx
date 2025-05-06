"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Info,
  TrendingUp,
  BarChart2,
  DollarSign,
  Clock,
  Award,
  AlertTriangle,
  PieChart,
  Bell,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react"
import "./MarketPredict.css"
import { useDispatch, useSelector } from "react-redux"
import { PredictNextPrice, FetchLastPredictions } from "../../RTK/Slices/PredictSlice"
import { COINCAP_API_BASE_URL, COINCAP_API_KEY, RATE_LIMIT_DELAY } from "../../config"

const Predict = () => {
  const dispatch = useDispatch()
  // Get prediction data from Redux store
  const { predicted_next_price, actuals, predictions, loading: predictionLoading, error: predictionError } = useSelector((state) => state.Prediction)
  const [error, setError] = useState(null)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [predictedPriceChange, setPredictedPriceChange] = useState(null)

  // Update current price and predicted price change when actuals or predicted price changes
  useEffect(() => {
    if (actuals && actuals.length > 0) {
      const current = actuals[actuals.length - 1]?.price || null
      setCurrentPrice(current)
      
      // Calculate predicted price change if we have both prices
      if (current && predicted_next_price && predicted_next_price > 0) {
        const change = ((predicted_next_price - current) / current) * 100
        setPredictedPriceChange(change)
      } else {
        setPredictedPriceChange(null)
      }
    }
  }, [actuals, predicted_next_price])

  const [selectedItem, setSelectedItem] = useState(null)
  const [chartData, setChartData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [localError, setLocalError] = useState(null)
  const [timeframe, setTimeframe] = useState("1h")
  const [isPredicting, setIsPredicting] = useState(false)
  const [probabilityData, setProbabilityData] = useState(null)
  const [showProbability, setShowProbability] = useState(false)
  const [notification, setNotification] = useState(null)
  const [pendingTimeframe, setPendingTimeframe] = useState(null)
  const [coinDetails, setCoinDetails] = useState(null)
  const [coinStats, setCoinStats] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [predictionResults, setPredictionResults] = useState([])
  const [userInitiatedPrediction, setUserInitiatedPrediction] = useState(false)
  const chartRef = useRef(null)
  const statsChartRef = useRef(null)
  const animationRef = useRef(null)
  const liveUpdateRef = useRef(null)
  const apiRetryCount = useRef(0)
  const MAX_RETRIES = 3
  const notificationTimeoutRef = useRef(null)

  // Chart interaction state
  const [chartScale, setChartScale] = useState(1)
  const [chartOffset, setChartOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [extendedChartData, setExtendedChartData] = useState([])
  const [chartVerticalOffset, setChartVerticalOffset] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)

  // Add rate limiter state
  const [requestQueue, setRequestQueue] = useState([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const lastRequestTime = useRef(0)
  const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests

  // Add prediction states
  const [predictedPrice, setPredictedPrice] = useState(null)
  const [showPrediction, setShowPrediction] = useState(false)
  const [showPredictionLine, setShowPredictionLine] = useState(false)
  const [predictionStartTime, setPredictionStartTime] = useState(0)

  // Add new state for tracking active timeframe
  const [activeTimeframe, setActiveTimeframe] = useState(null)
  const [isTimeframeChanging, setIsTimeframeChanging] = useState(false)

  // Chart interaction functions
  const handleZoomIn = () => {
    setChartScale(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setChartScale(prev => Math.max(prev / 1.2, 0.5))
  }

  const handleChartReset = () => {
    setChartScale(1)
    setChartOffset(0)
    setChartVerticalOffset(0)
  }

  const handleChartTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart(e.touches[0].clientX)
      setDragStartY(e.touches[0].clientY)
    }
  }

  const handleChartTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return

    const deltaX = e.touches[0].clientX - dragStart
    const deltaY = e.touches[0].clientY - dragStartY

    setChartOffset(prev => prev + deltaX)
    setChartVerticalOffset(prev => prev + deltaY)

    setDragStart(e.touches[0].clientX)
    setDragStartY(e.touches[0].clientY)
  }

  const handleChartTouchEnd = () => {
    setIsDragging(false)
  }

  // Enhanced handleTimeframeChange function
  const handleTimeframeChange = async (newTimeframe) => {
    if (newTimeframe === timeframe || isTimeframeChanging) return;
    
    setIsTimeframeChanging(true);
    setPendingTimeframe(newTimeframe);
    setTimeframe(newTimeframe); // Add this line to update the timeframe state
    
    // Add visual feedback for the selected timeframe
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    timeframeButtons.forEach(btn => {
      if (btn.textContent === newTimeframe) {
        btn.classList.add('pending');
      } else {
        btn.classList.remove('pending');
      }
    });
    
    showNotification({
      type: 'info',
      message: `Updating to ${newTimeframe} timeframe...`
    });
    
    // Reset prediction states
    setPrediction(null);
    setPredictionError(null);
    setPredictionLoading(false);
    
    // Clear existing chart data
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    const fetchData = async () => {
      try {
        // First try to fetch historical data
        const response = await fetch('/api/predictions/historical', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: selectedItem.symbol,
            timeframe: newTimeframe
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Generate extended data for scrolling
          const extendedData = generateExtendedData(data, newTimeframe);
          setChartData(extendedData);
          
          // Update chart with new data
          updateChart(extendedData);
          
          // Start training for the new timeframe
          setPredictionLoading(true);
          try {
            const trainResponse = await fetch('/api/predictions/train', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                symbol: selectedItem.symbol,
                timeframe: newTimeframe,
                data: extendedData
              })
            });
            
            if (!trainResponse.ok) {
              throw new Error('Training failed');
            }
            
            const trainResult = await trainResponse.json();
            if (trainResult.success) {
              // Fetch predictions after training is complete
              await fetchPredictions(newTimeframe);
            } else {
              throw new Error(trainResult.error || 'Training failed');
            }
          } catch (trainError) {
            console.error('Training error:', trainError);
            showNotification({
              type: 'error',
              message: 'Model training failed',
              details: trainError.message
            });
          } finally {
            setPredictionLoading(false);
          }
        } else {
          throw new Error('No historical data received');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to generated data
        const fallbackData = generateHistoricalData(selectedItem, newTimeframe);
        setChartData(fallbackData);
        updateChart(fallbackData);
        
        showNotification({
          type: 'warning',
          message: 'Using generated data due to fetch error'
        });
      } finally {
        setIsTimeframeChanging(false);
        setPendingTimeframe(null);
        
        // Remove pending class from all buttons
        timeframeButtons.forEach(btn => btn.classList.remove('pending'));
      }
    };
    
    await fetchData();
  };

  // Enhanced useEffect for chart data updates
  useEffect(() => {
    if (!selectedItem || !activeTimeframe) return

    const fetchInitialData = async () => {
      setIsLoading(true)
      setLocalError(null)

      try {
        // Try to fetch data from API
        const data = await fetchHistoricalData(selectedItem, activeTimeframe)
        if (data && data.length > 0) {
          setChartData(data)
          // Generate extended data for scrolling
          const extendedData = generateExtendedHistoricalData(data, selectedItem)
          setExtendedChartData(extendedData)
        }
      } catch (err) {
        console.error("Error fetching initial data:", err)
        // Fallback to generated data
        const data = generateRealisticData(selectedItem, activeTimeframe)
        setChartData(data)
        // Generate extended data for scrolling
        const extendedData = generateExtendedHistoricalData(data, selectedItem)
        setExtendedChartData(extendedData)

        showNotification({
          type: "info",
          message: "Using market simulation",
          details: "Real-time data temporarily unavailable. Using advanced market simulation.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [selectedItem, activeTimeframe]) // Only run when selectedItem or activeTimeframe changes

  // Enhanced drawChart function to prevent unnecessary updates
  const drawChart = () => {
    if (!chartRef.current || !chartData.length || isTimeframeChanging) return

    const canvas = chartRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set transparent background
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, width, height)

    // Calculate chart dimensions
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Find min and max values
    const values = chartData.map(d => d.price).filter(v => !isNaN(v) && v !== undefined)
    if (values.length === 0) return
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    // Apply zoom and offset transformations
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(chartScale, chartScale)
    ctx.translate(-width / 2 + chartOffset, -height / 2 + chartVerticalOffset)

    // Draw cyan line (historical data) with enhanced smoothing
    ctx.beginPath()
    ctx.shadowColor = 'rgba(91, 192, 222, 0.3)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5
    ctx.strokeStyle = '#5bc0de'
    ctx.lineWidth = timeframe === "30m" ? 2.5 : 2
    ctx.globalAlpha = 0.8

    let firstValidPoint = true
    chartData.forEach((point, index) => {
      if (!point || point.price === undefined || isNaN(point.price)) return

      const x = padding + (chartWidth * (index / (chartData.length - 1)))
      const y = padding + (chartHeight * (1 - (point.price - minValue) / valueRange)) + 3

      if (firstValidPoint) {
        ctx.moveTo(x, y)
        firstValidPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0

    // Draw prediction line if available
    if (showPredictionLine && predictedPrice) {
      const lastPoint = chartData[chartData.length - 1]
      if (lastPoint) {
        ctx.beginPath()
        ctx.strokeStyle = '#FFA500'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.7

        const lastX = padding + (chartWidth * ((chartData.length - 1) / (chartData.length - 1)))
        const lastY = padding + (chartHeight * (1 - (lastPoint.price - minValue) / valueRange))
        const predX = padding + (chartWidth * (chartData.length / (chartData.length - 1)))
        const predY = padding + (chartHeight * (1 - (predictedPrice - minValue) / valueRange))

        ctx.moveTo(lastX, lastY)
        ctx.lineTo(predX, predY)
        ctx.stroke()
        ctx.globalAlpha = 1.0
      }
    }

    ctx.restore()

    // Draw grid lines and labels
    drawGridLines(ctx, width, height, padding, chartWidth, chartHeight, minValue, maxValue, valueRange)
  }

  // Add new function to draw grid lines
  const drawGridLines = (ctx, width, height, padding, chartWidth, chartHeight, minValue, maxValue, valueRange) => {
    // Draw horizontal grid lines
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (chartHeight * (1 - i / gridLines))
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Draw value labels
      const value = minValue + (valueRange * (i / gridLines))
      ctx.fillStyle = '#ffffff'
      ctx.font = '8px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(2), padding - 5, y + 3)
    }

    // Draw vertical grid lines and time labels
    const futureTimePoints = generateFutureTimePoints(timeframe)
    futureTimePoints.forEach((point, i) => {
      const xPos = padding + (chartWidth * (i / (futureTimePoints.length - 1)))
      
      // Draw vertical grid line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.moveTo(xPos, padding)
      ctx.lineTo(xPos, height - padding)
      ctx.stroke()

      // Draw time label
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(formatTimeLabel(point.time), xPos, height - padding + 15)
    })
  }

  const [utcTime, setUtcTime] = useState(new Date())

  // Update UTC time every minute
  useEffect(() => {
    const updateUTCTime = () => {
      setUtcTime(new Date())
    }

    // Update immediately and then every minute
    updateUTCTime()
    const interval = setInterval(updateUTCTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Format time for display based on timeframe
  const formatTimeLabel = (timestamp) => {
    const date = new Date(timestamp)
    const utcHours = date.getUTCHours()
    const utcMinutes = date.getUTCMinutes()
    const paddedMinutes = utcMinutes.toString().padStart(2, '0')
    
    switch(timeframe) {
      case '30m':
        return `${utcHours}:${paddedMinutes} UTC`
      case '1h':
        return `${utcHours}:${paddedMinutes} UTC`
      case '4h':
        return `${utcHours}:${paddedMinutes} UTC`
      case '24h':
        return `${date.getUTCDate()}/${date.getUTCMonth() + 1} ${utcHours}:${paddedMinutes} UTC`
      default:
        return `${utcHours}:${paddedMinutes} UTC`
    }
  }

  // Generate future time points based on current UTC time and timeframe
  const generateFutureTimePoints = (tf) => {
    const now = new Date()
    const timePoints = []
    const intervals = 6 // Number of intervals to show

    for (let i = 0; i <= intervals; i++) {
      const futureTime = new Date(now)
      switch(tf) {
        case '30m':
          futureTime.setUTCMinutes(now.getUTCMinutes() + (30 * i))
          break
        case '1h':
          futureTime.setUTCHours(now.getUTCHours() + i)
          break
        case '4h':
          futureTime.setUTCHours(now.getUTCHours() + (4 * i))
          break
        case '24h':
          futureTime.setUTCDate(now.getUTCDate() + i)
          break
        default:
          futureTime.setUTCHours(now.getUTCHours() + i)
      }
      timePoints.push({
        time: futureTime,
        label: formatTimeLabel(futureTime),
      })
    }
    return timePoints
  }

  // Format UTC time function
  const formatUTCTime = (date) => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
  }

  // Get the selected item from localStorage
  useEffect(() => {
    const item = localStorage.getItem("selectedMarketItem")
    if (!item) {
      window.location.href = "/" // Redirect to home if no item is selected
      return
    }
    const parsedItem = JSON.parse(item)
    setSelectedItem(parsedItem)

    // Fetch coin details from API
    fetchCoinDetails(parsedItem)

    // Check for any stored prediction results
    checkStoredPredictions(parsedItem)

    // Fetch previous predictions from backend
    dispatch(FetchLastPredictions({ symbol: parsedItem.symbol, timeframe }))
  }, [dispatch, timeframe])

  // Update chart data when backend predictions are received
  useEffect(() => {
    if (actuals.length > 0 && predictions.length > 0) {
      // Create chart data from actuals and predictions
      const now = new Date()
      const newChartData = actuals.map((actual, index) => {
        // Calculate time based on the current timeframe
        let time
        switch (timeframe) {
          case "30m":
            time = new Date(now.getTime() - (actuals.length - index) * 30 * 60 * 1000)
            break
          case "1h":
            time = new Date(now.getTime() - (actuals.length - index) * 60 * 60 * 1000)
            break
          case "4h":
            time = new Date(now.getTime() - (actuals.length - index) * 4 * 60 * 60 * 1000)
            break
          case "24h":
          default:
            time = new Date(now.getTime() - (actuals.length - index) * 60 * 60 * 1000)
        }

        return {
          time: time.toLocaleTimeString(),
          price: actual,
          fullTime: time,
        }
      })

      // Add prediction point if available
      if (predicted_next_price) {
        const lastTime = newChartData.length > 0 ? newChartData[newChartData.length - 1].fullTime : now
        let nextTime

        // Calculate next time based on timeframe
        switch (timeframe) {
          case "30m":
            nextTime = new Date(lastTime.getTime() + 30 * 60 * 1000)
            break
          case "1h":
            nextTime = new Date(lastTime.getTime() + 60 * 60 * 1000)
            break
          case "4h":
            nextTime = new Date(lastTime.getTime() + 4 * 60 * 60 * 1000)
            break
          case "24h":
          default:
            nextTime = new Date(lastTime.getTime() + 60 * 60 * 1000)
        }

        // Add prediction point
        newChartData.push({
          time: nextTime.toLocaleTimeString(),
          price: predicted_next_price,
          fullTime: nextTime,
          isPrediction: true,
        })
      }

      setChartData(newChartData)

      // Generate extended data for scrolling
      const extendedData = generateExtendedHistoricalData(newChartData, selectedItem)
      setExtendedChartData(extendedData)

      setIsLoading(false)
    }
  }, [actuals, predictions, predicted_next_price, timeframe, selectedItem])

  // Update probability data when predicted_next_price is received
  useEffect(() => {
    if (predicted_next_price && isPredicting) {
      // Update probability data with the predicted price
      const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0
      const priceChange = lastPrice > 0 ? (predicted_next_price - lastPrice) / lastPrice : 0

      // Calculate probability based on price change
      const priceIncreaseProb = Math.min(99, Math.max(1, Math.round(50 + priceChange * 1000)))

      // Update the stats probability with the new prediction
      if (coinStats) {
        setCoinStats({
          ...coinStats,
          probabilityIncrease: priceIncreaseProb,
        })
      }

      setProbabilityData({
        trend: priceChange >= 0 ? "bullish" : "bearish",
        confidence: Math.min(95, Math.max(60, 75 + priceChange * 100)),
        predictedPrice: predicted_next_price,
        timeframe: pendingTimeframe || timeframe,
        volatility: Math.abs(priceChange * 100),
        avgDailyChange: priceChange * 100,
        momentum: priceChange * 100,
        support: lastPrice * 0.95,
        resistance: lastPrice * 1.05,
        volumePrediction: selectedItem?.total_volume || 0,
        shortTermTarget: predicted_next_price * 1.01,
        midTermTarget: predicted_next_price * 1.05,
        longTermTarget: predicted_next_price * 1.1,
        sentimentScore: Math.min(100, Math.max(0, 50 + priceChange * 1000)),
        riskScore: Math.min(10, Math.max(1, Math.round(Math.abs(priceChange) * 100))),
        priceIncreaseProb,
        dataReady: true,
      })
    }
  }, [predicted_next_price, isPredicting, chartData, pendingTimeframe, timeframe, coinStats, selectedItem])

  // Check for stored predictions and show notifications if needed
  const checkStoredPredictions = (item) => {
    if (!item) return

    try {
      // Get stored predictions from localStorage
      const storedPredictions = JSON.parse(localStorage.getItem("predictionResults") || "[]")

      // Filter predictions for this specific asset
      const assetPredictions = storedPredictions.filter(
        (pred) => pred.assetId === item.id || pred.assetSymbol === item.symbol,
      )

      // Set to state
      setPredictionResults(assetPredictions)

      // Store the prediction results but don't show notifications on initial load
      // Notifications will only show when user explicitly clicks the predict button
      const hasUserPredicted = localStorage.getItem("userInitiatedPrediction") === "true"

      // We still filter recent predictions but don't show notifications automatically
      if (hasUserPredicted) {
        // Just keep track of recent predictions (last 24 hours) without showing notifications
        const recentPredictions = assetPredictions.filter(
          (pred) => new Date(pred.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000),
        )

        // We don't call showPredictionResultNotification here anymore
        // This prevents notifications from showing on page load
      }
    } catch (err) {
      console.error("Error checking stored predictions:", err)
    }
  }

  // Enhanced fetchWithRateLimit function with better 30m handling
  const fetchWithRateLimit = async (url, options = {}) => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime.current
    const retryCount = apiRetryCount.current

    // If we've hit the rate limit too many times, wait longer
    const waitTime = retryCount > 0 ? RATE_LIMIT_DELAY * Math.pow(2, retryCount) : RATE_LIMIT_DELAY

    // Add exponential backoff for 429 errors
    if (timeSinceLastRequest < waitTime) {
      await new Promise(resolve => setTimeout(resolve, waitTime - timeSinceLastRequest))
    }

    try {
      lastRequestTime.current = now
      const response = await fetchWithTimeout(url, options)

      if (response.status === 429) {
        // Rate limit hit - increment retry count and wait
        apiRetryCount.current = Math.min(apiRetryCount.current + 1, MAX_RETRIES)
        await new Promise(resolve => setTimeout(resolve, waitTime * 2))
        return fetchWithRateLimit(url, options) // Retry
      }

      // Reset retry count on success
      apiRetryCount.current = 0
      return response
    } catch (error) {
      console.error("Fetch error:", error)
      throw error
    }
  }

  // Process request queue
  useEffect(() => {
    if (requestQueue.length > 0 && !isProcessingQueue) {
      setIsProcessingQueue(true)
      const processNextRequest = async () => {
        if (requestQueue.length === 0) {
          setIsProcessingQueue(false)
          return
        }

        const now = Date.now()
        const timeSinceLastRequest = now - lastRequestTime.current

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
        }

        const request = requestQueue[0]
        try {
          const response = await fetchWithTimeout(request.url, request.options)
          request.resolve(response)
        } catch (error) {
          request.reject(error)
        }

        setRequestQueue(prev => prev.slice(1))
        lastRequestTime.current = Date.now()
        processNextRequest()
      }

      processNextRequest()
    }
  }, [requestQueue, isProcessingQueue])

  // Update fetchCoinDetails to use rate-limited fetch
  const fetchCoinDetails = async (item) => {
    try {
      setIsLoading(true)
      setLocalError(null)
      setCoinDetails(null)
      setCoinStats(null)

      // First try CoinGecko API
      try {
        const response = await fetchWithTimeout(
          `https://api.coingecko.com/api/v3/coins/${item.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`)
        }

        const data = await response.json()
        if (data) {
          const processedData = processCoinGeckoData(data, item)
          setCoinDetails(processedData)
          setCoinStats(generateCoinStats(processedData))
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.log("CoinGecko API failed, trying alternative...")
      }

      // If CoinGecko fails, try our backend API
      try {
        const response = await fetchWithTimeout(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/predictions/previous_predictions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              symbol: item.symbol,
              timeframe: timeframe
            })
          }
        )

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`)
        }

        const data = await response.json()
        if (data) {
          const processedData = processApiData(data, item)
          setCoinDetails(processedData)
          setCoinStats(generateCoinStats(processedData))
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.log("Backend API failed, using fallback data...")
      }

      // If all APIs fail, use fallback data
      const fallbackData = generateCoinDetails(item)
      setCoinDetails(fallbackData)
      setCoinStats(generateCoinStats(fallbackData))
      setIsLoading(false)

    } catch (error) {
      console.error("Error fetching coin details:", error)
      setLocalError("Failed to fetch coin details. Using fallback data.")
      const fallbackData = generateCoinDetails(item)
      setCoinDetails(fallbackData)
      setCoinStats(generateCoinStats(fallbackData))
      setIsLoading(false)
    }
  }

  // Add new function to process CoinGecko data
  const processCoinGeckoData = (data, item) => {
    if (!data) {
      generateCoinDetails(item)
      return
    }

    // Calculate additional metrics
    const marketDominance = (data.market_data.market_cap.usd / 2500000000000) * 100 // Assuming total market cap of 2.5T
    const volatilityScore = data.market_data.price_change_percentage_24h
      ? Math.abs(data.market_data.price_change_percentage_24h) / 2
      : Math.random() * 5

    // Generate random sentiment data (this would ideally come from a sentiment analysis API)
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Fetch market data for exchanges (in a real app, this would come from an API)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    // Set coin details with API data
    setCoinDetails({
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      priceUsd: data.market_data.current_price.usd,
      marketCapUsd: data.market_data.market_cap.usd,
      volumeUsd24Hr: data.market_data.total_volume.usd,
      supply: data.market_data.circulating_supply,
      maxSupply: data.market_data.max_supply,
      changePercent24Hr: data.market_data.price_change_percentage_24h,
      vwap24Hr: data.market_data.current_price.usd,
      explorer: data.links.blockchain_site[0],
      rank: data.market_cap_rank,
      marketDominance,
      volatilityScore,
      liquidityScore: Math.min(95, Math.max(30, Math.floor(Math.random() * 100))),
      sentimentData,
      exchanges,
      description: data.description.en || generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: data.market_data.ath.usd,
        allTimeLow: data.market_data.atl.usd,
        yearToDateChange: data.market_data.price_change_percentage_1y || Math.floor(Math.random() * 200) - 50,
      },
    })

    // Generate stats for the Stats tab
    generateCoinStats(data)

    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      priceUsd: data.market_data.current_price.usd,
      marketCapUsd: data.market_data.market_cap.usd,
      volumeUsd24Hr: data.market_data.total_volume.usd,
      supply: data.market_data.circulating_supply,
      maxSupply: data.market_data.max_supply,
      changePercent24Hr: data.market_data.price_change_percentage_24h,
      vwap24Hr: data.market_data.current_price.usd,
      explorer: data.links.blockchain_site[0],
      rank: data.market_cap_rank,
      marketDominance,
      volatilityScore,
      liquidityScore: Math.min(95, Math.max(30, Math.floor(Math.random() * 100))),
      sentimentData,
      exchanges,
      description: data.description.en || generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: data.market_data.ath.usd,
        allTimeLow: data.market_data.atl.usd,
        yearToDateChange: data.market_data.price_change_percentage_1y || Math.floor(Math.random() * 200) - 50,
      },
    }
  }

  // Helper function to fetch with timeout
  const fetchWithTimeout = (url, options = {}) => {
    const { timeout = 8000 } = options

    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)),
    ])
  }

  // Process API data
  const processApiData = (data, item) => {
    if (!data || !data.data) {
      generateCoinDetails(item)
      return
    }

    const coinData = data.data

    // Calculate additional metrics
    const marketDominance = ((Number.parseFloat(coinData.marketCapUsd) / 2500000000000) * 100) // Assuming total market cap of 2.5T
    const volatilityScore = item.price_change_percentage_24h
      ? Math.abs(item.price_change_percentage_24h) / 2
      : Number.parseFloat(coinData.changePercent24Hr)
        ? Math.abs(Number.parseFloat(coinData.changePercent24Hr)) / 5
        : Math.random() * 5

    // Generate random sentiment data
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Fetch market data for exchanges (random data)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    setCoinDetails({
      marketDominance,
      volatilityScore,
      liquidityScore: Math.min(95, Math.max(30, Math.floor(Math.random() * 100))),
      sentimentData,
      exchanges,
      description: generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: item.ath || item.current_price * (1 + Math.random()),
        allTimeLow: item.atl || item.current_price * (1 - Math.random() * 0.9),
        yearToDateChange: Math.floor(Math.random() * 200) - 50, // -50% to +150%
      },
    })

    // Generate stats for the Stats tab
    const probabilityIncrease = Math.floor(Math.random() * 40) + 30 // Random between 30-70%

    setCoinStats({
      probabilityIncrease,
      marketCapRank: item.market_cap_rank || 0,
      changePercent24Hr: item.price_change_percentage_24h || 0,
      supply: {
        current: item.circulating_supply || 0,
        max: item.total_supply || 0,
        percentCirculating: item.total_supply ? (item.circulating_supply / item.total_supply) * 100 : 100,
      },
      volumeRank: Math.floor(Math.random() * 20) + 1,
      volatility: Math.abs(item.price_change_percentage_24h) || Math.random() * 5,
      marketShare: ((item.market_cap || 0) / 2500000000000) * 100, // Assuming total market cap of 2.5T
    })
  }

  // Generate coin stats for the Stats tab
  const generateCoinStats = (coinData) => {
    if (!coinData) return

    // Calculate probability of increase based on recent performance
    const changePercent = Number.parseFloat(coinData.changePercent24Hr) || 0
    const vwap = Number.parseFloat(coinData.vwap24Hr) || 0
    const currentPrice = Number.parseFloat(coinData.priceUsd) || 0

    // Calculate probability (this is a simplified model)
    let probabilityIncrease = 50 // Base probability

    // Adjust based on 24h change
    if (changePercent > 0) {
      probabilityIncrease += Math.min(20, changePercent * 2)
    } else {
      probabilityIncrease -= Math.min(20, Math.abs(changePercent) * 2)
    }

    // Adjust based on price vs VWAP
    if (vwap > 0) {
      const vwapDiff = ((currentPrice - vwap) / vwap) * 100
      if (vwapDiff > 0) {
        probabilityIncrease -= Math.min(10, vwapDiff * 2) // Above VWAP might indicate overbought
      } else {
        probabilityIncrease += Math.min(10, Math.abs(vwapDiff) * 2) // Below VWAP might indicate potential rise
      }
    }

    // Adjust based on market cap rank
    const rank = Number.parseInt(coinData.rank) || 100
    if (rank <= 10) {
      probabilityIncrease += 5 // Top coins tend to be more stable
    } else if (rank <= 50) {
      probabilityIncrease += 2
    }

    // Ensure probability is between 1 and 99
    probabilityIncrease = Math.max(1, Math.min(99, Math.round(probabilityIncrease)))

    // Set coin stats
    setCoinStats({
      probabilityIncrease,
      marketCapRank: Number.parseInt(coinData.rank) || 0,
      changePercent24Hr: changePercent,
      supply: {
        current: Number.parseFloat(coinData.supply) || 0,
        max: Number.parseFloat(coinData.maxSupply) || 0,
        percentCirculating: coinData.maxSupply
          ? (Number.parseFloat(coinData.supply) / Number.parseFloat(coinData.maxSupply)) * 100
          : 100,
      },
      volumeRank: Math.floor(Math.random() * 20) + 1, // This would come from API in a real app
      volatility: Math.abs(changePercent) || Math.random() * 5,
      marketShare: ((Number.parseFloat(coinData.marketCapUsd) / 2500000000000) * 100) || 0, // Assuming total market cap of 2.5T
    })
  }

  // Generate detailed information about the coin (fallback if API fails)
  const generateCoinDetails = (item) => {
    if (!item) return

    // Calculate some additional metrics
    const marketDominance = ((item.market_cap || 0) / 2500000000000) * 100 // Assuming total market cap of 2.5T
    const volatilityScore = item.price_change_percentage_24h
      ? Math.abs(item.price_change_percentage_24h) / 2
      : Math.random() * 5
    const liquidityScore = Math.min(95, Math.max(30, Math.floor(Math.random() * 100)))

    // Generate random sentiment data
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Fetch market data for exchanges (random data)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    setCoinDetails({
      marketDominance,
      volatilityScore,
      liquidityScore,
      sentimentData,
      exchanges,
      description: generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: item.ath || item.current_price * (1 + Math.random()),
        allTimeLow: item.atl || item.current_price * (1 - Math.random() * 0.9),
        yearToDateChange: Math.floor(Math.random() * 200) - 50, // -50% to +150%
      },
    })

    // Generate stats for the Stats tab
    const probabilityIncrease = Math.floor(Math.random() * 40) + 30 // Random between 30-70%

    setCoinStats({
      probabilityIncrease,
      marketCapRank: item.market_cap_rank || 0,
      changePercent24Hr: item.price_change_percentage_24h || 0,
      supply: {
        current: item.circulating_supply || 0,
        max: item.total_supply || 0,
        percentCirculating: item.total_supply ? (item.circulating_supply / item.total_supply) * 100 : 100,
      },
      volumeRank: Math.floor(Math.random() * 20) + 1,
      volatility: Math.abs(item.price_change_percentage_24h) || Math.random() * 5,
      marketShare: ((item.market_cap || 0) / 2500000000000) * 100, // Assuming total market cap of 2.5T
    })
  }

  // Generate a description for the coin
  const generateCoinDescription = (item) => {
    const descriptions = [
      `${item.name} is a leading cryptocurrency with strong market presence. It offers fast, secure transactions and has a growing ecosystem of applications.`,
      `${item.name} is a digital currency designed for secure, instant payments. It operates on a decentralized network and has significant market adoption.`,
      `${item.name} is a blockchain-based cryptocurrency focused on scalability and security. It has established itself as a major player in the crypto market.`,
      `${item.name} is a prominent cryptocurrency known for its robust technology and active development. It has gained significant market traction and user adoption.`,
      `${item.name} is a well-established cryptocurrency with a strong development team and active community. It offers innovative blockchain solutions.`
    ]

    return descriptions[Math.floor(Math.random() * descriptions.length)]
  }

  // Initial data load only when component mounts
  useEffect(() => {
    if (!selectedItem) return

    const fetchInitialData = async () => {
      setIsLoading(true)
      setLocalError(null)

      try {
        // Try to fetch data from API
        const data = await fetchHistoricalData(selectedItem, activeTimeframe)
        if (data && data.length > 0) {
          setChartData(data)
          // Generate extended data for scrolling
          const extendedData = generateExtendedHistoricalData(data, selectedItem)
          setExtendedChartData(extendedData)
        }
      } catch (err) {
        console.error("Error fetching initial data:", err)
        // Fallback to generated data
        const data = generateRealisticData(selectedItem, activeTimeframe)
        setChartData(data)
        // Generate extended data for scrolling
        const extendedData = generateExtendedHistoricalData(data, selectedItem)
        setExtendedChartData(extendedData)

        showNotification({
          type: "info",
          message: "Using market simulation",
          details: "Real-time data temporarily unavailable. Using advanced market simulation.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [selectedItem, activeTimeframe]) // Only run when selectedItem or activeTimeframe changes

  // Generate extended historical data for scrolling
  const generateExtendedHistoricalData = (data, item) => {
    if (!data || data.length === 0 || !item) return []

    // Create more historical data points for scrolling
    const basePrice = data[0].price
    const volatility = item.price_change_percentage_24h ? Math.abs(item.price_change_percentage_24h) / 100 : 0.02

    const dataPoints = []
    const oldestTime = data[0].fullTime

    // Generate past data
    for (let i = 200; i > 0; i--) {
      const time = new Date(oldestTime.getTime() - i * 60 * 1000) // 1 minute intervals

      // Create a realistic price with some trend and volatility
      const trendFactor = 0.0001 * i // Slight trend
      const randomFactor = (Math.random() - 0.5) * volatility
      const priceFactor = 1 + randomFactor - trendFactor

      dataPoints.push({
        time: time.toLocaleTimeString(),
        price: basePrice * priceFactor,
        fullTime: time,
      })
    }

    // Add the actual data
    return [...dataPoints, ...data]
  }

  // Draw stats chart when stats data is available
  useEffect(() => {
    if (coinStats && statsChartRef.current && showProbability) {
      drawStatsChart()
    }
  }, [coinStats, showProbability])

  // Enhanced fetchFromCoinCap with rate limit handling and retries
  const fetchFromCoinCap = async (id, symbol, tf) => {
    try {
      // Add delay between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const response = await fetchWithRateLimit(
        `https://api.coincap.io/v2/assets/${id.toLowerCase()}`,
        { timeout: 5000 }
      )

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit - wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY * 2))
          return fetchFromCoinCap(id, symbol, tf) // Retry
        }
        throw new Error(`CoinCap API error: ${response.status}`)
      }

      const data = await response.json()

      // Get historical data with rate limit handling
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const historyResponse = await fetchWithRateLimit(
        `https://api.coincap.io/v2/assets/${id.toLowerCase()}/history?interval=${timeframeToInterval(tf)}&start=${getStartTime(tf)}&end=${Date.now()}`,
        { timeout: 5000 }
      )

      if (!historyResponse.ok) {
        if (historyResponse.status === 429) {
          // Rate limit hit - wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY * 2))
          return fetchFromCoinCap(id, symbol, tf) // Retry
        }
        throw new Error(`CoinCap API error: ${historyResponse.status}`)
      }

      const historyData = await historyResponse.json()
      return {
        currentPrice: parseFloat(data.data.priceUsd),
        historicalData: historyData.data.map((item) => ({
          time: new Date(item.time),
          price: parseFloat(item.priceUsd),
        })),
      }
    } catch (error) {
      console.error("CoinCap API failed:", error)
      throw error
    }
  }

  // Enhanced fetchHistoricalData function with better error handling
  const fetchHistoricalData = async (item, tf) => {
    if (!item) return []

    // Get symbol and ID
    const symbol = item.symbol.toLowerCase()
    const id = item.id ? item.id.toLowerCase() : symbol

    try {
      // First try CoinGecko API with enhanced rate limiting and headers
      try {
        // Increase days for 30m timeframe to get more data points
        const days = tf === "30m" ? 2 : tf === "24h" ? 1 : tf === "4h" ? 0.17 : tf === "1h" ? 0.042 : 0.021
        const response = await fetchWithRateLimit(
          `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=${tf === "30m" ? "m5" : "auto"}`,
          { 
            timeout: 8000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-cg-pro-api-key': process.env.REACT_APP_COINGECKO_API_KEY || ''
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.prices && data.prices.length > 0) {
            // Process data with enhanced smoothing for 30m
            const processedData = tf === "30m" 
              ? process30mData(data.prices)
              : data.prices.map(([timestamp, price]) => ({
                  time: new Date(timestamp).toLocaleTimeString(),
                  price: price,
                  fullTime: new Date(timestamp),
                }))
            return processedData
          }
        } else if (response.status === 401) {
          console.log("CoinGecko API key missing or invalid, trying alternative...")
          throw new Error("API key required")
        }
      } catch (error) {
        console.log("CoinGecko API failed:", error.message)
      }

      // If CoinGecko fails, try Binance API
      try {
        const binanceData = await fetchFromBinance(symbol, tf)
        if (binanceData && binanceData.length > 0) {
          return binanceData
        }
      } catch (error) {
        console.log("Binance API failed:", error.message)
      }

      // If both APIs fail, try our backend API
      try {
        const response = await fetchWithTimeout(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/predictions/historical`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              symbol: symbol,
              timeframe: tf
            })
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            return data.map(item => ({
              time: new Date(item.timestamp).toLocaleTimeString(),
              price: item.price,
              fullTime: new Date(item.timestamp),
            }))
          }
        }
      } catch (error) {
        console.log("Backend API failed:", error.message)
      }

      // If all APIs fail, generate realistic data
      console.log("Using fallback data generation")
      return generateRealisticData(item, tf)
    } catch (error) {
      console.error("Error in fetchHistoricalData:", error)
      // Return fallback data instead of throwing error
      return generateRealisticData(item, tf)
    }
  }

  // Enhanced process30mData function with better smoothing and trend analysis
  const process30mData = (prices) => {
    if (!prices || prices.length === 0) return []

    const processedData = []
    const interval = 30 * 60 * 1000 // 30 minutes in milliseconds
    let lastTimestamp = null

    // Sort prices by timestamp to ensure chronological order
    const sortedPrices = [...prices].sort((a, b) => a[0] - b[0])

    // Calculate exponential moving average for smoother data
    const emaPeriod = 5
    const smoothingFactor = 2 / (emaPeriod + 1)
    const emaValues = []
    let ema = sortedPrices[0][1]

    for (let i = 0; i < sortedPrices.length; i++) {
      ema = (sortedPrices[i][1] - ema) * smoothingFactor + ema
      emaValues.push([sortedPrices[i][0], ema])
    }

    // Apply additional smoothing using a larger window for trend analysis
    const trendWindow = 7
    const smoothedPrices = []

    for (let i = 0; i < emaValues.length; i++) {
      const start = Math.max(0, i - trendWindow + 1)
      const window = emaValues.slice(start, i + 1)
      const avg = window.reduce((sum, [_, price]) => sum + price, 0) / window.length
      smoothedPrices.push([emaValues[i][0], avg])
    }

    // Process data with proper intervals and enhanced smoothing
    smoothedPrices.forEach(([timestamp, price]) => {
      const currentTime = new Date(timestamp)
      
      // Only add data points that are 30 minutes apart
      if (!lastTimestamp || (currentTime - lastTimestamp) >= interval) {
        processedData.push({
          time: currentTime.toLocaleTimeString(),
          price: price,
          fullTime: currentTime,
        })
        lastTimestamp = currentTime
      }
    })

    // Ensure we have enough data points
    if (processedData.length < 48) { // At least 24 hours worth of 30m intervals
      // Fill in missing data points using interpolation
      const filledData = []
      for (let i = 0; i < processedData.length - 1; i++) {
        filledData.push(processedData[i])
        
        const current = processedData[i]
        const next = processedData[i + 1]
        const timeDiff = next.fullTime - current.fullTime
        
        if (timeDiff > interval * 1.5) { // If gap is more than 1.5 intervals
          const numPoints = Math.floor(timeDiff / interval) - 1
          for (let j = 1; j <= numPoints; j++) {
            const interpolatedTime = new Date(current.fullTime.getTime() + interval * j)
            const interpolatedPrice = current.price + (next.price - current.price) * (j / (numPoints + 1))
            filledData.push({
              time: interpolatedTime.toLocaleTimeString(),
              price: interpolatedPrice,
              fullTime: interpolatedTime,
            })
          }
        }
      }
      filledData.push(processedData[processedData.length - 1])
      return filledData
    }

    return processedData
  }

  // Enhanced fetchFromBinance function with better error handling
  const fetchFromBinance = async (symbol, tf) => {
    try {
      // Convert our timeframe to Binance interval format
      const interval = tf === "30m" ? "30m" : tf === "1h" ? "1h" : tf === "4h" ? "4h" : "1d"

      // Try different symbol formats
      const possibleSymbols = [
        symbol.toUpperCase() + "USDT",
        symbol.toUpperCase() + "BUSD",
        symbol.toUpperCase() + "BTC"
      ]

      for (const binanceSymbol of possibleSymbols) {
        try {
          // Calculate limit based on timeframe
          const limit = tf === "30m" ? 60 : tf === "1h" ? 60 : tf === "4h" ? 60 : 24

          const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

          const binanceResponse = await fetchWithTimeout(binanceUrl, { timeout: 5000 })

          if (binanceResponse.ok) {
            const binanceData = await binanceResponse.json()

            if (binanceData && binanceData.length > 0) {
              // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
              return binanceData.map((kline) => ({
                time: new Date(kline[0]).toLocaleTimeString(),
                price: Number.parseFloat(kline[4]),
                fullTime: new Date(kline[0]),
              }))
            }
          }
        } catch (error) {
          console.log(`Binance API failed for symbol ${binanceSymbol}:`, error.message)
          continue // Try next symbol format
        }
      }

      throw new Error("All Binance symbol attempts failed")
    } catch (error) {
      console.error("Binance API error:", error)
      throw error
    }
  }

  // Convert timeframe to interval for API
  const timeframeToInterval = (tf) => {
    switch (tf) {
      case "30m":
        return "m5" // Changed from m1 to m5 for better data granularity
      case "1h":
        return "m15" // Changed from m5 to m15 for better data granularity
      case "4h":
        return "h1"
      case "24h":
        return "h1"
      default:
        return "h1"
    }
  }

  // Get start time based on timeframe
  const getStartTime = (tf) => {
    const now = Date.now()
    switch (tf) {
      case "30m":
        return now - 2 * 60 * 60 * 1000 // Increased to 2 hours for better data
      case "1h":
        return now - 24 * 60 * 60 * 1000 // 24 hours
      case "4h":
        return now - 7 * 24 * 60 * 60 * 1000 // 7 days
      case "24h":
        return now - 30 * 24 * 60 * 60 * 1000 // 30 days
      default:
        return now - 24 * 60 * 60 * 1000
    }
  }

  // Enhanced fetchChartData function with better error handling
  const fetchChartData = async () => {
    if (!selectedItem) return

    try {
      setIsLoading(true)
      setLocalError(null)

      // First try our backend API
      try {
        const response = await fetchWithTimeout(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/predictions/previous_predictions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              symbol: selectedItem.symbol,
              timeframe: timeframe,
              days: timeframe === "4h" ? 7 : timeframe === "24h" ? 30 : 1
            })
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data && data.actuals && data.predictions) {
            const processedData = timeframe === "4h" 
              ? process4hData(data, selectedItem)
              : processApiData(data, selectedItem)
            setChartData(processedData)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.log("Backend API failed, trying CoinGecko...")
      }

      // If backend fails, try CoinGecko
      try {
        const data = await fetchHistoricalData(selectedItem, timeframe)
        if (data && data.length > 0) {
          setChartData(data)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.log("CoinGecko API failed, using fallback data...")
      }

      // If all APIs fail, use fallback data
      const fallbackData = timeframe === "4h"
        ? generate4hFallbackData(selectedItem)
        : generateRealisticData(selectedItem, timeframe)
      setChartData(fallbackData)
      setIsLoading(false)

    } catch (error) {
      console.error("Error fetching chart data:", error)
      setLocalError("Using market simulation")
      const fallbackData = timeframe === "4h"
        ? generate4hFallbackData(selectedItem)
        : generateRealisticData(selectedItem, timeframe)
      setChartData(fallbackData)
      setIsLoading(false)
    }
  }

  // Process 4h timeframe data specifically
  const process4hData = (data, item) => {
    const processedData = []
    const now = new Date()
    const startTime = getStartTime(timeframe)
    
    // Process actual data
    if (data.actuals && data.actuals.length > 0) {
      const interval = timeframe === "30m" ? 30 * 60 * 1000 :
                      timeframe === "1h" ? 60 * 60 * 1000 :
                      timeframe === "4h" ? 4 * 60 * 60 * 1000 :
                      24 * 60 * 60 * 1000

      data.actuals.forEach((price, index) => {
        const timestamp = startTime + (index * interval)
        processedData.push({
          time: new Date(timestamp),
          fullTime: new Date(timestamp),
          price: price,
          isPrediction: false
        })
      })
    }

    // Process prediction data
    if (data.predictions && data.predictions.length > 0) {
      const lastActualTime = processedData[processedData.length - 1]?.fullTime.getTime() || startTime
      const interval = timeframe === "30m" ? 30 * 60 * 1000 :
                      timeframe === "1h" ? 60 * 60 * 1000 :
                      timeframe === "4h" ? 4 * 60 * 60 * 1000 :
                      24 * 60 * 60 * 1000

      data.predictions.forEach((price, index) => {
        const timestamp = lastActualTime + ((index + 1) * interval)
        processedData.push({
          time: new Date(timestamp),
          fullTime: new Date(timestamp),
          price: price,
          isPrediction: true
        })
      })
    }

    return processedData
  }

  // Generate fallback data for 4h timeframe
  const generate4hFallbackData = (item) => {
    const data = []
    const now = new Date()
    const startTime = getStartTime(timeframe)
    
    // Calculate number of points based on timeframe
    const points = timeframe === "30m" ? 48 : // 24 hours worth of 30m intervals
                   timeframe === "1h" ? 24 : // 24 hours
                   timeframe === "4h" ? 42 : // 7 days
                   30 // 30 days for 24h

    const basePrice = item.current_price || 1000
    let lastPrice = basePrice

    for (let i = 0; i < points; i++) {
      const interval = timeframe === "30m" ? 30 * 60 * 1000 :
                      timeframe === "1h" ? 60 * 60 * 1000 :
                      timeframe === "4h" ? 4 * 60 * 60 * 1000 :
                      24 * 60 * 60 * 1000

      const timestamp = startTime + (i * interval)
      // Generate realistic price movement with reduced volatility for 30m
      const volatility = timeframe === "30m" ? 0.005 : 0.02
      const change = (Math.random() - 0.5) * volatility * lastPrice
      lastPrice = Math.max(0.1, lastPrice + change)
      
      data.push({
        time: new Date(timestamp),
        fullTime: new Date(timestamp),
        price: lastPrice,
        isPrediction: i >= points - 6 // Last 6 points are predictions
      })
    }

    return data
  }

  // Generate realistic data based on actual price and volatility
  const generateRealisticData = (item, timeframe) => {
    const basePrice = item.current_price
    const volatility = item.price_change_percentage_24h ? Math.abs(item.price_change_percentage_24h) / 100 : 0.02

    const data = []
    const now = new Date()

    // Adjust points and interval based on timeframe
    let points, interval
    switch (timeframe) {
      case "30m":
        points = 48 // 24 hours worth of 30m intervals
        interval = 30 * 60 * 1000 // 30 minutes
        break
      case "1h":
        points = 24 // 24 hours
        interval = 60 * 60 * 1000
        break
      case "4h":
        points = 42 // 7 days
        interval = 4 * 60 * 60 * 1000
        break
      case "24h":
        points = 30 // 30 days
        interval = 24 * 60 * 60 * 1000
        break
      default:
        points = 24
        interval = 60 * 60 * 1000
    }

    // Create a more realistic price pattern with trends
    let currentPrice = basePrice * 0.95 // Start a bit lower
    let trend = 0.5 // Start with neutral trend

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval)

      // Adjust trend occasionally to create patterns
      if (i % 10 === 0) {
        trend = Math.random() // 0-1 value, higher means more bullish
      }

      // Calculate price change with trend influence
      const trendInfluence = (trend - 0.5) * 0.01 // -0.005 to +0.005
      const randomChange = (Math.random() - 0.5) * volatility + trendInfluence
      currentPrice = Math.max(0.01, currentPrice * (1 + randomChange))

      data.push({
        time: time.toLocaleTimeString(),
        price: currentPrice,
        fullTime: time,
      })
    }

    // Ensure the last price is close to the current price
    const lastIndex = data.length - 1
    data[lastIndex] = {
      ...data[lastIndex],
      price: basePrice,
    }

    return data
  }

  // Draw the chart when data changes
  useEffect(() => {
    if (chartData.length > 0 && chartRef.current) {
      drawChart()
    }
  }, [chartData, isPredicting, chartScale, chartOffset, chartVerticalOffset])

  // Handle mouse down on chart for dragging
  const handleChartMouseDown = (e) => {
    if (!chartRef.current) return

    setIsDragging(true)
    setDragStart(e.clientX)
    setDragStartY(e.clientY)

    // Add event listeners for mouse move and up
    document.addEventListener("mousemove", handleChartMouseMove)
    document.addEventListener("mouseup", handleChartMouseUp)

    // Prevent default behavior
    e.preventDefault()
  }

  // Handle mouse move for chart dragging
  const handleChartMouseMove = (e) => {
    if (!isDragging || !chartRef.current) return

    const canvas = chartRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Calculate drag offset
    const deltaX = e.clientX - dragStart
    const deltaY = e.clientY - dragStartY

    // Update chart offset
    setChartOffset(prev => {
      const newOffset = prev + deltaX
      // Limit the offset to prevent dragging too far
      return Math.min(Math.max(newOffset, -width * 2), width * 2)
    })
    setChartVerticalOffset(prev => {
      const newOffset = prev + deltaY
      // Limit vertical offset to prevent dragging too far
      return Math.min(Math.max(newOffset, -height * 2), height * 2)
    })

    // Update drag start positions
    setDragStart(e.clientX)
    setDragStartY(e.clientY)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set background
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, width, height)

    // Calculate chart dimensions
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Find min and max values from extended data
    const allData = [...extendedChartData, ...chartData]
    const values = allData.map(d => d.price).filter(v => !isNaN(v) && v !== undefined)
    if (values.length === 0) return
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    // Apply transformations
    ctx.save()
    ctx.translate(chartOffset, chartVerticalOffset)

    // Draw grid lines
    ctx.lineWidth = 1.5 // Increased line width for bolder lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)' // Increased opacity for sharper lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight * (1 - i / 5))
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(width - padding, y)
        ctx.stroke()
    }

    // Draw vertical grid lines and future time labels
    const futureTimePoints = generateFutureTimePoints(timeframe)
    futureTimePoints.forEach((point, i) => {
      const xPos = padding + (chartWidth * (i / (futureTimePoints.length - 1)))
      
      // Draw vertical grid line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.moveTo(xPos, padding)
      ctx.lineTo(xPos, height - padding)
      ctx.stroke()

      // Draw time label
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(formatTimeLabel(point.time), xPos, height - padding + 15)
    })

    // Draw price line for historical data
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(91, 192, 222, 0.5)' // Slightly transparent for historical data
    ctx.lineWidth = 1

    let firstValidPoint = true
    allData.forEach((point, index) => {
      if (!point || point.price === undefined || isNaN(point.price)) return

      const x = padding + (chartWidth * (index / (allData.length - 1)))
      const y = padding + (chartHeight * (1 - (point.price - minValue) / valueRange))

      if (firstValidPoint) {
        ctx.moveTo(x, y)
        firstValidPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw current price line on top
    ctx.beginPath()
    ctx.strokeStyle = '#5bc0de'
    ctx.lineWidth = 2

    firstValidPoint = true
    chartData.forEach((point, index) => {
      if (!point || point.price === undefined || isNaN(point.price)) return

      const x = padding + (chartWidth * (index / (chartData.length - 1)))
      const y = padding + (chartHeight * (1 - (point.price - minValue) / valueRange))

      if (firstValidPoint) {
        ctx.moveTo(x, y)
        firstValidPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
    ctx.restore()
  }

  // Handle mouse up for chart dragging
  const handleChartMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
    setDragStartY(null)

    // Remove event listeners
    document.removeEventListener("mousemove", handleChartMouseMove)
    document.removeEventListener("mouseup", handleChartMouseUp)
  }

  // Draw the stats chart
  const drawStatsChart = () => {
    if (!statsChartRef.current || !selectedItem) return;

    const canvas = statsChartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.lineWidth = 8; // Reduced from 20 to 8
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Calculate value angle (24h change)
    const value = selectedItem.price_change_percentage_24h || 0;
    const normalizedValue = Math.max(-20, Math.min(20, value));
    const valueAngle = Math.PI + (normalizedValue / 20) * Math.PI;

    // Draw value arc with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#FFC107');
    gradient.addColorStop(1, '#F44336');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, valueAngle);
    ctx.lineWidth = 8; // Reduced from 20 to 8
    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Draw tick marks
    const tickLength = 10;
    const tickWidth = 2;
    const tickRadius = radius + 15;
    
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI + (i / 4) * Math.PI;
      const startX = centerX + (radius - tickLength) * Math.cos(angle);
      const startY = centerY + (radius - tickLength) * Math.sin(angle);
      const endX = centerX + (radius + tickLength) * Math.cos(angle);
      const endY = centerY + (radius + tickLength) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = tickWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      // Draw labels
      const labelX = centerX + (tickRadius + 20) * Math.cos(angle);
      const labelY = centerY + (tickRadius + 20) * Math.sin(angle);
      ctx.font = '12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = i === 0 ? '-20%' : i === 1 ? '-10%' : i === 2 ? '0%' : i === 3 ? '+10%' : '+20%';
      ctx.fillText(label, labelX, labelY);
    }

    // Draw needle
    const needleLength = radius * 0.9;
    const needleWidth = 4;
    const needleColor = value >= 0 ? '#4CAF50' : '#F44336';
    
    // Draw needle base
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw needle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const needleEndX = centerX + needleLength * Math.cos(valueAngle);
    const needleEndY = centerY + needleLength * Math.sin(valueAngle);
    ctx.lineTo(needleEndX, needleEndY);
    ctx.lineWidth = needleWidth;
    ctx.strokeStyle = needleColor;
    ctx.stroke();

    // Draw needle tip
    ctx.beginPath();
    ctx.arc(needleEndX, needleEndY, 4, 0, Math.PI * 2);
    ctx.fillStyle = needleColor;
    ctx.fill();

    // Draw center text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('24h Change', centerX, centerY - 20);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = needleColor;
    ctx.fillText(`${value.toFixed(2)}%`, centerX, centerY + 20);
  }

  // Add useEffect to redraw stats chart when coinStats changes
  useEffect(() => {
    if (showStats && coinStats) {
      drawStatsChart()
    }
  }, [showStats, coinStats])

  

  // Enhanced notification system
  const showNotification = (notificationData) => {
    // Add unique ID and timestamp to notification
    const newNotification = {
      ...notificationData,
      id: Date.now(),
      timestamp: new Date(),
    }

    // Add to notifications array
    setNotifications((prev) => [...prev, newNotification])

    // Also set as current notification for backward compatibility
    setNotification(newNotification)

    // Auto-remove after duration or default 3 seconds
    const duration = notificationData.duration || 3000
    notificationTimeoutRef.current = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
      if (notification && notification.id === newNotification.id) {
        setNotification(null)
      }
    }, duration)
  }

  // Show prediction result notification
  const showPredictionResultNotification = (result) => {
    const isProfit = result.outcome === "profit"

    showNotification({
      type: isProfit ? "profit" : "loss",
      message: isProfit ? "Prediction Successful!" : "Prediction Missed",
      details: `Your ${result.timeframe} prediction for ${result.assetName} ${isProfit ? "was correct" : "was incorrect"}. ${isProfit ? "Profit" : "Loss"}: ${result.percentageChange.toFixed(2)}%`,
      icon: isProfit ? <ArrowUp size={18} /> : <ArrowDown size={18} />,
      actions: [
        {
          label: "View Details",
          onClick: () => handleViewPredictionDetails(result),
          primary: true,
        },
        {
          label: "Dismiss",
          onClick: () => {},
          primary: false,
        },
      ],
    })
  }

  // Handle viewing prediction details
  const handleViewPredictionDetails = (result) => {
    // In a real app, this would navigate to a detailed view
    // For now, we'll just show another notification with more details
    showNotification({
      type: "info",
      message: "Prediction Details",
      details: `Prediction made on ${new Date(result.timestamp).toLocaleString()}\nInitial price: $${result.initialPrice.toFixed(2)}\nFinal price: $${result.finalPrice.toFixed(2)}\nChange: ${result.percentageChange.toFixed(2)}%`,
    })
  }

  // Add new function to generate trading recommendation
  const generateTradingRecommendation = (predictedPrice, currentPrice, timeframe) => {
    const priceChange = ((predictedPrice - currentPrice) / currentPrice) * 100
    const volatility = Math.abs(priceChange)
    
    let recommendation = {
      action: '',
      confidence: 0,
      reasoning: '',
      timeframe: timeframe,
      priceChange: priceChange
    }

    // Calculate recommendation based on price change and volatility
    if (priceChange > 0) {
      recommendation.action = 'BUY'
      recommendation.confidence = Math.min(100, Math.max(50, 50 + (priceChange * 2)))
      recommendation.reasoning = `Good time to buy - Predicted ${timeframe} price increase of ${priceChange.toFixed(2)}%`
    } else {
      recommendation.action = 'SELL'
      recommendation.confidence = Math.min(100, Math.max(50, 50 + (Math.abs(priceChange) * 2)))
      recommendation.reasoning = `Good time to sell - Predicted ${timeframe} price decrease of ${Math.abs(priceChange).toFixed(2)}%`
    }

    return recommendation
  }

  // Enhanced handlePredict function with better error handling
  const handlePredict = async () => {
    try {
      // Clear any existing notifications first
      setNotifications([])
      setNotification(null)

      setIsPredicting(true)
      setLocalError(null)
      setShowPrediction(false)
      setShowPredictionLine(true)
      setPredictionStartTime(Date.now())

      // Show first notification for prediction start
      showNotification({
        type: "info",
        message: `Prediction started for ${selectedItem.name}`,
        details: "Analyzing market data...",
        duration: 3000
      })

      // Get current chart data for immediate update
      const currentChartData = chartData.length > 0 ? chartData : await fetchChartData()
      
      // Immediately update chart with a temporary prediction line
      const lastTime = currentChartData[currentChartData.length - 1]?.fullTime || new Date()
      
      // Calculate the exact timeframe boundary
      const timeframeBoundary = new Date(lastTime.getTime() + getTimeframeMilliseconds(timeframe))
      
      // Calculate a temporary predicted price based on the last known price
      const lastPrice = currentChartData[currentChartData.length - 1]?.price || selectedItem.current_price
      const tempPredictedPrice = lastPrice * (1 + (Math.random() * 0.02 - 0.01))

      const tempChartData = [
        ...currentChartData,
        {
          time: timeframeBoundary.toLocaleTimeString(),
          price: tempPredictedPrice,
          isPrediction: true,
          isTemporary: true,
          fullTime: timeframeBoundary,
        }
      ]

      setChartData(tempChartData)
      
      try {
        // Dispatch prediction action with current symbol and timeframe
        const result = await dispatch(PredictNextPrice({ 
          symbol: selectedItem.symbol, 
          timeframe 
        })).unwrap()

        if (result.predicted_price) {
          // Generate trading recommendation
          const recommendation = generateTradingRecommendation(
            result.predicted_price,
            selectedItem.current_price,
            timeframe
          )
          
          // Update trading recommendation state
          setTradingRecommendation(recommendation)

          // Update the predicted price in state
          setPredictedPrice(result.predicted_price)
          setShowPrediction(true)

          // Update chart with actual prediction
          const updatedChartData = [
            ...currentChartData,
            {
              time: timeframeBoundary.toLocaleTimeString(),
              price: result.predicted_price,
              isPrediction: true,
              isTemporary: false,
              fullTime: timeframeBoundary,
            }
          ]

          setChartData(updatedChartData)
          generatePredictionData()
          setShowProbability(true)

          // Show prediction completion notification
          setTimeout(() => {
            showNotification({
              type: recommendation.action === 'BUY' ? 'success' : 'warning',
              message: `${recommendation.action} Recommendation for ${selectedItem.name}`,
              details: `${recommendation.reasoning}\nConfidence: ${recommendation.confidence.toFixed(0)}%`,
              duration: 5000
            })
          }, 1000)
        }
      } catch (error) {
        console.error("Prediction API failed:", error)
        // Generate fallback prediction
        const fallbackPrediction = generateFallbackPrediction(selectedItem, timeframe)
        setPredictedPrice(fallbackPrediction.price)
        setShowPrediction(true)
        
        showNotification({
          type: "warning",
          message: "Using simulated prediction",
          details: "API prediction failed. Using market simulation.",
          duration: 3000
        })
      }
    } catch (error) {
      console.error("Prediction failed:", error)
      setLocalError("Failed to make prediction")
      showNotification({
        type: "error",
        message: `Prediction failed for ${selectedItem.name}`,
        details: "Please try again later",
        duration: 3000
      })
    } finally {
      setIsPredicting(false)
    }
  }

  // Helper function to get milliseconds for timeframe
  const getTimeframeMilliseconds = (tf) => {
    const map = {
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    }
    return map[tf] || map["1h"]
  }

  // Enhanced generatePredictionData function with better 30m handling
  const generatePredictionData = () => {
    if (chartData.length === 0) return

    // Get recent prices for analysis
    const recentPrices = chartData.slice(-20)
    const priceChanges = []

    for (let i = 1; i < recentPrices.length; i++) {
      priceChanges.push((recentPrices[i].price - recentPrices[i - 1].price) / recentPrices[i - 1].price)
    }

    // Calculate average price change
    const avgChange = priceChanges.length > 0 
      ? priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length 
      : 0

    // Calculate volatility with timeframe-specific adjustments
    const baseVolatility = priceChanges.length > 0
      ? Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length)
      : 0.02

    // Adjust volatility based on timeframe
    const volatility = timeframe === "30m" 
      ? baseVolatility * 0.5 // Reduce volatility for 30m timeframe
      : baseVolatility

    // Determine trend based on recent movement and momentum
    const lastPrice = recentPrices[recentPrices.length - 1].price
    const firstPrice = recentPrices[0].price
    const overallTrend = lastPrice > firstPrice ? "bullish" : "bearish"

    // Calculate momentum with timeframe-specific adjustments
    const firstHalfChanges = priceChanges.slice(0, Math.floor(priceChanges.length / 2))
    const secondHalfChanges = priceChanges.slice(Math.floor(priceChanges.length / 2))

    const firstHalfAvg = firstHalfChanges.length > 0
      ? firstHalfChanges.reduce((sum, change) => sum + change, 0) / firstHalfChanges.length
      : 0

    const secondHalfAvg = secondHalfChanges.length > 0
      ? secondHalfChanges.reduce((sum, change) => sum + change, 0) / secondHalfChanges.length
      : 0

    const momentum = secondHalfAvg - firstHalfAvg

    // Calculate confidence based on trend consistency and volatility
    const trendConsistency = priceChanges.filter(
      (change) => (overallTrend === "bullish" && change > 0) || (overallTrend === "bearish" && change < 0)
    ).length / priceChanges.length

    const confidence = Math.min(95, Math.max(60, Math.floor(trendConsistency * 100 - volatility * 500)))

    // Predict future price with timeframe-specific adjustments
    let predictedChange
    if (timeframe === "30m") {
      // For 30m timeframe, use a more conservative prediction
      predictedChange = (avgChange * 0.5) + (momentum * 0.5) + (Math.random() - 0.5) * volatility * 0.5
      // Limit the maximum change for 30m timeframe
      predictedChange = Math.max(Math.min(predictedChange, 0.02), -0.02) // Max 2% change in 30m
    } else {
      predictedChange = avgChange * 5 + momentum * 10 + (Math.random() - 0.5) * volatility * 2
    }

    const predictedPrice = lastPrice * (1 + predictedChange)

    // Calculate support and resistance levels with timeframe-specific adjustments
    const prices = recentPrices.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const support = minPrice * (1 - volatility)
    const resistance = maxPrice * (1 + volatility)

    // Generate trading volume prediction
    const volumeChange = (Math.random() - 0.3) * 20 // -30% to +70% change
    const predictedVolume = selectedItem.total_volume * (1 + volumeChange / 100)

    // Calculate price targets with timeframe-specific adjustments
    let shortTermTarget, midTermTarget, longTermTarget
    if (timeframe === "30m") {
      shortTermTarget = predictedPrice * (1 + Math.random() * 0.01 * (overallTrend === "bullish" ? 1 : -1))
      midTermTarget = predictedPrice * (1 + Math.random() * 0.02 * (overallTrend === "bullish" ? 1 : -1))
      longTermTarget = predictedPrice * (1 + Math.random() * 0.03 * (overallTrend === "bullish" ? 1 : -1))
    } else {
      shortTermTarget = predictedPrice * (1 + Math.random() * 0.05 * (overallTrend === "bullish" ? 1 : -1))
      midTermTarget = predictedPrice * (1 + Math.random() * 0.15 * (overallTrend === "bullish" ? 1 : -1))
      longTermTarget = predictedPrice * (1 + Math.random() * 0.3 * (overallTrend === "bullish" ? 1 : -1))
    }

    // Calculate market sentiment score (0-100)
    const sentimentScore = Math.min(100, Math.max(0, 50 + avgChange * 1000 + momentum * 500))

    // Calculate risk assessment (1-10)
    const riskScore = Math.min(10, Math.max(1, Math.round(volatility * 100)))

    // Calculate probability of price increase with timeframe-specific adjustments
    let priceIncreaseProb
    if (timeframe === "30m") {
      // For 30m timeframe, use a more conservative probability calculation
      priceIncreaseProb = Math.min(99, Math.max(1, Math.round(50 + momentum * 200 + avgChange * 100)))
    } else {
      priceIncreaseProb = Math.min(99, Math.max(1, Math.round(50 + momentum * 500 + avgChange * 300)))
    }

    // Update the stats probability with the new prediction
    if (coinStats) {
      setCoinStats({
        ...coinStats,
        probabilityIncrease: priceIncreaseProb,
      })
    }

    setProbabilityData({
      trend: overallTrend,
      confidence,
      predictedPrice,
      timeframe: pendingTimeframe || timeframe,
      volatility: volatility * 100,
      avgDailyChange: avgChange * 100,
      momentum: momentum * 100,
      support,
      resistance,
      volumePrediction: predictedVolume,
      shortTermTarget,
      midTermTarget,
      longTermTarget,
      sentimentScore,
      riskScore,
      priceIncreaseProb,
      dataReady: true,
    })
  }

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K"
    return num.toFixed(2)
  }

  // Handle add to portfolio
  const handleAddToPortfolio = () => {
    // Get existing portfolio or initialize empty array
    const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]")

    // Check if item already exists in portfolio
    const exists = portfolio.some((item) => item.id === selectedItem.id)

    if (!exists) {
      // Add item to portfolio with timestamp
      portfolio.push({
        ...selectedItem,
        addedAt: new Date().toISOString(),
      })

      // Save updated portfolio
      localStorage.setItem("portfolio", JSON.stringify(portfolio))

      showNotification({
        type: "success",
        message: `${selectedItem.name} added to your portfolio`,
        details: "You can view your portfolio in the dashboard",
      })
    } else {
      showNotification({
        type: "info",
        message: `${selectedItem.name} is already in your portfolio`,
        details: "You can view your portfolio in the dashboard",
      })
    }
  }

  // Handle probability button click
  const handleProbabilityClick = () => {
    setShowProbability(!showProbability)
    setShowStats(false) // Hide stats when showing probability

    if (!showProbability && !probabilityData) {
      // Generate prediction data based on actual chart data
      generatePredictionData()
    }
  }

  // Handle stats button click
  const handleStatsClick = () => {
    setShowStats(!showStats)
    setShowProbability(false) // Hide probability when showing stats

    // If we're showing stats and don't have stats data yet, generate it
    if (!showStats && !coinStats && selectedItem) {
      // Generate stats data if we don't have it yet
      const probabilityIncrease = Math.floor(Math.random() * 40) + 30 // Random between 30-70%

      setCoinStats({
        probabilityIncrease,
        marketCapRank: selectedItem.market_cap_rank || 0,
        changePercent24Hr: selectedItem.price_change_percentage_24h || 0,
        supply: {
          current: selectedItem.circulating_supply || 0,
          max: selectedItem.total_supply || 0,
          percentCirculating: selectedItem.total_supply ? (selectedItem.circulating_supply / selectedItem.total_supply) * 100 : 100,
        },
        volumeRank: Math.floor(Math.random() * 20) + 1,
        volatility: Math.abs(selectedItem.price_change_percentage_24h) || Math.random() * 5,
        marketShare: ((selectedItem.market_cap || 0) / 2500000000000) * 100, // Assuming total market cap of 2.5T
      })
    }
  }

  const [tradingRecommendation, setTradingRecommendation] = useState(null)

  // Add new function for fallback prediction
  const generateFallbackPrediction = (item, tf) => {
    const currentPrice = item.current_price
    const volatility = item.price_change_percentage_24h ? Math.abs(item.price_change_percentage_24h) / 100 : 0.02
    
    // Generate a more conservative prediction for 30m timeframe
    const maxChange = tf === "30m" ? 0.02 : 0.05 // 2% for 30m, 5% for others
    const change = (Math.random() - 0.5) * maxChange
    const predictedPrice = currentPrice * (1 + change)
    
    return {
      price: predictedPrice,
      confidence: Math.floor(Math.random() * 20) + 60, // 60-80% confidence
      trend: change > 0 ? "bullish" : "bearish"
    }
  }

  if (!selectedItem) {
    return (
      <div className="market-predict__loading">
        <div className="market-predict__loader"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div
      className="market-predict__container"
      style={{
        maxWidth: "1300px",
        margin: "0 auto",
        padding: "20px",
        color: "#e0e0e0",
        backgroundColor: "#121621",
        minHeight: "100vh",
        animation: "market-predict-fade-in 0.5s ease-in-out",
      }}
    >
      {/* Enhanced Notification System */}
      <div className="market-predict__notifications">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              className={`market-predict__notification market-predict__notification--${notif.type}`}
              initial={{ opacity: 0, y: -50, x: 50 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="market-predict__notification-content">
                <div className="market-predict__notification-icon">
                  {notif.icon ? (
                    notif.icon
                  ) : notif.type === "success" ? (
                    <Check size={18} />
                  ) : notif.type === "error" ? (
                    <X size={18} />
                  ) : notif.type === "info" ? (
                    <AlertCircle size={18} />
                  ) : notif.type === "profit" ? (
                    <ArrowUp size={18} />
                  ) : notif.type === "loss" ? (
                    <ArrowDown size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                </div>
                <div className="market-predict__notification-text">
                  <h4>{notif.message}</h4>
                  {typeof notif.details === 'string' ? (
                    <p>{notif.details}</p>
                  ) : (
                    notif.details
                  )}
                </div>
                <button
                  className="market-predict__notification-close"
                  onClick={() => {
                    setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
                  }}
                >
                  ×
                </button>
              </div>
              <div className="market-predict__notification-progress">
                <div className="market-predict__notification-progress-bar"></div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="market-predict__header">
        <div className="market-predict__coin-identity">
          <img
            src={selectedItem.image || `/placeholder.svg?height=64&width=64&text=${selectedItem.symbol}`}
            alt={selectedItem.name}
            className="market-predict__coin-logo"
          />
          <div className="market-predict__coin-title">
            <h1>
              #{selectedItem.market_cap_rank} {selectedItem.name} ({selectedItem.symbol.toUpperCase()})
            </h1>
            {tradingRecommendation && (
              <div 
                className="market-predict__recommendation"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: tradingRecommendation.action === 'BUY' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: tradingRecommendation.action === 'BUY' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <span>{tradingRecommendation.reasoning}</span>
              </div>
            )}
          </div>
        </div>
        <div className="market-predict__coin-price-info">
          <div className="market-predict__current-price" style={{ color: '#22d3ee', fontSize: '29px' }}>
            ${selectedItem.current_price.toLocaleString()}
          </div>
          {showPrediction && predictedPrice && (
            <div className="market-predict__predicted-price" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#ff4444', fontSize: '28px' }}>${predictedPrice.toLocaleString()}</span>
            </div>
          )}

          <div className="market-predict__timestamp">
            {formatUTCTime(utcTime)}
          </div>
        </div>
      </div>

      <div className="market-predict__chart-container">
        <div className="market-predict__chart-wrapper" style={{ 
          width: !showStats && !showProbability ? '100%' : '70%', 
          height: '107%',
          '@media (max-width: 1024px)': {
            width: !showStats && !showProbability ? '100%' : '60%'
          },
          '@media (max-width: 768px)': {
            width: '113%',
            height: '16vh'
          }
        }}>
          <div className="market-predict__chart-container-inner">
            <div className="market-predict__chart-controls-overlay" style={{ 
              left: '10px', 
              right: 'auto',
              '@media (max-width: 768px)': {
                left: '5px'
              }
            }}>
              <div className="market-predict__zoom-controls">
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleZoomIn} 
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleZoomOut} 
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleChartReset} 
                  title="Reset View"
                >
                  <Move size={18} />
                </button>
              </div>
            </div>
            <canvas
              ref={chartRef}
              width="800"
              height="240"
              className="market-predict__price-chart"
              onMouseDown={handleChartMouseDown}
              onTouchStart={handleChartTouchStart}
              onTouchMove={handleChartTouchMove}
              onTouchEnd={handleChartTouchEnd}
              style={{ 
                cursor: isDragging ? "grabbing" : "grab",
                '@media (max-width: 768px)': {
                  height: '200px'
                }
              }}
            ></canvas>
            {error && <div className="market-predict__error">{error}</div>}
          </div>
        </div>

        {/* Right panel - conditionally show either probability panel or stats panel */}
        {(showStats || showProbability) && (
          <motion.div
            className={`market-predict__${showStats ? 'stats' : 'probability'}-panel`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              '@media (max-width: 1024px)': {
                width: '40%'
              },
              '@media (max-width: 768px)': {
                width: '100%',
                marginTop: '20px'
              }
            }}
          >
            {showStats ? (
              <div className="market-predict__stats-content">
                {coinStats && (
                  <div className="market-predict__stats-info">
                    {/* Market Overview Section */}
                    <div className="market-predict__stats-section">
                      <h3 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '15px' }}>Market Overview</h3>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Market Dominance</div>
                        <div className="market-predict__stats-value">{coinStats?.marketDominance?.toFixed(2) || '0.00'}%</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Market Share</div>
                        <div className="market-predict__stats-value">{coinStats?.marketShare?.toFixed(2) || '0.00'}%</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">24h Volume</div>
                        <div className="market-predict__stats-value">${formatNumber(selectedItem?.total_volume || 0)}</div>
                      </div>
                    </div>

                    {/* Predicted Price Change Section */}
                    <div className="market-predict__stats-section" style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '15px' }}>Predicted Price Change</h3>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Predicted Price Change</div>
                        <div className={`market-predict__stats-value ${predictedPriceChange >= 0 ? 'positive' : 'negative'}`}>
                          {predictedPriceChange !== null ? (
                            <>
                              {predictedPriceChange >= 0 ? '+' : ''}
                              {predictedPriceChange.toFixed(2)}%
                            </>
                          ) : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Price Metrics Section */}
                    <div className="market-predict__stats-section" style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '15px' }}>Price Metrics</h3>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Current Price</div>
                        <div className="market-predict__stats-value">${selectedItem.current_price.toLocaleString()}</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Price Change</div>
                        <div className={`market-predict__stats-value ${predictedPriceChange >= 0 ? 'positive' : 'negative'}`}>
                          {predictedPriceChange !== null ? (
                            <>
                              {predictedPriceChange >= 0 ? '+' : ''}
                              {predictedPriceChange.toFixed(2)}%
                            </>
                          ) : '-'}
                        </div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">All Time High</div>
                        <div className="market-predict__stats-value">
                          $
                          {selectedItem.ath
                            ? formatNumber(selectedItem.ath)
                            : formatNumber(selectedItem.current_price * (1 + Math.random()))}
                        </div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">All Time Low</div>
                        <div className="market-predict__stats-value">
                          $
                          {selectedItem.atl
                            ? formatNumber(selectedItem.atl)
                            : formatNumber(selectedItem.current_price * (1 - Math.random() * 0.9))}
                        </div>
                      </div>
                    </div>

                    {/* Supply Metrics Section */}
                    <div className="market-predict__stats-section" style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '15px' }}>Supply Metrics</h3>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Circulating Supply</div>
                        <div className="market-predict__stats-value">{formatNumber(coinStats?.supply?.current || 0)}</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Max Supply</div>
                        <div className="market-predict__stats-value">{formatNumber(coinStats?.supply?.max || 0)}</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Supply in Circulation</div>
                        <div className="market-predict__stats-value">{coinStats?.supply?.percentCirculating?.toFixed(2) || 0}%</div>
                      </div>
                    </div>

                    {/* Market Health Section */}
                    <div className="market-predict__stats-section" style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '15px' }}>Market Health</h3>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Volatility</div>
                        <div className="market-predict__stats-value">{coinStats?.volatility?.toFixed(2) || 0}</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Volume Rank</div>
                        <div className="market-predict__stats-value">#{coinStats?.volumeRank || 0}</div>
                      </div>
                      <div className="market-predict__stats-row">
                        <div className="market-predict__stats-label">Market Cap</div>
                        <div className="market-predict__stats-value">${formatNumber(selectedItem.market_cap || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="market-predict__analysis-summary" style={{ 
                padding: '2px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px'
              }}>
                {/* Price Change Display */}
                {currentPrice && predicted_next_price && !predictionLoading && !predictionError && (
                  <div className="market-predict__price-change" style={{ 
                    padding: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: '#999', marginBottom: '8px', fontSize: '14px' }}>
                      Price Change Prediction
                    </div>
                    <div style={{ 
                      color: predicted_next_price > currentPrice ? 'rgb(34, 211, 238)' : 'red',
                      fontSize: '24px',
                      fontWeight: '500'
                    }}>
                      {predicted_next_price > currentPrice ? '+' : ''}
                      {((predicted_next_price - currentPrice) / currentPrice * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
                       <div className="market-predict__price-change" style={{ 
              color: predicted_next_price > selectedItem.current_price ? 'rgb(34, 211, 238)' : 'red',
              fontSize: '1rem',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              Price Change: {predicted_next_price > selectedItem.current_price ? '+' : ''}
              {((predicted_next_price - selectedItem.current_price) / selectedItem.current_price * 100).toFixed(2)}%
            </div>
                <div className="market-predict__confidence-meter" style={{ background: 'transparent', padding: '8px', marginBottom: '8px' }}>
                  <div className="market-predict__confidence-label" style={{ marginBottom: '4px' }}>Confidence</div>
                  <div className="market-predict__confidence-bar" style={{ backgroundColor: 'transparent', marginBottom: '4px' }}>
                    <div
                      className="market-predict__confidence-value"
                      style={{ 
                        width: `${probabilityData?.confidence || 75}%`,
                        backgroundColor: `hsl(180, 70%, 70%)`,
                        height: '100%',
                        transition: 'width 0.3s ease, background-color 0.3s ease'
                      }}
                    ></div>
                  </div>
                  <div className="market-predict__confidence-percentage" style={{ marginBottom: '4px' }}>{probabilityData?.confidence || 75}%</div>
                </div>

                <div className="market-predict__trend-indicator" style={{ marginBottom: '4px' }}>
                  <div
                    className={`market-predict__trend-badge market-predict__trend-badge--${probabilityData?.trend === "bullish" ? "bullish" : "bearish"}`}
                  >
                    {(probabilityData?.confidence || 0) > 70
                      ? "Bullish ▲"
                      : probabilityData?.trend === "bullish"
                        ? "Bullish ▲"
                        : "Bearish ▼"}
                  </div>
                </div>

                <div className="market-predict__key-predictions" style={{ marginBottom: '4px' }}>
                  <div className="market-predict__prediction-row" style={{ marginBottom: '2px' }}>
                    <div className="market-predict__prediction-label">Support:</div>
                    <div className="market-predict__prediction-value">
                      ${(probabilityData?.support || selectedItem.current_price * 0.95).toFixed(2)}
                    </div>
                  </div>
                  <div className="market-predict__prediction-row" style={{ marginBottom: '2px' }}>
                    <div className="market-predict__prediction-label">Resistance:</div>
                    <div className="market-predict__prediction-value">
                      ${(probabilityData?.resistance || selectedItem.current_price * 1.05).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="market-predict__metrics-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', margin: '10px 0' }}>
                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Volatility</div>
                    <div className="market-predict__metric-mini-value">
                      {(probabilityData?.volatility || Math.abs(selectedItem.price_change_percentage_24h) * 0.5).toFixed(2)}%
                    </div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Momentum</div>
                    <div
                      className={`market-predict__metric-mini-value ${(probabilityData?.momentum || 0) > 0 ? "market-predict__positive" : "market-predict__negative"}`}
                    >
                      {(probabilityData?.momentum || 0) > 0 ? "+" : ""}
                      {(probabilityData?.momentum || 0).toFixed(2)}%
                    </div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Risk</div>
                    <div className="market-predict__metric-mini-value">{probabilityData?.riskScore || 5}/10</div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Confidence</div>
                    <div className="market-predict__metric-mini-value">{probabilityData?.confidence || 75}%</div>
                  </div>
                </div>

                {/* Add Coin Details Section */}
                <div className="market-predict__coin-details-panel" style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#e0e0e0' }}>Coin Details</h3>
                  <div className="market-predict__coin-description" style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                    <p>{selectedItem.name} is a leading cryptocurrency with strong market presence. It offers fast, secure transactions and has a growing ecosystem of applications.</p>
                  </div>
                  
                  <div className="market-predict__coin-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div className="market-predict__coin-metric" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <div className="market-predict__coin-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#999' }}>
                        <BarChart2 size={16} />
                        Market Dominance
                      </div>
                      <div className="market-predict__coin-metric-value" style={{ fontSize: '16px', fontWeight: '500' }}>
                        {((selectedItem.market_cap / 2500000000000) * 100).toFixed(2)}%
                      </div>
                    </div>

                    <div className="market-predict__coin-metric" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <div className="market-predict__coin-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#999' }}>
                        <DollarSign size={16} />
                        Price (USD)
                      </div>
                      <div className="market-predict__coin-metric-value" style={{ fontSize: '16px', fontWeight: '500' }}>
                        ${selectedItem.current_price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="market-predict__chart-controls">
        <div className="market-predict__controls-container" style={{ 
          gap: '8px',
          '@media (max-width: 768px)': {
            flexDirection: 'column',
            alignItems: 'stretch'
          }
        }}>
          <div className="market-predict__timeframe-selector" style={{ 
            gap: '8px',
            '@media (max-width: 768px)': {
              justifyContent: 'center'
            }
          }}>
            {["30m", "1h", "4h", "24h"].map((tf) => (
              <button
                key={tf}
                className={`market-predict__timeframe-button ${timeframe === tf ? "market-predict__timeframe-button--active" : ""} ${pendingTimeframe === tf ? "market-predict__timeframe-button--pending" : ""}`}
                onClick={() => handleTimeframeChange(tf)}
                style={{
                  '@media (max-width: 768px)': {
                    flex: '1',
                    minWidth: '60px'
                  }
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="market-predict__control-button-group" style={{
            '@media (max-width: 768px)': {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }
          }}>
            <motion.button
              className={`market-predict__control-button market-predict__predict-button ${isPredicting ? "market-predict__predict-button--active" : ""}`}
              onClick={handlePredict}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                '@media (max-width: 768px)': {
                  width: '100%'
                }
              }}
            >
              Predict
            </motion.button>
            <motion.button
              className={`market-predict__control-button market-predict__probability-button ${showProbability ? "market-predict__probability-button--active" : ""}`}
              onClick={handleProbabilityClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                '@media (max-width: 768px)': {
                  width: '100%'
                }
              }}
            >
              Probability
            </motion.button>
            <motion.button
              className={`market-predict__control-button market-predict__stats-button ${showStats ? "market-predict__stats-button--active" : ""}`}
              onClick={handleStatsClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                '@media (max-width: 768px)': {
                  width: '100%'
                }
              }}
            >
              Stats
            </motion.button>
            <motion.button
              className="market-predict__control-button market-predict__portfolio-button"
              onClick={handleAddToPortfolio}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                '@media (max-width: 768px)': {
                  width: '100%'
                }
              }}
            >
              Add to Portfolio
            </motion.button>
          </div>
        </div>
      </div>

      <div className="market-predict__market-data" style={{
        '@media (max-width: 768px)': {
          padding: '10px'
        }
      }}>
        <div className="market-predict__market-stats">
          <h2>Market Stats</h2>
          <div className="market-predict__stats-grid" style={{
            '@media (max-width: 768px)': {
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px'
            }
          }}>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">Market Cap</div>
              <div className="market-predict__stat-value">${formatNumber(selectedItem.market_cap || 0)}</div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">24h Volume</div>
              <div className="market-predict__stat-value">${formatNumber(selectedItem.total_volume || 0)}</div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">Circulating Supply</div>
              <div className="market-predict__stat-value">
                {selectedItem.circulating_supply
                  ? formatNumber(selectedItem.circulating_supply)
                  : formatNumber(selectedItem.market_cap / selectedItem.current_price)}
              </div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">All Time High</div>
              <div className="market-predict__stat-value">
                $
                {selectedItem.ath
                  ? formatNumber(selectedItem.ath)
                  : formatNumber(selectedItem.current_price * (1 + Math.random()))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Predict
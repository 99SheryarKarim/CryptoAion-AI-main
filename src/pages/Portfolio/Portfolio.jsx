"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import "./Portfolio.css"

const Portfolio = () => {
  const navigate = useNavigate()
  const { username } = useSelector((state) => state.Auth)
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAddAssetModal, setShowAddAssetModal] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [portfolioChange, setPortfolioChange] = useState(0)
  const [assets, setAssets] = useState([])
  const [chartData, setChartData] = useState([])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1W")
  const chartRef = useRef(null)
  const allocationChartRef = useRef(null)

  // Mock data for portfolio assets
  const mockAssets = [
    { id: 1, name: "Bitcoin", symbol: "BTC", amount: 0, value: 0, change: 0, color: "#F7931A" },
    { id: 2, name: "Ethereum", symbol: "ETH", amount: 0, value: 0, change: 0, color: "#627EEA" },
    { id: 3, name: "Solana", symbol: "SOL", amount: 0, value: 0, change: 0, color: "#00FFA3" },
    { id: 4, name: "Apple Inc.", symbol: "AAPL", amount: 0, value: 0, change: 0, color: "#A2AAAD" },
    { id: 5, name: "Tesla", symbol: "TSLA", amount: 0, value: 0, change: 0, color: "#CC0000" },
  ]

  // Mock data for portfolio performance
  const generateMockChartData = (timeframe) => {
    const data = []
    let days = 7

    switch (timeframe) {
      case "1D":
        days = 1
        break
      case "1W":
        days = 7
        break
      case "1M":
        days = 30
        break
      case "3M":
        days = 90
        break
      case "1Y":
        days = 365
        break
      case "ALL":
        days = 730
        break
      default:
        days = 7
    }

    let value = 35000
    const now = new Date()

    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      // Add some randomness to the value
      const change = (Math.random() - 0.45) * 500
      value += change

      data.push({
        date: date.toISOString().split("T")[0],
        value: value,
      })
    }

    return data
  }

  // Initialize data on component mount
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setAssets(mockAssets)
      setChartData(generateMockChartData(selectedTimeframe))

      // Calculate total portfolio value and change
      const totalValue = mockAssets.reduce((sum, asset) => sum + asset.value, 0)
      const weightedChange = mockAssets.reduce((sum, asset) => sum + asset.change * (asset.value / totalValue), 0)

      setPortfolioValue(totalValue)
      setPortfolioChange(weightedChange)

      setIsLoaded(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Update chart data when timeframe changes
  useEffect(() => {
    if (isLoaded) {
      setChartData(generateMockChartData(selectedTimeframe))
    }
  }, [selectedTimeframe, isLoaded])

  // Draw performance chart
  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      const canvas = chartRef.current
      const ctx = canvas.getContext("2d")

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set dimensions
      const width = canvas.width
      const height = canvas.height

      // Find min and max values for scaling
      const values = chartData.map((item) => item.value)
      const minValue = Math.min(...values) * 0.95
      const maxValue = Math.max(...values) * 1.05
      const valueRange = maxValue - minValue

      // Draw chart
      ctx.beginPath()
      ctx.moveTo(0, height - ((chartData[0].value - minValue) / valueRange) * height)

      chartData.forEach((item, index) => {
        const x = (index / (chartData.length - 1)) * width
        const y = height - ((item.value - minValue) / valueRange) * height
        ctx.lineTo(x, y)
      })

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, "rgba(62, 184, 176, 0.8)")
      gradient.addColorStop(1, "rgba(62, 184, 176, 0.1)")

      // Draw line
      ctx.strokeStyle = "#3eb8b0"
      ctx.lineWidth = 3
      ctx.stroke()

      // Fill area under the line
      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }, [chartData])

  // Draw allocation chart
  useEffect(() => {
    if (allocationChartRef.current && assets.length > 0) {
      const canvas = allocationChartRef.current
      const ctx = canvas.getContext("2d")

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set dimensions
      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(centerX, centerY) * 0.8

      // Calculate total value
      const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0)

      // Draw pie chart
      let startAngle = 0

      assets.forEach((asset) => {
        const sliceAngle = (asset.value / totalValue) * 2 * Math.PI

        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()

        ctx.fillStyle = asset.color
        ctx.fill()

        startAngle += sliceAngle
      })

      // Draw center circle (donut hole)
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI)
      ctx.fillStyle = "#1c2030"
      ctx.fill()
    }
  }, [assets])

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  // Educational resources data
  const educationalResources = [
    {
      id: 1,
      title: "Diversification 101: Balancing Risk and Reward",
      description: "Learn how to build a balanced portfolio that minimizes risk while maximizing potential returns.",
      readTime: "8 min read",
      image: "/placeholder.svg?height=200&width=350",
    },
    {
      id: 2,
      title: "Dollar-Cost Averaging vs. Lump Sum Investing: Pros and Cons",
      description:
        "Explore different investment strategies and find out which approach works best for your financial goals.",
      readTime: "10 min read",
      image: "/placeholder.svg?height=200&width=350",
    },
    {
      id: 3,
      title: "Tax-Efficient Investing Strategies for Crypto and Stocks",
      description:
        "Optimize your investment returns by understanding the tax implications of different assets and accounts.",
      readTime: "12 min read",
      image: "/placeholder.svg?height=200&width=350",
    },
    {
      id: 4,
      title: "Understanding Market Cycles: When to Buy and When to Sell",
      description: "Learn to recognize market patterns and make informed decisions about timing your investments.",
      readTime: "9 min read",
      image: "/placeholder.svg?height=200&width=350",
    },
    {
      id: 5,
      title: "Risk Management: Protecting Your Portfolio in Volatile Markets",
      description:
        "Discover strategies to safeguard your investments during market downturns and high volatility periods.",
      readTime: "11 min read",
      image: "/placeholder.svg?height=200&width=350",
    },
  ]

  return (
    <div className="portfolio-container">
      {!isLoaded ? (
        <div className="portfolio-loading">
          <div className="loading-spinner"></div>
          <p>Loading your financial dashboard...</p>
        </div>
      ) : (
        <>
          <header className="portfolio-header">
            <h1 className="portfolio-title">Portfolio</h1>
            <p className="portfolio-subtitle">Your Personal Financial Command Center</p>
            {username && <p className="portfolio-welcome">Welcome back, {username}!</p>}

            <div className="portfolio-summary">
              <div className="portfolio-value">
                <h2>{formatCurrency(portfolioValue)}</h2>
                <span className={`portfolio-change ${portfolioChange >= 0 ? "positive" : "negative"}`}>
                  {formatPercentage(portfolioChange)} Today
                </span>
              </div>
              <button className="add-asset-button" onClick={() => navigate("/coins")}>
                Predict Market
              </button>
            </div>
          </header>

          <nav className="portfolio-tabs">
            <button
              className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => handleTabChange("overview")}
            >
              Overview
            </button>
            <button
              className={`tab-button ${activeTab === "assets" ? "active" : ""}`}
              onClick={() => handleTabChange("assets")}
            >
              Assets
            </button>
          </nav>

          <main className="portfolio-content">
            {activeTab === "overview" && (
              <div className="overview-tab">
                <section className="performance-section">
                  <div className="section-header">
                    <h2>Portfolio Performance</h2>
                  </div>
                </section>

                <div className="overview-grid">
                  <section className="allocation-section">
                    <h2>Asset Allocation</h2>
                    <div className="allocation-chart-container">
                      <canvas ref={allocationChartRef} width="300" height="300"></canvas>
                    </div>
                    <div className="allocation-legend">
                      {assets.map((asset) => (
                        <div key={asset.id} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: asset.color }}></span>
                          <span className="legend-name">{asset.name}</span>
                          <span className="legend-value">{portfolioValue > 0 ? ((asset.value / portfolioValue) * 100).toFixed(1) : "0"}%</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="top-performers-section">
                    <h2>Top Performers</h2>
                    <div className="performers-list">
                      {assets
                        .sort((a, b) => b.change - a.change)
                        .slice(0, 3)
                        .map((asset) => (
                          <div key={asset.id} className="performer-item">
                            <div className="performer-info">
                              <span className="performer-symbol">{asset.symbol}</span>
                              <span className="performer-name">{asset.name}</span>
                            </div>
                            <span className={`performer-change ${asset.change >= 0 ? "positive" : "negative"}`}>
                              {formatPercentage(asset.change)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "assets" && (
              <div className="assets-tab">
                <div className="assets-header">
                  <h2>Your Assets</h2>
                  <div className="assets-actions">
                    <button className="filter-button">Filter</button>
                    <button className="sort-button">Sort</button>
                    <button className="add-asset-button" onClick={() => navigate("/coins")}>
                      Predict Market
                    </button>
                  </div>
                </div>

                <div className="assets-table-container">
                  <table className="assets-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Amount</th>
                        <th>Price</th>
                        <th>Value</th>
                        <th>24h Change</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id} className="asset-row">
                          <td className="asset-name-cell">
                            <div className="asset-icon" style={{ backgroundColor: asset.color }}></div>
                            <div className="asset-name-info">
                              <span className="asset-name">{asset.name}</span>
                              <span className="asset-symbol">{asset.symbol}</span>
                            </div>
                          </td>
                          <td>{asset.amount}</td>
                          <td>{formatCurrency(asset.value / asset.amount)}</td>
                          <td>{formatCurrency(asset.value)}</td>
                          <td className={`change-cell ${asset.change >= 0 ? "positive" : "negative"}`}>
                            {formatPercentage(asset.change)}
                          </td>
                          <td className="actions-cell">
                            <button className="asset-action-button">Buy</button>
                            <button className="asset-action-button">Sell</button>
                            <button className="asset-action-button more-button">•••</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <section className="track-investments-section">
                  <h2>Track Your Investments</h2>
                  <div className="features-grid">
                    <div className="feature-card">
                      <div className="feature-icon add-holdings-icon"></div>
                      <h3>Add Your Holdings</h3>
                      <p>Add your cryptocurrency and stock holdings to track your entire portfolio in one place.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon real-time-icon"></div>
                      <h3>Real-Time Tracking</h3>
                      <p>View real-time portfolio value and performance with automatic price updates.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon alerts-icon"></div>
                      <h3>Custom Alerts</h3>
                      <p>Set custom alerts for price movements, news, and important market events.</p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>

          {showAddAssetModal && (
            <div className="modal-overlay" onClick={() => setShowAddAssetModal(false)}>
              <div className="add-asset-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Add New Asset</h2>
                  <button className="close-modal-button" onClick={() => setShowAddAssetModal(false)}>
                    ×
                  </button>
                </div>
                <div className="modal-content">
                  <div className="asset-type-selector">
                    <button className="asset-type-button active">Cryptocurrency</button>
                    <button className="asset-type-button">Stock</button>
                    <button className="asset-type-button">Other</button>
                  </div>

                  <div className="form-group">
                    <label htmlFor="asset-search">Search Asset</label>
                    <input type="text" id="asset-search" placeholder="Search by name or ticker symbol" />
                  </div>

                  <div className="popular-assets">
                    <h3>Popular Assets</h3>
                    <div className="popular-assets-grid">
                      <div className="popular-asset-item">
                        <div className="asset-icon" style={{ backgroundColor: "#F7931A" }}></div>
                        <span>Bitcoin (BTC)</span>
                      </div>
                      <div className="popular-asset-item">
                        <div className="asset-icon" style={{ backgroundColor: "#627EEA" }}></div>
                        <span>Ethereum (ETH)</span>
                      </div>
                      <div className="popular-asset-item">
                        <div className="asset-icon" style={{ backgroundColor: "#00FFA3" }}></div>
                        <span>Solana (SOL)</span>
                      </div>
                      <div className="popular-asset-item">
                        <div className="asset-icon" style={{ backgroundColor: "#345D9D" }}></div>
                        <span>Cardano (ADA)</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="asset-amount">Amount</label>
                    <input type="number" id="asset-amount" placeholder="Enter amount" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="purchase-price">Purchase Price (optional)</label>
                    <input type="number" id="purchase-price" placeholder="Enter purchase price" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="purchase-date">Purchase Date (optional)</label>
                    <input type="date" id="purchase-date" />
                  </div>

                  <div className="modal-actions">
                    <button className="cancel-button" onClick={() => setShowAddAssetModal(false)}>
                      Cancel
                    </button>
                    <button className="add-button">Add Asset</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Portfolio


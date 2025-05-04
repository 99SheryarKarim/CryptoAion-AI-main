"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import "./Coins.css"

// Hardcoded tech stocks data
const TECH_STOCKS = [
  {
    id: "aapl",
    name: "Apple Inc.",
    symbol: "AAPL",
    image: "https://companieslogo.com/img/orig/AAPL-bf1a4314.png?t=1632720960",
    current_price: 170.29,
    market_cap: 2650000000000,
    market_cap_rank: 1,
    total_volume: 132500000000,
    price_change_percentage_24h: 1.25,
    sector: "tech",
  },
  {
    id: "msft",
    name: "Microsoft Corp.",
    symbol: "MSFT",
    image: "https://companieslogo.com/img/orig/MSFT-a203b22d.png?t=1633073277",
    current_price: 417.88,
    market_cap: 3100000000000,
    market_cap_rank: 2,
    total_volume: 155000000000,
    price_change_percentage_24h: 0.78,
    sector: "tech",
  },
  {
    id: "googl",
    name: "Alphabet Inc.",
    symbol: "GOOGL",
    image: "https://companieslogo.com/img/orig/GOOGL-0ed88f7c.png?t=1633218227",
    current_price: 142.62,
    market_cap: 1780000000000,
    market_cap_rank: 3,
    total_volume: 89000000000,
    price_change_percentage_24h: -0.45,
    sector: "tech",
  },
  {
    id: "amzn",
    name: "Amazon.com Inc.",
    symbol: "AMZN",
    image: "https://companieslogo.com/img/orig/AMZN-e9f942e4.png?t=1632523695",
    current_price: 178.75,
    market_cap: 1850000000000,
    market_cap_rank: 4,
    total_volume: 92500000000,
    price_change_percentage_24h: 1.12,
    sector: "tech",
  },
  {
    id: "meta",
    name: "Meta Platforms Inc.",
    symbol: "META",
    image: "https://companieslogo.com/img/orig/META-4767da84.png?t=1684933833",
    current_price: 468.11,
    market_cap: 1200000000000,
    market_cap_rank: 5,
    total_volume: 60000000000,
    price_change_percentage_24h: 2.34,
    sector: "tech",
  },
  {
    id: "tsla",
    name: "Tesla Inc.",
    symbol: "TSLA",
    image: "https://companieslogo.com/img/orig/TSLA-6da1dc8f.png?t=1633074333",
    current_price: 175.21,
    market_cap: 556000000000,
    market_cap_rank: 6,
    total_volume: 27800000000,
    price_change_percentage_24h: -1.87,
    sector: "tech",
  },
  {
    id: "nvda",
    name: "NVIDIA Corp.",
    symbol: "NVDA",
    image: "https://companieslogo.com/img/orig/NVDA-4d377322.png?t=1633072768",
    current_price: 875.28,
    market_cap: 2160000000000,
    market_cap_rank: 7,
    total_volume: 108000000000,
    price_change_percentage_24h: 3.45,
    sector: "tech",
  },
  {
    id: "adbe",
    name: "Adobe Inc.",
    symbol: "ADBE",
    image: "https://companieslogo.com/img/orig/ADBE-b2f0726f.png?t=1633218228",
    current_price: 474.69,
    market_cap: 213000000000,
    market_cap_rank: 8,
    total_volume: 10650000000,
    price_change_percentage_24h: -0.67,
    sector: "tech",
  },
  {
    id: "nflx",
    name: "Netflix Inc.",
    symbol: "NFLX",
    image: "/placeholder.svg?height=30&width=30&text=NFLX",
    current_price: 593.59,
    market_cap: 258000000000,
    market_cap_rank: 9,
    total_volume: 12900000000,
    price_change_percentage_24h: 0.92,
    sector: "tech",
  },
  {
    id: "crm",
    name: "Salesforce Inc.",
    symbol: "CRM",
    image: "/placeholder.svg?height=30&width=30&text=CRM",
    current_price: 272.65,
    market_cap: 264000000000,
    market_cap_rank: 10,
    total_volume: 13200000000,
    price_change_percentage_24h: 1.56,
    sector: "tech",
  },
  {
    id: "intc",
    name: "Intel Corp.",
    symbol: "INTC",
    image: "/placeholder.svg?height=30&width=30&text=INTC",
    current_price: 42.02,
    market_cap: 177000000000,
    market_cap_rank: 11,
    total_volume: 8850000000,
    price_change_percentage_24h: -2.13,
    sector: "tech",
  },
  {
    id: "amd",
    name: "Advanced Micro Devices",
    symbol: "AMD",
    image: "/placeholder.svg?height=30&width=30&text=AMD",
    current_price: 164.16,
    market_cap: 265000000000,
    market_cap_rank: 12,
    total_volume: 13250000000,
    price_change_percentage_24h: 2.78,
    sector: "tech",
  },
  {
    id: "pypl",
    name: "PayPal Holdings Inc.",
    symbol: "PYPL",
    image: "/placeholder.svg?height=30&width=30&text=PYPL",
    current_price: 63.32,
    market_cap: 67000000000,
    market_cap_rank: 13,
    total_volume: 3350000000,
    price_change_percentage_24h: -0.45,
    sector: "tech",
  },
  {
    id: "csco",
    name: "Cisco Systems Inc.",
    symbol: "CSCO",
    image: "/placeholder.svg?height=30&width=30&text=CSCO",
    current_price: 49.09,
    market_cap: 199000000000,
    market_cap_rank: 14,
    total_volume: 9950000000,
    price_change_percentage_24h: 0.23,
    sector: "tech",
  },
  {
    id: "orcl",
    name: "Oracle Corp.",
    symbol: "ORCL",
    image: "/placeholder.svg?height=30&width=30&text=ORCL",
    current_price: 125.46,
    market_cap: 345000000000,
    market_cap_rank: 15,
    total_volume: 17250000000,
    price_change_percentage_24h: 1.12,
    sector: "tech",
  },
  {
    id: "ibm",
    name: "IBM",
    symbol: "IBM",
    image: "https://companieslogo.com/img/orig/IBM-7319e8d3.png?t=1633218227",
    current_price: 174.73,
    market_cap: 160000000000,
    market_cap_rank: 16,
    total_volume: 8000000000,
    price_change_percentage_24h: 0.56,
    sector: "tech",
  },
  {
    id: "qcom",
    name: "Qualcomm Inc.",
    symbol: "QCOM",
    image: "https://companieslogo.com/img/orig/QCOM-d2a7c455.png?t=1633073272",
    current_price: 167.75,
    market_cap: 187000000000,
    market_cap_rank: 17,
    total_volume: 9350000000,
    price_change_percentage_24h: 1.89,
    sector: "tech",
  },
  {
    id: "txn",
    name: "Texas Instruments",
    symbol: "TXN",
    image: "https://companieslogo.com/img/orig/TXN-069d3278.png?t=1633072973",
    current_price: 173.7,
    market_cap: 158000000000,
    market_cap_rank: 18,
    total_volume: 7900000000,
    price_change_percentage_24h: -0.34,
    sector: "tech",
  },
  {
    id: "avgo",
    name: "Broadcom Inc.",
    symbol: "AVGO",
    image: "https://companieslogo.com/img/orig/AVGO-8aaf2808.png?t=1633072952",
    current_price: 1344.17,
    market_cap: 623000000000,
    market_cap_rank: 19,
    total_volume: 31150000000,
    price_change_percentage_24h: 2.45,
    sector: "tech",
  },
  {
    id: "now",
    name: "ServiceNow Inc.",
    symbol: "NOW",
    image: "https://companieslogo.com/img/orig/NOW-a0465906.png?t=1633218227",
    current_price: 740.06,
    market_cap: 151000000000,
    market_cap_rank: 20,
    total_volume: 7550000000,
    price_change_percentage_24h: 1.23,
    sector: "tech",
  },
]

// Hardcoded oil and gas stocks data
const OIL_GAS_STOCKS = [
  {
    id: "xom",
    name: "ExxonMobil Corp.",
    symbol: "XOM",
    image: "https://companieslogo.com/img/orig/XOM-696aad13.png?t=1633077373",
    current_price: 113.49,
    market_cap: 456000000000,
    market_cap_rank: 1,
    total_volume: 22800000000,
    price_change_percentage_24h: 0.87,
    sector: "oilgas",
  },
  {
    id: "cvx",
    name: "Chevron Corp.",
    symbol: "CVX",
    image: "https://companieslogo.com/img/orig/CVX-0378df7f.png?t=1633072962",
    current_price: 155.59,
    market_cap: 293000000000,
    market_cap_rank: 2,
    total_volume: 14650000000,
    price_change_percentage_24h: 1.23,
    sector: "oilgas",
  },
  {
    id: "shel",
    name: "Shell plc",
    symbol: "SHEL",
    image: "https://companieslogo.com/img/orig/SHEL-c2437d10.png?t=1658128131",
    current_price: 70.25,
    market_cap: 232000000000,
    market_cap_rank: 3,
    total_volume: 11600000000,
    price_change_percentage_24h: -0.45,
    sector: "oilgas",
  },
  {
    id: "bp",
    name: "BP plc",
    symbol: "BP",
    image: "https://companieslogo.com/img/orig/BP-3e393db7.png?t=1633072963",
    current_price: 36.19,
    market_cap: 102000000000,
    market_cap_rank: 4,
    total_volume: 5100000000,
    price_change_percentage_24h: 0.67,
    sector: "oilgas",
  },
  {
    id: "tte",
    name: "TotalEnergies SE",
    symbol: "TTE",
    image: "https://companieslogo.com/img/orig/TTE-1a445cdd.png?t=1648404267",
    current_price: 68.49,
    market_cap: 162000000000,
    market_cap_rank: 5,
    total_volume: 8100000000,
    price_change_percentage_24h: 1.12,
    sector: "oilgas",
  },
  {
    id: "cop",
    name: "ConocoPhillips",
    symbol: "COP",
    image: "https://companieslogo.com/img/orig/COP-b2c49c5c.png?t=1633072985",
    current_price: 116.26,
    market_cap: 136000000000,
    market_cap_rank: 6,
    total_volume: 6800000000,
    price_change_percentage_24h: -0.78,
    sector: "oilgas",
  },
  {
    id: "eog",
    name: "EOG Resources",
    symbol: "EOG",
    image: "https://companieslogo.com/img/orig/EOG-dde7c26d.png?t=1597316384",
    current_price: 124.78,
    market_cap: 72000000000,
    market_cap_rank: 7,
    total_volume: 3600000000,
    price_change_percentage_24h: 1.56,
    sector: "oilgas",
  },
  {
    id: "oxy",
    name: "Occidental Petroleum",
    symbol: "OXY",
    image: "https://companieslogo.com/img/orig/OXY-951d6e3f.png?t=1597316393",
    current_price: 63.47,
    market_cap: 56000000000,
    market_cap_rank: 8,
    total_volume: 2800000000,
    price_change_percentage_24h: -1.23,
    sector: "oilgas",
  },
  {
    id: "mpc",
    name: "Marathon Petroleum",
    symbol: "MPC",
    image: "https://companieslogo.com/img/orig/MPC-4a97c414.png?t=1597316392",
    current_price: 183.13,
    market_cap: 66000000000,
    market_cap_rank: 9,
    total_volume: 3300000000,
    price_change_percentage_24h: 2.34,
    sector: "oilgas",
  },
  {
    id: "psx",
    name: "Phillips 66",
    symbol: "PSX",
    image: "https://companieslogo.com/img/orig/PSX-c58ecc31.png?t=1633072949",
    current_price: 143.0,
    market_cap: 60000000000,
    market_cap_rank: 10,
    total_volume: 3000000000,
    price_change_percentage_24h: 0.89,
    sector: "oilgas",
  },
  {
    id: "vlo",
    name: "Valero Energy",
    symbol: "VLO",
    image: "https://companieslogo.com/img/orig/VLO-f987b5e9.png?t=1633072975",
    current_price: 162.64,
    market_cap: 54000000000,
    market_cap_rank: 11,
    total_volume: 2700000000,
    price_change_percentage_24h: 1.78,
    sector: "oilgas",
  },
  {
    id: "slb",
    name: "Schlumberger Limited",
    symbol: "SLB",
    image: "https://companieslogo.com/img/orig/SLB-1401b624.png?t=1633072952",
    current_price: 51.44,
    market_cap: 73000000000,
    market_cap_rank: 12,
    total_volume: 3650000000,
    price_change_percentage_24h: -0.56,
    sector: "oilgas",
  },
  {
    id: "bkr",
    name: "Baker Hughes",
    symbol: "BKR",
    image: "/placeholder.svg?height=30&width=30&text=BKR",
    current_price: 32.46,
    market_cap: 32000000000,
    market_cap_rank: 13,
    total_volume: 1600000000,
    price_change_percentage_24h: 0.34,
    sector: "oilgas",
  },
  {
    id: "hal",
    name: "Halliburton Co.",
    symbol: "HAL",
    image: "/placeholder.svg?height=30&width=30&text=HAL",
    current_price: 37.87,
    market_cap: 33000000000,
    market_cap_rank: 14,
    total_volume: 1650000000,
    price_change_percentage_24h: -1.12,
    sector: "oilgas",
  },
  {
    id: "dvn",
    name: "Devon Energy",
    symbol: "DVN",
    image: "/placeholder.svg?height=30&width=30&text=DVN",
    current_price: 48.19,
    market_cap: 30000000000,
    market_cap_rank: 15,
    total_volume: 1500000000,
    price_change_percentage_24h: 0.78,
    sector: "oilgas",
  },
  {
    id: "pxd",
    name: "Pioneer Natural Resources",
    symbol: "PXD",
    image: "https://companieslogo.com/img/orig/PXD-4b3418bf.png?t=1597316395",
    current_price: 266.9,
    market_cap: 62000000000,
    market_cap_rank: 16,
    total_volume: 3100000000,
    price_change_percentage_24h: 1.45,
    sector: "oilgas",
  },
  {
    id: "kmi",
    name: "Kinder Morgan",
    symbol: "KMI",
    image: "https://companieslogo.com/img/orig/KMI-4f36c904.png?t=1597316406",
    current_price: 17.93,
    market_cap: 40000000000,
    market_cap_rank: 17,
    total_volume: 2000000000,
    price_change_percentage_24h: -0.23,
    sector: "oilgas",
  },
  {
    id: "wmb",
    name: "Williams Companies",
    symbol: "WMB",
    image: "/placeholder.svg?height=30&width=30&text=WMB",
    current_price: 35.21,
    market_cap: 42000000000,
    market_cap_rank: 18,
    total_volume: 2100000000,
    price_change_percentage_24h: 0.56,
    sector: "oilgas",
  },
  {
    id: "hes",
    name: "Hess Corp.",
    symbol: "HES",
    image: "https://companieslogo.com/img/orig/HES-f12a2e1c.png?t=1597316387",
    current_price: 154.82,
    market_cap: 47000000000,
    market_cap_rank: 19,
    total_volume: 2350000000,
    price_change_percentage_24h: 1.67,
    sector: "oilgas",
  },
  {
    id: "mro",
    name: "Marathon Oil",
    symbol: "MRO",
    image: "/placeholder.svg?height=30&width=30&text=MRO",
    current_price: 25.62,
    market_cap: 14000000000,
    market_cap_rank: 20,
    total_volume: 700000000,
    price_change_percentage_24h: -0.89,
    sector: "oilgas",
  },
]

const Coins = () => {
  const [cryptoData, setCryptoData] = useState([])
  const [stocksData, setStocksData] = useState({
    tech: TECH_STOCKS,
    oilGas: OIL_GAS_STOCKS,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "market_cap",
    direction: "descending",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [activeFilter, setActiveFilter] = useState("all")
  const [activeMarket, setActiveMarket] = useState(() => {
    // Get saved market from localStorage or default to "crypto"
    return localStorage.getItem("activeMarket") || "crypto"
  })

  // Add subscription status state
  const [isSubscribed, setIsSubscribed] = useState(() => {
    // Check if user has subscribed from localStorage
    return localStorage.getItem("isSubscribed") === "true"
  })

  // Add admin status state - initialize from localStorage
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("adminToken") !== null
  })

  // Add notification state
  const [showNotification, setShowNotification] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const navigate = useNavigate()

  // Check for admin token changes
  useEffect(() => {
    // Function to check admin status
    const checkAdminStatus = () => {
      const adminToken = localStorage.getItem("adminToken")
      setIsAdmin(adminToken !== null)
    }

    // Initial check
    checkAdminStatus()

    // Set up event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "adminToken") {
        checkAdminStatus()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Clean up
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Fetch cryptocurrency data
  useEffect(() => {
    const fetchCryptoData = async (retryCount = 0) => {
      try {
        // First check if we have cached data and it's not too old (less than 5 minutes old)
        const cachedData = localStorage.getItem("cryptoData")
        const cachedTimestamp = localStorage.getItem("cryptoDataTimestamp")

        // If we have cached data and it's recent (less than 5 minutes old)
        if (cachedData && cachedTimestamp && Date.now() - Number.parseInt(cachedTimestamp) < 5 * 60 * 1000) {
          setCryptoData(JSON.parse(cachedData))
          setLoading(false)
          setError(null)
          return
        }

        // If no valid cache, show loading and fetch new data
        setLoading(true)
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false",
        )

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        // Check if we got valid data
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid data format received from API")
        }

        // Cache the data
        localStorage.setItem("cryptoData", JSON.stringify(data))
        localStorage.setItem("cryptoDataTimestamp", Date.now().toString())

        setCryptoData(data)
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err)

        // Check if we have any cached data to fall back to
        const cachedData = localStorage.getItem("cryptoData")
        if (cachedData) {
          setCryptoData(JSON.parse(cachedData))
          setLoading(false)
          setError(null) // Don't show error if we have cached data
          return
        }

        // Implement retry logic (max 3 retries)
        if (retryCount < 3) {
          console.log(`Retrying... Attempt ${retryCount + 1}/3`)
          // Wait longer between each retry
          setTimeout(() => fetchCryptoData(retryCount + 1), 1000 * (retryCount + 1))
          return
        }

        setError("Failed to load cryptocurrency data. Please try again later.")
        setLoading(false)
      }
    }

    fetchCryptoData()
  }, [])

  // Save active market to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeMarket", activeMarket)
  }, [activeMarket])

  // Save subscription status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("isSubscribed", isSubscribed.toString())
  }, [isSubscribed])

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page on new search
  }

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Handle filtering
  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    setCurrentPage(1) // Reset to first page on new filter
  }

  // Handle market type selection
  const handleMarketChange = (market) => {
    setActiveMarket(market)
    setCurrentPage(1) // Reset to first page when changing markets
  }

  // Get the current data based on active market
  const getCurrentMarketData = () => {
    switch (activeMarket) {
      case "tech-stocks":
        return stocksData.tech
      case "oil-gas-stocks":
        return stocksData.oilGas
      default:
        return cryptoData
    }
  }

  // Apply sorting and filtering
  const getSortedAndFilteredData = () => {
    let filteredData = [...getCurrentMarketData()]

    // If data is empty, return empty array
    if (!filteredData || filteredData.length === 0) {
      return []
    }

    // Apply search filter
    if (searchTerm) {
      filteredData = filteredData.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply category filter
    if (activeFilter === "gainers") {
      filteredData = filteredData.filter((item) => item.price_change_percentage_24h > 0)
    } else if (activeFilter === "losers") {
      filteredData = filteredData.filter((item) => item.price_change_percentage_24h < 0)
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
      })
    }

    return filteredData
  }

  // Get current items for pagination
  const sortedAndFilteredData = getSortedAndFilteredData()
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedAndFilteredData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage)

  // Handle pagination
  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Check if item is accessible (Bitcoin, subscribed user, or admin)
  const isItemAccessible = (item) => {
    // If user is admin, all items are accessible
    if (isAdmin) return true

    // If user is subscribed, all items are accessible
    if (isSubscribed) return true

    // If it's Bitcoin, it's accessible
    if (item.symbol && item.symbol.toLowerCase() === "btc") return true

    // Otherwise, it's locked
    return false
  }

  // Handle item click to navigate to prediction page or show notification
  const handleItemClick = (item) => {
    if (isItemAccessible(item)) {
      // Store the selected item in localStorage to access it on the prediction page
      localStorage.setItem("selectedMarketItem", JSON.stringify(item))
      // Navigate to the prediction page
      navigate("/predict")
    } else {
      // Show notification for subscription
      setSelectedItem(item)
      setShowNotification(true)
    }
  }

  // Handle notification OK button click
  const handleNotificationOk = () => {
    // Close the notification
    setShowNotification(false)
    // Navigate to the GoPro page
    navigate("/gopro")
  }

  // Render sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? " ↑" : " ↓"
    }
    return ""
  }

  // Get the title based on the active market
  const getMarketTitle = () => {
    switch (activeMarket) {
      case "tech-stocks":
        return "Top 20 Technology Stocks"
      case "oil-gas-stocks":
        return "Top 20 Oil & Gas Stocks"
      default:
        return "Cryptocurrency Market"
    }
  }

  return (
    <div className="coins-section">
      <motion.h1
        className="coins-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {getMarketTitle()}
      </motion.h1>

      <div className="market-selector">
        <button
          className={`market-button ${activeMarket === "crypto" ? "active" : ""}`}
          onClick={() => handleMarketChange("crypto")}
        >
          Cryptocurrencies
        </button>
        <button
          className={`market-button ${activeMarket === "tech-stocks" ? "active" : ""}`}
          onClick={() => handleMarketChange("tech-stocks")}
        >
          Tech Stocks
        </button>
        <button
          className={`market-button ${activeMarket === "oil-gas-stocks" ? "active" : ""}`}
          onClick={() => handleMarketChange("oil-gas-stocks")}
        >
          Oil & Gas Stocks
        </button>
      </div>

      {isAdmin && (
        <div className="admin-indicator">
          <span className="admin-badge">Admin Mode</span>
          <span className="admin-message">All coins unlocked</span>
        </div>
      )}

      <div className="coins-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-button ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => handleFilterChange("all")}
          >
            All
          </button>
          <button
            className={`filter-button ${activeFilter === "gainers" ? "active" : ""}`}
            onClick={() => handleFilterChange("gainers")}
          >
            Gainers
          </button>
          <button
            className={`filter-button ${activeFilter === "losers" ? "active" : ""}`}
            onClick={() => handleFilterChange("losers")}
          >
            Losers
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && activeMarket === "crypto" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="loading-container"
          >
            <div className="loader"></div>
            <p className="loading-text">Fetching latest market data...</p>
          </motion.div>
        ) : error && activeMarket === "crypto" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="error-container"
          >
            <p className="error-text">{error}</p>
            <motion.button
              className="retry-button"
              onClick={() => {
                setLoading(true)
                setError(null)
                // Force a fresh fetch by setting a timestamp older than 5 minutes
                localStorage.setItem("cryptoDataTimestamp", (Date.now() - 6 * 60 * 1000).toString())
                window.location.reload()
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="coins-table-wrapper"
          >
            <table className="coins-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort("market_cap_rank")}># {getSortIndicator("market_cap_rank")}</th>
                  <th onClick={() => requestSort("name")}>Name {getSortIndicator("name")}</th>
                  <th onClick={() => requestSort("current_price")}>Price {getSortIndicator("current_price")}</th>
                  <th onClick={() => requestSort("price_change_percentage_24h")}>
                    24h Change {getSortIndicator("price_change_percentage_24h")}
                  </th>
                  <th onClick={() => requestSort("market_cap")}>Market Cap {getSortIndicator("market_cap")}</th>
                  <th onClick={() => requestSort("total_volume")}>Volume (24h) {getSortIndicator("total_volume")}</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((item) => {
                    const isPositive = item.price_change_percentage_24h >= 0
                    const isAccessible = isItemAccessible(item)

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                        onClick={() => handleItemClick(item)}
                        className={`clickable-row ${!isAccessible ? "locked-item" : ""}`}
                        data-sector={item.sector || "crypto"}
                      >
                        <td>{item.market_cap_rank}</td>
                        <td className="coin-info">
                          <img
                            src={
                              item.image ||
                              `/placeholder.svg?height=30&width=30&text=${item.symbol || "/placeholder.svg"}`
                            }
                            alt={item.name || item.symbol}
                            className="coin-image"
                          />
                          <div className="coin-details">
                            <span className="coin-name">
                              {item.name}
                              {!isAccessible && <span className="lock-icon">🔒</span>}
                            </span>
                            <span className="coin-symbol">{item.symbol.toUpperCase()}</span>
                          </div>
                        </td>
                        <td>{item.current_price.toLocaleString()}</td>
                        <td
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: isPositive ? "#4caf50" : "#f44336",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              fontSize: "14px",
                              marginRight: "4px",
                            }}
                          >
                            {isPositive ? "↑" : "↓"}
                          </span>
                          {Math.abs(item.price_change_percentage_24h).toFixed(2)}%
                        </td>

                        <td>${item.market_cap.toLocaleString()}</td>
                        <td>${item.total_volume.toLocaleString()}</td>
                      </motion.tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="no-results">
                      No items found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {sortedAndFilteredData.length > itemsPerPage && (
              <div className="pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
                </button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (number) =>
                        number === 1 ||
                        number === totalPages ||
                        (number >= currentPage - 1 && number <= currentPage + 1),
                    )
                    .map((number) => {
                      // Add ellipsis
                      if (
                        number > 1 &&
                        Array.from({ length: totalPages }, (_, i) => i + 1).filter(
                          (n) => n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1),
                        )[
                          Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              (n) => n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1),
                            )
                            .indexOf(number) - 1
                        ] <
                          number - 1
                      ) {
                        return (
                          <span key={`ellipsis-${number}`} className="ellipsis">
                            ...
                          </span>
                        )
                      }

                      return (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`pagination-number ${currentPage === number ? "active" : ""}`}
                        >
                          {number}
                        </button>
                      )
                    })}
                </div>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="coins-disclaimer">
        <p>
          {activeMarket === "crypto"
            ? "Data provided by CoinGecko API"
            : "Stock data is simulated for demonstration purposes"}
        </p>
      </div>

      {/* Premium Subscription Notification */}
      {showNotification && (
        <div className="premium-overlay">
          <motion.div
            className="premium-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="premium-modal-content">
              <div className="premium-header">
                <div className="premium-badge">
                  <span className="premium-crown">👑</span>
                  <span className="premium-badge-text">PREMIUM</span>
                </div>
                <button className="premium-close" onClick={() => setShowNotification(false)}>
                  ×
                </button>
              </div>

              <div className="premium-asset">
                <img
                  src={
                    selectedItem?.image ||
                    `/placeholder.svg?height=60&width=60&text=${selectedItem?.symbol || "/placeholder.svg"}`
                  }
                  alt={selectedItem?.name || "Asset"}
                  className="premium-asset-image"
                />
                <div className="premium-asset-info">
                  <h3>{selectedItem?.name || "This asset"}</h3>
                  <p className="premium-asset-symbol">{selectedItem?.symbol?.toUpperCase() || ""}</p>
                </div>
              </div>

              <div className="premium-message">
                <h2>Unlock Premium Predictions</h2>
                <p>
                  Currently, only Bitcoin is available in the free plan. Upgrade to Premium to access predictions for
                  all cryptocurrencies and stocks.
                </p>
              </div>

              <div className="premium-features">
                <div className="premium-feature">
                  <div className="premium-feature-icon">📈</div>
                  <div className="premium-feature-text">
                    <h4>All Assets</h4>
                    <p>Predict any cryptocurrency or stock</p>
                  </div>
                </div>
                <div className="premium-feature">
                  <div className="premium-feature-icon">🔮</div>
                  <div className="premium-feature-text">
                    <h4>Advanced AI</h4>
                    <p>Access our most powerful prediction models</p>
                  </div>
                </div>
                <div className="premium-feature">
                  <div className="premium-feature-icon">⚡</div>
                  <div className="premium-feature-text">
                    <h4>Real-time Alerts</h4>
                    <p>Get notified of market opportunities</p>
                  </div>
                </div>
              </div>

              <div className="premium-actions">
                <button className="premium-upgrade-button" onClick={handleNotificationOk}>
                  <span className="premium-button-text">Upgrade Now</span>
                  <span className="premium-button-icon">→</span>
                </button>
                <button className="premium-later-button" onClick={() => setShowNotification(false)}>
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Coins

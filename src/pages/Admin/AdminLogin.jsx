"use client"

import { useState, useEffect } from "react"
import "../Admin/Admin.css"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import {
  AdminLogin as adminLoginAction,
  setToastMessage,
  setToastStatus,
  setShowToast,
} from "../../RTK/Slices/AuthSlice"

const AdminLogin = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const {
    showToast,
    toastMessage,
    toastStatus,
    adminToken,
    loading: authLoading,
  } = useSelector((state) => state.Auth || {})

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [error, setError] = useState("")

  // Check admin token in localStorage on mount
  useEffect(() => {
    if (adminToken) {
      // Store the admin token in localStorage for other components to access
      localStorage.setItem("adminToken", adminToken)
      navigate("/admin/dashboard")
    }
  }, [adminToken, navigate])

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await dispatch(
        adminLoginAction({
          username: formData.username,
          password: formData.password,
        })
      ).unwrap()

      // Store the admin token in localStorage
      localStorage.setItem("adminToken", result.access_token)
      
      // Update UI
      dispatch(setToastMessage("Admin login successful!"))
      dispatch(setToastStatus("success"))
      dispatch(setShowToast(true))

      // Navigate to admin dashboard
      navigate("/admin/dashboard")
    } catch (error) {
      console.error("Admin login error:", error)
      setError(error.message || "Admin login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-container">
      {showToast && <div className={`toast-notification ${toastStatus}`}>{toastMessage}</div>}

      <div className="admin-card">
        <div className="admin-header">
          <div className="logo-container">
            <img src="/logoooo.png" alt="Logo" className="logo-image" />
          </div>
        </div>
        <div className="admin-header">
          <h2>Admin Portal</h2>
          <p>Sign in to access the admin dashboard</p>
        </div>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="username">Admin Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter admin username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              required
            />
          </div>

          <button type="submit" className="admin-submit-button" disabled={loading || authLoading}>
            {loading || authLoading ? "Authenticating..." : "Access Dashboard"}
          </button>

          <div className="admin-footer">
            <p>This area is restricted to authorized personnel only.</p>
            <a href="/" className="back-link">
              Return to main site
            </a>
          </div>
        </form>
      </div>

      <div className="admin-background">
        <div className="bg-shape admin-shape-1"></div>
        <div className="bg-shape admin-shape-2"></div>
        <div className="bg-shape admin-shape-3"></div>
      </div>
    </div>
  )
}

export default AdminLogin

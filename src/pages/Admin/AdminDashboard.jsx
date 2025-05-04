"use client"

import { useState, useEffect } from "react"
import "./Admin.css"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { setToastMessage, setToastStatus, setShowToast, clearAdminToken } from "../../RTK/Slices/AuthSlice"

const AdminDashboard = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showToast, toastMessage, toastStatus, adminToken } = useSelector((state) => state.Auth || {})

  const [activeTab, setActiveTab] = useState("users")
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [trades, setTrades] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check admin token on mount
  useEffect(() => {
    if (!adminToken) {
      navigate("/admin/login")
      return
    }

    // Load user data from localStorage or initialize if not exists
    fetchUserData()
  }, [adminToken, navigate])

  // Fetch user data from backend API
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        console.error('No admin token found');
        setUsers([]);
        return;
      }

      // Fetch users from backend API
      const response = await fetch('http://127.0.0.1:8000/auth/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data);
      
      console.log('Users loaded from API:', data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to load data when component mounts
  useEffect(() => {
    fetchUserData();
  }, []);

  // Add useEffect to update user list when auth state changes
  useEffect(() => {
    const handleStorageChange = () => {
      fetchUserData()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Handle logout
  const handleLogout = () => {
    dispatch(clearAdminToken())
    dispatch(setToastMessage("Admin logged out successfully"))
    dispatch(setToastStatus("success"))
    dispatch(setShowToast(true))
    navigate("/admin/login")
  }

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!user || !user.username) return false;
    return user.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter trades based on search term
  const filteredTrades = trades.filter(
    (trade) =>
      trade.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get user trades
  const getUserTrades = (userId) => {
    return trades.filter((trade) => trade.userId === userId)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  // Handle user status change
  const changeUserStatus = (userId, newStatus) => {
    try {
      // Update local state
      const updatedUsers = users.map((user) => 
        user.id === userId ? { ...user, status: newStatus } : user
      )
      
      // Update localStorage
      localStorage.setItem('allUsers', JSON.stringify(updatedUsers))
      setUsers(updatedUsers)

    dispatch(setToastMessage(`User status updated to ${newStatus}`))
    dispatch(setToastStatus("success"))
    dispatch(setShowToast(true))

    setTimeout(() => {
      dispatch(setShowToast(false))
    }, 3000)
    } catch (error) {
      console.error('Error updating user status:', error)
      dispatch(setToastMessage('Failed to update user status'))
      dispatch(setToastStatus('error'))
      dispatch(setShowToast(true))
    }
  }

  // Delete user
  const deleteUser = async (userId) => {
    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        console.error('No admin token found');
        return;
      }

      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
      }

      // Delete user from backend API
      const response = await fetch(`http://127.0.0.1:8000/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);

      // Show success message
      dispatch(setToastMessage(`User with ID ${userId} has been deleted successfully`));
      dispatch(setToastStatus("success"));
      dispatch(setShowToast(true));

      setTimeout(() => {
        dispatch(setShowToast(false));
      }, 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      dispatch(setToastMessage('Failed to delete user'));
      dispatch(setToastStatus('error'));
      dispatch(setShowToast(true));
    }
  }

  // View user details
  const viewUserDetails = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  return (
    <div className="admin-dashboard-container">
      {showToast && <div className={`toast-notification ${toastStatus}`}>{toastMessage}</div>}

      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-small">
          
           
          </div>
          <h3>Admin Panel</h3>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="nav-icon">👥</span>
            Users
          </button>
          <button
            className={`admin-nav-item ${activeTab === "trades" ? "active" : ""}`}
            onClick={() => setActiveTab("trades")}
          >
            <span className="nav-icon">📊</span>
            Trades
          </button>
          <button
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-button" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header-bar">
          <h2>
            {activeTab === "users" && "User Management"}
            {activeTab === "trades" && "Trade Activity"}
            {activeTab === "settings" && "Admin Settings"}
          </h2>
          <div className="admin-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === "users" && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Last Login</th>
                        <th>Status</th>
                        <th>Trades</th>
                        <th>Balance</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.username}</td>
                            <td>{user.lastLogin}</td>
                            <td>
                              <span className={`status-badge ${user.status}`}>{user.status}</span>
                            </td>
                            <td>{user.trades}</td>
                            <td>{user.balance}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="view-button" onClick={() => viewUserDetails(user)}>
                                  View
                                </button>
                                <button
                                  className="status-button"
                                  onClick={() =>
                                    changeUserStatus(user.id, user.status === "active" ? "suspended" : "active")
                                  }
                                >
                                  {user.status === "active" ? "Suspend" : "Activate"}
                                </button>
                                <button
                                  className="delete-button"
                                  onClick={() => deleteUser(user.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "trades" && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Type</th>
                        <th>Asset</th>
                        <th>Amount</th>
                        <th>Price (USD)</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.length > 0 ? (
                        filteredTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td>{trade.id}</td>
                            <td>{trade.userId}</td>
                            <td>
                              <span className={`trade-type ${trade.type}`}>{trade.type}</span>
                            </td>
                            <td>{trade.asset}</td>
                            <td>{trade.amount}</td>
                            <td>${trade.price}</td>
                            <td>{trade.timestamp}</td>
                            <td>
                              <span className={`status-badge ${trade.status}`}>{trade.status}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="no-data">
                            No trades found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="admin-settings">
                  <div className="settings-card">
                    <h3>Admin Profile</h3>
                    <div className="settings-form">
                      <div className="form-group">
                        <label>Admin Username</label>
                        <input type="text" value="admin" disabled />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value="admin@cryptoplatform.com" disabled />
                      </div>
                      <button className="admin-submit-button">Update Profile</button>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>Security Settings</h3>
                    <div className="settings-form">
                      <div className="form-group">
                        <label>Change Password</label>
                        <input type="password" placeholder="Current password" />
                      </div>
                      <div className="form-group">
                        <input type="password" placeholder="New password" />
                      </div>
                      <div className="form-group">
                        <input type="password" placeholder="Confirm new password" />
                      </div>
                      <button className="admin-submit-button">Update Password</button>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>System Settings</h3>
                    <div className="settings-form">
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="notifications" checked />
                        <label htmlFor="notifications">Email Notifications</label>
                      </div>
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="twoFactor" />
                        <label htmlFor="twoFactor">Two-Factor Authentication</label>
                      </div>
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="maintenance" />
                        <label htmlFor="maintenance">Maintenance Mode</label>
                      </div>
                      <button className="admin-submit-button">Save Settings</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details: {selectedUser.username}</h3>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
            <div className="modal-content">
              <div className="user-details">
                <div className="detail-group">
                  <span className="detail-label">User ID:</span>
                  <span className="detail-value">{selectedUser.id}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${selectedUser.status}`}>{selectedUser.status}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">{new Date(selectedUser.lastLogin).toLocaleString()}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Balance:</span>
                  <span className="detail-value">{selectedUser.balance}</span>
                </div>
              </div>

              <h4>User Trades</h4>
              <div className="user-trades">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUserTrades(selectedUser.id).length > 0 ? (
                      getUserTrades(selectedUser.id).map((trade) => (
                        <tr key={trade.id}>
                          <td>{trade.id}</td>
                          <td>
                            <span className={`trade-type ${trade.type}`}>{trade.type}</span>
                          </td>
                          <td>{trade.asset}</td>
                          <td>{trade.amount}</td>
                          <td>${trade.price}</td>
                          <td>
                            <span className={`status-badge ${trade.status}`}>{trade.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          No trades found for this user
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button
                  className="admin-submit-button"
                  onClick={() => {
                    changeUserStatus(selectedUser.id, selectedUser.status === "active" ? "suspended" : "active")
                    closeModal()
                  }}
                >
                  {selectedUser.status === "active" ? "Suspend User" : "Activate User"}
                </button>
                <button className="admin-cancel-button" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

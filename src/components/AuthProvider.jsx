import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setToken, setAdminToken, setUsername } from '../RTK/Slices/AuthSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for token in localStorage on mount
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    const username = localStorage.getItem('username');

    if (token) {
      dispatch(setToken(token));
    }

    if (adminToken) {
      dispatch(setAdminToken(adminToken));
    }

    if (username) {
      dispatch(setUsername(username));
    }
  }, [dispatch]);

  return children;
};

export default AuthProvider; 
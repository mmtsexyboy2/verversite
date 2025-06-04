import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import jwt_decode from 'jwt-decode'; // For decoding, not verifying

const AuthContext = createContext();
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // For initial auth check
  const [accessToken, setAccessToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Try to load tokens and user on initial mount
    const initializeAuth = async () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedAccessToken && storedRefreshToken) {
        try {
          const decodedAccess = jwt_decode(storedAccessToken);
          if (decodedAccess.exp * 1000 > Date.now()) {
            setAccessToken(storedAccessToken);
            // Fetch user details with the current access token
            await fetchUser(storedAccessToken);
          } else {
            // Access token expired, try to refresh
            await attemptRefresh(storedRefreshToken);
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          // Clear potentially bad tokens, but don't force logout if server is just down
          // await logout();
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setAccessToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const fetchUser = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (error) {
      console.error('Failed to fetch user', error);
      if (error.response && error.response.status === 401) {
         // Don't logout here directly, let interceptor handle refresh
         // If refresh fails, interceptor will trigger logout.
         // This prevents logout loops if /me fails for other reasons right after refresh.
      }
    }
  };

  const attemptRefresh = async (refreshToken) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const newAccessToken = res.data.accessToken;
      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);
      await fetchUser(newAccessToken); // Fetch user with new token
      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Full logout if refresh fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAccessToken(null);
      setUser(null);
      // router.push('/login?error=session_expired'); // Avoid direct push here if called from interceptor
      return null;
    }
  };

  // Setup Axios interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        // Check if error is 401, not a retry attempt, and not the refresh token route itself
        if (error.response && error.response.status === 401 && !originalRequest._retry && originalRequest.url !== `${API_BASE_URL}/auth/refresh`) {
          originalRequest._retry = true;
          const storedRefreshToken = localStorage.getItem('refreshToken');
          if (storedRefreshToken) {
            console.log("Attempting to refresh token via interceptor...");
            const newAccessToken = await attemptRefresh(storedRefreshToken);
            if (newAccessToken) {
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return axios(originalRequest);
            } else {
              // Refresh failed, ensure logout state is set if attemptRefresh didn't already push to login
              if (router.pathname !== '/login') router.push('/login?error=session_expired_interceptor');
            }
          } else {
             // No refresh token, logout
            if (router.pathname !== '/login') router.push('/login?error=no_refresh_token');
          }
        }
        return Promise.reject(error);
      }
    );
    // Cleanup interceptor on unmount
    return () => axios.interceptors.response.eject(interceptor);
  }, [router]); // Added router to dependencies


  const login = (newAccessToken, newRefreshToken, userData) => {
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setAccessToken(newAccessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`; // Set for subsequent requests
    setUser(userData);
    router.push('/');
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
        try {
            // Inform backend to invalidate token, but proceed with client logout regardless
            await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken: storedRefreshToken }, {
              headers: { Authorization: `Bearer ${accessToken}` } // Use current access token for logout call if required by backend
            });
        } catch (error) {
            console.error("Logout request to server failed, clearing client-side anyway.", error);
        }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    router.push('/login?logged_out=true');
  };

  const googleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, googleLogin, fetchUser, attemptRefresh }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

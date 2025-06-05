import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // For initial auth check

    const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    });

    api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, error => {
        return Promise.reject(error);
    });

    const fetchUserProfile = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            // Validate token locally first (optional, but good for quick checks)
            const decodedToken = jwtDecode(token);
            if (decodedToken.exp * 1000 < Date.now()) {
                console.log("Token expired, attempting refresh or logout.");
                await attemptTokenRefresh(); // Try to refresh
                return; // Refresh will call fetchUserProfile again on success
            }

            const response = await api.get('/users/me');
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user profile or token invalid:', error);
            if (error.response && error.response.status === 401){
                // Token is invalid or expired, try to refresh
                await attemptTokenRefresh();
            } else {
                setUser(null); // Other errors, clear user
            }
        } finally {
            setLoading(false);
        }
    }, [api]); // Added api to dependency array

    const attemptTokenRefresh = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.log("No refresh token, logging out.");
            logout(); // Full logout if no refresh token
            setLoading(false);
            return;
        }
        try {
            console.log("Attempting token refresh...");
            const refreshResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/token/refresh`, { refreshToken });
            const { accessToken } = refreshResponse.data;
            if (accessToken) {
                console.log("Token refreshed successfully.");
                localStorage.setItem('token', accessToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                await fetchUserProfile(); // Fetch profile with new token
            } else {
                throw new Error("No access token received from refresh.");
            }
        } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            logout(); // Logout if refresh fails
        } finally {
             setLoading(false); // Ensure loading is set to false
        }
    }, [api, fetchUserProfile]); // Added api and fetchUserProfile


    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Add this useEffect to handle token expiry for proactive refresh
    useEffect(() => {
        const token = localStorage.getItem('token');
        let intervalId;
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Calculate time until 1 minute before actual expiry
                const expiresIn = (decoded.exp * 1000) - Date.now() - (60 * 1000); // 60 * 1000 ms = 1 minute

                if (expiresIn > 0) {
                    // Set an interval to attempt token refresh 1 minute before it expires.
                    // This helps maintain an active session without interrupting the user.
                   intervalId = setInterval(attemptTokenRefresh, expiresIn);
                } else {
                   // If token is already expired or very close to expiry, attempt refresh immediately.
                   attemptTokenRefresh();
                }
            } catch (e) {
                console.error("Error decoding token for interval setup:", e);
                // Potentially, if token is malformed, attempt refresh or logout
                attemptTokenRefresh();
            }
        }
        // Clear the interval when the component unmounts or dependencies change
        return () => clearInterval(intervalId);
    }, [user, attemptTokenRefresh]); // Rerun if user state changes (e.g. after login/logout) or refresh logic updates


    const login = (token, refreshToken) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchUserProfile(); // Fetch user profile with the new token
    };

    const logout = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Client-side logout should also inform the backend.
                // This call to '/users/logout' is intended to invalidate the refresh token on the server side,
                // preventing it from being used to generate new access tokens.
                await api.post('/users/logout');
            } catch (error) {
                console.error("Error during backend logout call:", error);
                // Even if backend call fails, proceed with client-side cleanup.
            }
        }
        // Clear tokens and user state from client
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    }, [api, fetchUserProfile]); // fetchUserProfile might be called if logout leads to state where profile needs re-check (though typically not needed here)


    return (
        <AuthContext.Provider value={{ user, login, logout, loading, api, fetchUserProfile, attemptTokenRefresh }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Corrected import

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
                const expiresIn = (decoded.exp * 1000) - Date.now() - (60 * 1000); // Refresh 1 min before expiry
                if (expiresIn > 0) {
                   intervalId = setInterval(attemptTokenRefresh, expiresIn);
                } else {
                   attemptTokenRefresh(); // If already expired or close to it
                }
            } catch (e) { console.error("Error decoding token for interval setup:", e); }
        }
        return () => clearInterval(intervalId);
    }, [user, attemptTokenRefresh]);


    const login = (token, refreshToken) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchUserProfile();
    };

    const logout = useCallback(async () => { // Make logout async if calling backend
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Inform backend to invalidate refresh token
                await api.post('/users/logout');
            } catch (error) {
                console.error("Error during backend logout call:", error);
                // Still proceed with client-side logout
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    }, [api]);


    return (
        <AuthContext.Provider value={{ user, login, logout, loading, api, fetchUserProfile, attemptTokenRefresh }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

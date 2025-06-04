import axios from 'axios';

// The base URL for our backend API
// In development, this might be proxied by Next.js to avoid CORS.
// In production, this would be the actual backend URL.
const API_BASE_URL = '/api/v1'; // Using relative path for proxy

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Cookies should be sent automatically by the browser if the request is to the same origin
  // or if CORS is configured correctly with credentials allowed on the backend.
  // withCredentials: true, // Important if backend and frontend are on different domains in prod.
});

// Interceptor to handle errors globally (optional)
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Handle errors (e.g., redirect to login on 401)
    if (error.response && error.response.status === 401) {
      // Specific handling for 401 can be done here or in components
      console.error('Unauthorized, redirecting to login...');
      // window.location.href = '/login'; // This might be too aggressive here
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Example API functions (can be expanded)
export const fetchUserProfile = () => {
  return apiClient.get('/users/me/profile');
};

export const updateUserProfile = (profileData) => {
  return apiClient.put('/users/me/profile', profileData);
};

export const logoutUser = () => {
  return apiClient.post('/auth/logout');
};

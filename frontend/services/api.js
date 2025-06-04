import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Category Services ---
export const fetchCategories = async () => {
  try {
    const response = await apiClient.get('/api/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

// --- Report Services ---
export const createReport = async (reportData) => {
  // reportData: { item_id, item_type, reason }
  try {
    const response = await apiClient.post('/api/reports', reportData);
    return response.data;
  } catch (error) {
    console.error('Error creating report:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const fetchAdminReports = async (status = 'pending', page = 1, limit = 10) => {
  try {
    const response = await apiClient.get(`/api/admin/reports?status=${status}&page=${page}&limit=${limit}`);
    return response.data; // Expected: { data: reportsArray, pagination: {} }
  } catch (error) {
    console.error('Error fetching admin reports:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const updateReportStatus = async (reportId, status) => {
  try {
    const response = await apiClient.post(`/api/admin/reports/${reportId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating report ${reportId} status:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const fetchTopicSuggestions = async (topicId) => {
  try {
    const response = await apiClient.get(`/api/topics/${topicId}/suggestions`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching suggestions for topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

// --- Feed Services ---
export const fetchFeed = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get(`/api/feed?page=${page}&limit=${limit}`);
    return response.data; // Expected: { data: topicsArray, pagination: {} }
  } catch (error) {
    console.error('Error fetching feed:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

// --- Topic Services ---
export const createTopic = async (topicData) => {
  // topicData should be FormData if it includes an image
  try {
    const response = await apiClient.post('/api/topics', topicData, {
      headers: {
        // Axios will set Content-Type to multipart/form-data automatically for FormData
        // If not using FormData (e.g. no image), it would be 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating topic:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const fetchTopics = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get(`/api/topics?page=${page}&limit=${limit}`);
    return response.data; // This should include { data: topicsArray, pagination: {} }
  } catch (error) {
    console.error('Error fetching topics:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const fetchTopicById = async (topicId) => {
  try {
    const response = await apiClient.get(`/api/topics/${topicId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const deleteTopic = async (topicId) => {
  try {
    const response = await apiClient.delete(`/api/topics/${topicId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const likeTopic = async (topicId) => {
  try {
    const response = await apiClient.post(`/api/topics/${topicId}/like`);
    return response.data; // Expected: { liked: boolean, likesCount: number }
  } catch (error) {
    console.error(`Error liking topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

// --- Comment Services ---
export const fetchComments = async (topicId) => {
  try {
    const response = await apiClient.get(`/api/topics/${topicId}/comments`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const createComment = async (topicId, commentData) => {
  // commentData: { text_content: string, parent_comment_id?: number }
  try {
    const response = await apiClient.post(`/api/topics/${topicId}/comments`, commentData);
    return response.data;
  } catch (error) {
    console.error(`Error creating comment for topic ${topicId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const deleteComment = async (commentId) => {
  try {
    const response = await apiClient.delete(`/api/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting comment ${commentId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export const likeComment = async (commentId) => {
  try {
    const response = await apiClient.post(`/api/comments/${commentId}/like`);
    return response.data; // Expected: { liked: boolean, likesCount: number }
  } catch (error) {
    console.error(`Error liking comment ${commentId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};


// You might add other services here, e.g., for user profile, auth, etc.
// For example:
export const fetchUserProfile = async () => {
  try {
    const response = await apiClient.get('/api/users/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server unreachable');
  }
};

export default apiClient;

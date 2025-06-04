import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // To get accessToken for auth'd requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const HomePage = () => {
  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken } = useAuth(); // Get accessToken if user is logged in

  const fetchTopics = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      // Use pagination.pageSize from state for consistency
      const response = await axios.get(`${API_BASE_URL}/topics`, {
        params: { page, pageSize: pagination.pageSize, sortBy: 'newest' },
        headers,
      });
      setTopics(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch topics.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.pageSize]); // pagination.pageSize is a dependency

  useEffect(() => {
    fetchTopics(pagination.page);
  }, [fetchTopics, pagination.page]); // Rerun if page changes

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  if (loading && topics.length === 0) return <p>Loading topics...</p>; // Show loading only on initial load
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Topics</h1>
      {topics.length === 0 && !loading && <p>No topics yet. Be the first to create one!</p>}
      {topics.map(topic => (
        <div key={topic.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{marginTop: 0, marginBottom: '10px'}}>
            <Link href={`/topic/${topic.id}`}><a>{topic.title}</a></Link>
          </h2>
          <p style={{fontSize: '0.9rem', color: '#555', marginBottom: '5px'}}>
            By: <strong>{topic.author_username || 'Unknown'}</strong> |
            Category: <strong>{topic.category_name || 'N/A'}</strong>
          </p>
          <p style={{fontSize: '0.9rem', color: '#555'}}>
            Likes: {topic.like_count} |
            Created: {new Date(topic.created_at).toLocaleDateString()}
            {accessToken && topic.hasLiked !== undefined && ( // Show only if logged in
                 <span style={{marginLeft: '10px', fontWeight: 'bold', color: topic.hasLiked ? 'green' : 'grey'}}>
                     {topic.hasLiked ? '✓ Liked' : '(Not Liked)'}
                 </span>
            )}
          </p>
        </div>
      ))}
      {topics.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button onClick={handlePrevPage} disabled={pagination.page <= 1 || loading}>
            Previous
          </button>
          <span style={{ margin: '0 15px' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button onClick={handleNextPage} disabled={pagination.page >= pagination.totalPages || loading}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};
export default HomePage;

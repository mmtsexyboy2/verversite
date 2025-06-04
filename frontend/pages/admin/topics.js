import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { fetchFeed } from '../../services/api'; // Using fetchFeed to get all topics for now
import axios from 'axios'; // Or dedicated admin service

const TopicsAdminPage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null}`
    }
  });

  const loadTopics = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      // Using fetchFeed as it provides a paginated list of all topics with author/category
      const response = await fetchFeed(page, 10);
      setTopics(response.data);
      setPagination(response.pagination);
      setCurrentPage(response.pagination.currentPage);
    } catch (err) {
      setError(err.message || 'Failed to load topics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // Removed apiClient from deps as it's stable

  useEffect(() => {
    loadTopics(currentPage);
  }, [loadTopics, currentPage]);

  const handleDeleteTopic = async (topicId) => {
    if (window.confirm(`Are you sure you want to delete topic ID ${topicId}? This action is permanent.`)) {
      try {
        await apiClient.delete(`/api/admin/topics/${topicId}`);
        alert('Topic deleted successfully.');
        loadTopics(currentPage); // Refresh the list
      } catch (err) {
        alert(`Error deleting topic: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleToggleFlag = async (topicId, flagName) => {
    try {
      await apiClient.post(`/api/admin/topics/${topicId}/${flagName}`);
      // Refresh data to show updated status
      // Or update local state optimistically for better UX
      setTopics(prevTopics =>
        prevTopics.map(t =>
          t.id === topicId ? { ...t, [`is_${flagName.replace('-', '_')}`]: !t[`is_${flagName.replace('-', '_')}`] } : t
        )
      );
      // Note: flagName from URL (e.g. 'ver-ver-tick') needs to match DB column (is_ver_ver_ticked)
      // The optimistic update above assumes a simple mapping. A refresh (loadTopics(currentPage)) is safer.
      loadTopics(currentPage);
    } catch (err) {
      alert(`Error toggling ${flagName} for topic ${topicId}: ${err.response?.data?.message || err.message}`);
    }
  };

  const styles = { /* Basic styles, similar to UsersAdminPage */
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
    button: { marginRight: '5px', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', border: 'none' },
    deleteButton: { backgroundColor: '#e74c3c', color: 'white' },
  };

  return (
    <AdminLayout>
      <Head><title>Admin - Topic Management</title></Head>
      <h1>Topic Management</h1>
      {loading && <p>Loading topics...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Author</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Flags</th> {/* For Pinned, Highlighted, Ticked */}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map(topic => (
                <tr key={topic.id}>
                  <td style={styles.td}>{topic.id}</td>
                  <td style={styles.td}>{topic.title}</td>
                  <td style={styles.td}>{topic.author_name} ({topic.user_id})</td>
                  <td style={styles.td}>{topic.category_name} ({topic.category_id})</td>
                  <td style={styles.td}>
                    <label style={{display: 'block', marginBottom: '5px'}}>
                      <input type="checkbox" checked={!!topic.is_pinned} onChange={() => handleToggleFlag(topic.id, 'pin')} /> Pin
                    </label>
                    <label style={{display: 'block', marginBottom: '5px'}}>
                      <input type="checkbox" checked={!!topic.is_highlighted} onChange={() => handleToggleFlag(topic.id, 'highlight')} /> Highlight
                    </label>
                    <label style={{display: 'block'}}>
                      <input type="checkbox" checked={!!topic.is_ver_ver_ticked} onChange={() => handleToggleFlag(topic.id, 'ver-ver-tick')} /> VerVerTick
                    </label>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDeleteTopic(topic.id)} style={{...styles.button, ...styles.deleteButton}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Basic Pagination Controls */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!pagination.currentPage || pagination.currentPage <= 1}>Previous</button>
            <span style={{ margin: '0 10px' }}>Page {pagination.currentPage} of {pagination.totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.currentPage || pagination.currentPage >= pagination.totalPages}>Next</button>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default TopicsAdminPage;

import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import axios from 'axios'; // Or use dedicated admin service functions from api.js

const AdminDashboardPage = () => {
  const [summaryStats, setSummaryStats] = useState(null);
  const [popularTopics, setPopularTopics] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
      headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null}`
      }
    });

    const fetchStats = async () => {
      setLoadingStats(true);
      setStatsError('');
      try {
        const summaryRes = await apiClient.get('/api/admin/stats/summary');
        setSummaryStats(summaryRes.data);

        const popularRes = await apiClient.get('/api/admin/stats/popular-topics');
        setPopularTopics(popularRes.data);
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        setStatsError(err.response?.data?.message || 'Failed to load statistics.');
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const styles = {
      statBox: { border: '1px solid #ddd', padding: '15px', borderRadius: '5px', textAlign: 'center', backgroundColor: 'white', marginBottom: '15px' },
      statValue: { fontSize: '2em', fontWeight: 'bold', color: '#2c3e50' },
      statLabel: { fontSize: '1em', color: '#7f8c8d' },
      sectionTitle: { marginTop: '30px', marginBottom: '10px', fontSize: '1.5em', color: '#34495e' },
      list: { listStyle: 'none', padding: 0 },
      listItem: { backgroundColor: '#f9f9f9', border: '1px solid #eee', padding: '10px', marginBottom: '5px', borderRadius: '4px' }
  };

  return (
    <AdminLayout>
      <Head><title>Admin Dashboard</title></Head>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the Ver Ver Site admin panel.</p>

      {loadingStats && <p>Loading statistics...</p>}
      {statsError && <p style={{ color: 'red' }}>{statsError}</p>}

      {summaryStats && (
        <div>
          <h2 style={styles.sectionTitle}>Site Summary</h2>
          <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
            <div style={styles.statBox}><p style={styles.statValue}>{summaryStats.totalUsers}</p><p style={styles.statLabel}>Total Users</p></div>
            <div style={styles.statBox}><p style={styles.statValue}>{summaryStats.totalTopics}</p><p style={styles.statLabel}>Total Topics</p></div>
            <div style={styles.statBox}><p style={styles.statValue}>{summaryStats.totalComments}</p><p style={styles.statLabel}>Total Comments</p></div>
          </div>
        </div>
      )}

      {popularTopics.length > 0 && (
        <div>
          <h2 style={styles.sectionTitle}>Top Popular Topics (by Likes)</h2>
          <ul style={styles.list}>
            {popularTopics.map(topic => (
              <li key={topic.id} style={styles.listItem}>
                <strong>{topic.title}</strong> (ID: {topic.id}) by {topic.author_name} - Likes: {topic.likes_count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;

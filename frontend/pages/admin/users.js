import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import axios from 'axios'; // Using axios directly or add admin specific services

const UsersAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const apiClient = axios.create({ // Temporary local apiClient for admin calls
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null}`
    }
  });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/api/admin/users?page=${page}&limit=10`);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(response.data.pagination.currentPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]); // apiClient dependency

  useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);


  const handleBan = async (userId) => {
    if (window.confirm('Are you sure you want to ban this user?')) {
      try {
        await apiClient.post(`/api/admin/users/${userId}/ban`);
        fetchUsers(currentPage); // Refresh list
      } catch (err) {
        alert(`Error banning user: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleUnban = async (userId) => {
    if (window.confirm('Are you sure you want to unban this user?')) {
      try {
        await apiClient.post(`/api/admin/users/${userId}/unban`);
        fetchUsers(currentPage); // Refresh list
      } catch (err) {
        alert(`Error unbanning user: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
     if (window.confirm(`Change user ${userId} role to ${newRole}?`)) {
      try {
        await apiClient.put(`/api/admin/users/${userId}/role`, { role: newRole });
        fetchUsers(currentPage); // Refresh list
      } catch (err) {
        alert(`Error changing role: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const styles = {
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
    button: { marginRight: '5px', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', border: 'none' },
    banButton: { backgroundColor: '#e74c3c', color: 'white' },
    unbanButton: { backgroundColor: '#2ecc71', color: 'white' },
    roleSelect: { padding: '5px' }
  };

  return (
    <AdminLayout>
      <Head><title>Admin - User Management</title></Head>
      <h1>User Management</h1>
      {loading && <p>Loading users...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={styles.td}>{user.id}</td>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <select
                        style={styles.roleSelect}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={user.email.toLowerCase() === (process.env.ADMIN_EMAILS?.split(',')[0].trim().toLowerCase() || 'cannot_disable_primary_admin')} // Simple check to prevent primary admin role change
                    >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={styles.td}>{user.is_banned ? 'Banned' : 'Active'}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {user.is_banned ? (
                      <button onClick={() => handleUnban(user.id)} style={{...styles.button, ...styles.unbanButton}}>Unban</button>
                    ) : (
                      <button onClick={() => handleBan(user.id)} style={{...styles.button, ...styles.banButton}}>Ban</button>
                    )}
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

export default UsersAdminPage;

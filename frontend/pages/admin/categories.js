import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { fetchCategories } from '../../services/api'; // Use existing public fetch
import axios from 'axios'; // Or dedicated admin service

const CategoriesAdminPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null); // For editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [themeConfig, setThemeConfig] = useState('{}'); // Stored as JSON string in textarea

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null}`
    }
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedCategories = await fetchCategories(); // Public GET
      setCategories(fetchedCategories);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleEdit = (category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setThemeConfig(JSON.stringify(category.theme_config || {}, null, 2));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentCategory(null);
    setName('');
    setDescription('');
    setThemeConfig('{}');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let parsedThemeConfig;
    try {
      parsedThemeConfig = JSON.parse(themeConfig);
    } catch (jsonErr) {
      setError('Invalid JSON in Theme Config. Please correct it.');
      return;
    }

    const categoryData = { name, description, theme_config: parsedThemeConfig };

    try {
      if (isEditing && currentCategory) {
        await apiClient.put(`/api/admin/categories/${currentCategory.id}`, categoryData);
      } else {
        await apiClient.post('/api/admin/categories', categoryData);
      }
      handleCancelEdit(); // Reset form
      loadCategories(); // Refresh list
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} category.`);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This might affect topics linked to it.')) {
      try {
        await apiClient.delete(`/api/admin/categories/${categoryId}`);
        loadCategories(); // Refresh list
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete category.');
      }
    }
  };

  const styles = { /* Basic styles, similar to UsersAdminPage */
    formContainer: { marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' },
    inputGroup: { marginBottom: '10px' },
    label: { display: 'block', marginBottom: '5px'},
    input: { width: '100%', padding: '8px', boxSizing: 'border-box' },
    textarea: { width: '100%', minHeight: '100px', padding: '8px', boxSizing: 'border-box' },
    button: { marginRight: '5px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', border: 'none' },
    saveButton: { backgroundColor: '#2ecc71', color: 'white' },
    cancelButton: { backgroundColor: '#95a5a6', color: 'white' },
    deleteButton: { backgroundColor: '#e74c3c', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
  };

  return (
    <AdminLayout>
      <Head><title>Admin - Category Management</title></Head>
      <h1>Category Management</h1>

      <div style={styles.formContainer}>
        <h2>{isEditing ? 'Edit Category' : 'Create New Category'}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>Name:</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="description" style={styles.label}>Description:</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} style={styles.textarea} />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="themeConfig" style={styles.label}>Theme Config (JSON):</label>
            <textarea id="themeConfig" value={themeConfig} onChange={e => setThemeConfig(e.target.value)} style={styles.textarea} />
          </div>
          <button type="submit" style={{...styles.button, ...styles.saveButton}}>{isEditing ? 'Update' : 'Create'}</button>
          {isEditing && <button type="button" onClick={handleCancelEdit} style={{...styles.button, ...styles.cancelButton}}>Cancel Edit</button>}
        </form>
      </div>

      {loading ? <p>Loading categories...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={styles.td}>{cat.id}</td>
                <td style={styles.td}>{cat.name}</td>
                <td style={styles.td}>{cat.description}</td>
                <td style={styles.td}>
                  <button onClick={() => handleEdit(cat)} style={{...styles.button, backgroundColor: '#3498db', color: 'white'}}>Edit</button>
                  <button onClick={() => handleDelete(cat.id)} style={{...styles.button, ...styles.deleteButton}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
};

export default CategoriesAdminPage;

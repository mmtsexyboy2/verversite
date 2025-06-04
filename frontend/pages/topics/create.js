import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchCategories, createTopic } from '../../services/api'; // Adjust path if needed
import Head from 'next/head';

const CreateTopicPage = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeThemeClass, setActiveThemeClass] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // For auth check

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login?message=Please login to create a topic');
    } else {
      setIsAuthenticated(true);
    }

    const loadCategories = async () => {
      try {
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
        if (fetchedCategories.length > 0) {
          const defaultCategory = fetchedCategories[0];
          setCategoryId(defaultCategory.id.toString());
          if (defaultCategory.theme_config && defaultCategory.theme_config.pageClassName) {
            setActiveThemeClass(defaultCategory.theme_config.pageClassName);
          } else {
            setActiveThemeClass(''); // Reset if no theme
          }
        }
      } catch (err) {
        setError('Failed to load categories. Please try again later.');
        setActiveThemeClass(''); // Reset on error
      }
    };
    loadCategories();
  }, []);

  const handleCategoryChange = (e) => {
    const selectedCatId = e.target.value;
    setCategoryId(selectedCatId);
    const selectedCategory = categories.find(cat => cat.id.toString() === selectedCatId);
    if (selectedCategory && selectedCategory.theme_config && selectedCategory.theme_config.pageClassName) {
      setActiveThemeClass(selectedCategory.theme_config.pageClassName);
    } else {
      setActiveThemeClass(''); // Reset if no theme or category not found
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || title.length > 255) {
      setError('Title is required and must be less than 255 characters.');
      return;
    }
    if (!textContent.trim()) {
      setError('Text content is required.');
      return;
    }
    if (!categoryId) {
      setError('Category is required.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('text_content', textContent);
    formData.append('category_id', categoryId);
    if (image) {
      formData.append('image', image);
    }

    try {
      const newTopic = await createTopic(formData);
      setSuccess(`Topic "${newTopic.title}" created successfully!`);
      // Clear form
      setTitle('');
      setTextContent('');
      setImage(null);
      // Optionally redirect: router.push(`/topics/${newTopic.id}`);
      // For now, just show success message and let user create another or navigate away
    } catch (err) {
      const errorMessage = err.message || (err.data && err.data.message) || 'Failed to create topic. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Simple inline styles for now
  const styles = {
    container: { maxWidth: '700px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '150px', boxSizing: 'border-box' },
    button: { backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    error: { color: 'red', marginBottom: '10px' },
    success: { color: 'green', marginBottom: '10px' },
  };


  return (
    <>
      <Head>
        <title>Create New Topic - ور ور سایت</title>
      </Head>
      <div className={activeThemeClass} style={{minHeight: '100vh', paddingTop: '1px', paddingBottom: '1px'}}> {/* Apply theme class & ensure it expands */}
        <div style={styles.container}> {/* Original container for content */}
          <h1>Create New Topic</h1>
          {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="title" style={styles.label}>Title:</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength="255"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="textContent" style={styles.label}>Content:</label>
            <textarea
              id="textContent"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              required
              style={styles.textarea}
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="category" style={styles.label}>Category:</label>
            <select
              id="category"
              value={categoryId}
              onChange={handleCategoryChange} // Use new handler
              required
              style={styles.input}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="image" style={styles.label}>Image (Optional):</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating...' : 'Create Topic'}
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateTopicPage;

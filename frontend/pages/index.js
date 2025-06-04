import React from 'react';
import Link from 'next/link';

import React, { useEffect, useState, useCallback } from 'react'; // useRef removed as not used directly here now
import Link from 'next/link';
import Head from 'next/head';
import { fetchFeed } from '../services/api';
import { useInView } from 'react-intersection-observer';

const HomePage = ({ initialTopics, initialPagination, initialError }) => {
  const [topics, setTopics] = useState(initialTopics || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  // Start from page 2 if initial data is present, else page 1
  const [page, setPage] = useState(initialTopics && initialTopics.length > 0 ? 2 : 1);
  const [hasMore, setHasMore] = useState(initialPagination ? initialPagination.currentPage < initialPagination.totalPages : false);
  const [token, setToken] = useState(null);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const loadMoreTopics = useCallback(async (pageNum) => {
    if (loading || !hasMore) return;

    setLoading(true);
    // setError(''); // Don't clear previous errors if new fetch fails
    try {
      const response = await fetchFeed(pageNum, 10);
      if (response.data && response.data.length > 0) {
        setTopics(prevTopics => [...prevTopics, ...response.data]);
        setPage(pageNum);
        setHasMore(response.data.length === (response.pagination.limit || 10) && response.pagination.currentPage < response.pagination.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError('Failed to load more feed items. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  // Effect for infinite scroll, now starts fetching from page 2 if initial data loaded
  useEffect(() => {
    if (inView && !loading && hasMore) {
      loadMoreTopics(page); // page state already reflects the *next* page to fetch
    }
  }, [inView, loading, hasMore, page, loadMoreTopics]);

  // Basic card styling - "default, elegant, beautiful, and simple theme"
  // This is subjective, using simple, clean lines.
  const styles = {
    container: { maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: '#f4f7f6' },
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #e0e0e0', marginBottom: '30px' },
    logo: { fontSize: '1.8em', fontWeight: 'bold', color: '#333' },
    navLinks: { display: 'flex', gap: '20px'},
    navLink: { textDecoration: 'none', color: '#007bff', fontSize: '1em', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.2s ease'},
    navLinkHover: { backgroundColor: '#e9ecef' }, // Example hover, better with CSS classes
    feedTitle: { fontSize: '2em', color: '#333', textAlign: 'center', marginBottom: '30px' },
    topicCard: {
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s ease-in-out',
    },
    // topicCardHover: { transform: 'translateY(-3px)', boxShadow: '0 4px 10px rgba(0,0,0,0.08)'}, // Example hover
    topicTitle: { fontSize: '1.6em', margin: '0 0 10px 0', color: '#2c3e50' },
    topicMeta: { fontSize: '0.85em', color: '#7f8c8d', marginBottom: '15px' },
    topicImage: { width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover', borderRadius: '6px', marginBottom: '15px' },
    topicSnippet: { color: '#34495e', lineHeight: '1.6', fontSize: '1em' },
    loadingIndicator: { textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#555' },
    highlightedTopicCard: {
        backgroundColor: '#fff9e6', // Light yellow background for highlighted
        border: '1px solid #ffecb3', // Yellowish border
    },
    verVerTickBadge: {
        display: 'inline-block',
        marginLeft: '10px',
        padding: '3px 7px',
        fontSize: '0.8em',
        color: 'white',
        backgroundColor: '#27ae60', // Green badge
        borderRadius: '4px',
        fontWeight: 'bold',
    }
  };


  return (
    <>
      <Head>
        <title>Ver Ver Site - Main Feed</title>
        <meta name="description" content="Discover interesting topics and discussions on Ver Ver Site." />
      </Head>
      <div style={styles.container}>
        <nav style={styles.nav}>
          <div style={styles.logo}><Link href="/" style={{textDecoration: 'none', color: 'inherit'}}>ور ور سایت</Link></div>
          <div style={styles.navLinks}>
            <Link href="/" style={styles.navLink}
                  onMouseOver={e => e.currentTarget.style.backgroundColor=styles.navLinkHover.backgroundColor}
                  onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>Home</Link>
            {token ? (
              <>
                <Link href="/profile" style={styles.navLink}
                      onMouseOver={e => e.currentTarget.style.backgroundColor=styles.navLinkHover.backgroundColor}
                      onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>Profile</Link>
                <Link href="/topics/create" style={styles.navLink}
                      onMouseOver={e => e.currentTarget.style.backgroundColor=styles.navLinkHover.backgroundColor}
                      onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>Create Topic</Link>
              </>
            ) : (
              <Link href="/login" style={styles.navLink}
                    onMouseOver={e => e.currentTarget.style.backgroundColor=styles.navLinkHover.backgroundColor}
                    onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>Login</Link>
            )}
          </div>
        </nav>

        <h1 style={styles.feedTitle}>Feed</h1>

        {topics.length === 0 && loading && <p style={styles.loadingIndicator}>Loading feed...</p>}
        {topics.length === 0 && !loading && !error && <p>No topics found in your feed yet.</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        <div>
          {topics.map((topic, index) => (
            <div
              key={topic.id + '-' + index}
              style={{...styles.topicCard, ...(topic.is_highlighted && styles.highlightedTopicCard)}}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';}}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';}}
            >
              <header> {/* Header for topic title and meta */}
                <h2 style={styles.topicTitle}>
                  <Link href={`/topics/${topic.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {topic.title}
                  </Link>
                  {topic.is_ver_ver_ticked && <span style={styles.verVerTickBadge}>✔ VerVer</span>}
                </h2>
                <p style={styles.topicMeta}>
                  By: {topic.author_name} | Category: {topic.category_name || 'Uncategorized'} | Posted on: {new Date(topic.created_at).toLocaleDateString()} | Likes: {topic.likes_count || 0}
                  {topic.is_pinned && <span style={{marginLeft: '10px', fontWeight: 'bold', color: '#e74c3c'}}> (Pinned)</span>}
                </p>
              </header>
              {topic.image_url && (
                <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${topic.image_url}`} alt={topic.title} style={styles.topicImage} />
              )}
              <p style={styles.topicSnippet}>
                {topic.text_content.substring(0, 200)}{topic.text_content.length > 200 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>

        {/* Intersection Observer Target */}
        <div ref={ref} style={{ height: '10px' }} />

        {loading && topics.length > 0 && <p style={styles.loadingIndicator}>Loading more topics...</p>}
        {!hasMore && topics.length > 0 && <p style={{ textAlign: 'center', color: '#777', marginTop: '30px' }}>You've reached the end!</p>}
      </div>
    </>
  );
};

export async function getServerSideProps(context) {
  let initialTopics = [];
  let initialPagination = null;
  let initialError = '';

  try {
    // Fetch page 1 for initial SSR
    const response = await fetchFeed(1, 10);
    if (response.data) {
      initialTopics = response.data;
      initialPagination = response.pagination;
    } else {
      throw new Error("Feed data is empty or not in expected format");
    }
  } catch (err) {
    console.error('Error fetching initial feed in SSR:', err);
    initialError = 'Failed to load initial feed. Please try again later.';
  }

  return {
    props: {
      initialTopics,
      initialPagination,
      initialError,
    },
  };
}

export default HomePage;

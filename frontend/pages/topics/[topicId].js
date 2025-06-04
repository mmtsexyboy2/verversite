import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router'; // Keep for router.push, etc.
import {
  fetchTopicById,
  deleteTopic,
  fetchComments,
  createComment,
  deleteComment,
  likeTopic,
  likeComment,
  fetchTopicSuggestions,
  createReport // Added createReport
} from '../../services/api';

const TopicPage = ({ initialTopic, initialComments, initialSuggestions, initialError, topicIdParam }) => {
  const router = useRouter();

  const [topic, setTopic] = useState(initialTopic);
  const [comments, setComments] = useState(initialComments || []);
  const [error, setError] = useState(initialError || '');
  const [activeThemeClass, setActiveThemeClass] = useState(
    initialTopic?.category_theme_config?.pageClassName || ''
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentError, setCommentError] = useState('');
  const [topicLikes, setTopicLikes] = useState(initialTopic?.likes_count || 0);
  const [suggestions, setSuggestions] = useState(initialSuggestions || []);

  // State for Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingItem, setReportingItem] = useState(null); // { id, type: 'topic' | 'comment' }
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');


  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({ id: payload.id, name: payload.name || "User" });
      } catch (e) {
        console.error("Failed to parse token for user info:", e);
        localStorage.removeItem('jwtToken');
      }
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (topicIdParam) {
      try {
        // Re-fetch primary data, not just comments, in case topic details (like likes) changed
        const fetchedTopic = await fetchTopicById(topicIdParam);
        setTopic(fetchedTopic);
        setTopicLikes(fetchedTopic.likes_count || 0);
        if (fetchedTopic.category_theme_config && fetchedTopic.category_theme_config.pageClassName) {
          setActiveThemeClass(fetchedTopic.category_theme_config.pageClassName);
        } else {
          setActiveThemeClass('');
        }
        const fetchedComments = await fetchComments(topicIdParam);
        setComments(fetchedComments);
        // Optionally re-fetch suggestions if they could change frequently
        // const fetchedSuggestions = await fetchTopicSuggestions(topicIdParam);
        // setSuggestions(fetchedSuggestions);
      } catch (err) {
        setError('Failed to refresh data.');
      }
    }
  }, [topicIdParam]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) { alert("Please login to comment."); router.push('/login'); return; }
    if (!newCommentText.trim()) {
      setCommentError("Comment text cannot be empty.");
      return;
    }
    setCommentError('');
    try {
      const commentData = {
        text_content: newCommentText,
        parent_comment_id: replyingTo ? replyingTo.id : null,
      };
      // Use topic.id from state as topicIdParam might not be available if router is not ready (though with SSR it should be)
      await createComment(topic.id, commentData);
      setNewCommentText('');
      setReplyingTo(null);
      refreshData();
    } catch (err) {
      setCommentError(err.message || "Failed to post comment.");
    }
  };

  const handleReplyClick = (comment) => {
    setReplyingTo({id: comment.id, author_name: comment.author_name});
    setNewCommentText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewCommentText('');
  };

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) { alert("Please login."); router.push('/login'); return; }
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(commentId);
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
      } catch (err) {
        setCommentError(err.message || "Failed to delete comment.");
      }
    }
  };

  const handleLikeTopic = async () => {
    if (!currentUser) { alert("Please login to like topics."); router.push('/login'); return; }
    try {
      const response = await likeTopic(topic.id);
      setTopicLikes(response.likesCount);
    } catch (err) {
      alert(err.message || "Failed to like topic.");
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!currentUser) { alert("Please login to like comments."); router.push('/login'); return; }
    try {
      const response = await likeComment(commentId);
      setComments(prevComments =>
        prevComments.map(c => c.id === commentId ? {...c, likes_count: response.likesCount } : c)
      );
    } catch (err) {
      alert(err.message || "Failed to like comment.");
    }
  };

  const handleDeleteTopic = async () => {
    if (!topic || !currentUser) return;
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        await deleteTopic(topic.id);
        alert('Topic deleted successfully.');
        router.push('/');
      } catch (err) {
        setError(err.message || 'Failed to delete topic. Please try again.');
      }
    }
  };

  const styles = {
    container: { maxWidth: '800px', margin: '20px auto', padding: '20px', backgroundColor: 'var(--page-bg-color, #fff)', color: 'var(--page-text-color, #333)', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)' },
    themedWrapper: { minHeight: '100vh', paddingTop: '1px', paddingBottom: '1px' }, // Applied to outer div with className
    navLink: { marginRight: '10px', color: 'var(--accent-color, #007bff)', textDecoration: 'none', fontWeight: 'bold' },
    title: { fontSize: '2.2em', marginBottom: '10px', color: 'var(--accent-color, #333)' },
    likeButton: { background: 'var(--button-bg-color, #f0f0f0)', border: '1px solid var(--accent-color, #ccc)', color: 'var(--button-text-color, #333)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', marginLeft: '10px' },
    meta: { fontSize: '0.9em', color: 'var(--meta-text-color, #777)', marginBottom: '20px' },
    contentWrapper: { paddingBottom: '20px', borderBottom: '1px solid var(--border-color, #eee)', marginBottom: '20px' },
    articleContent: { lineHeight: '1.7', whiteSpace: 'pre-wrap' },
    image: { maxWidth: '100%', height: 'auto', borderRadius: '4px', margin: '20px 0' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px', fontSize: '0.9em' },
    error: { color: 'red', marginTop: '10px' },
    commentsSection: { marginTop: '30px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '20px' },
    comment: { borderBottom: '1px solid var(--divider-color, #f0f0f0)', padding: '10px 0', marginBottom: '10px' },
    commentAuthor: { fontWeight: 'bold', color: 'var(--accent-color, #555)' },
    commentText: { marginTop: '5px' },
    commentMeta: { fontSize: '0.8em', color: 'var(--meta-text-color, #888)' },
    commentForm: { marginTop: '20px', border: '1px solid var(--border-color, #ccc)', padding: '15px', borderRadius: '8px' },
    textarea: { width: '100%', minHeight: '80px', padding: '10px', border: '1px solid var(--input-border-color, #ccc)', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '10px', backgroundColor: 'var(--input-bg-color, #fff)', color: 'var(--input-text-color, #333)' },
    submitButton: { backgroundColor: 'var(--accent-color, #28a745)', color: 'var(--button-on-accent-text-color, white)', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    replyingToText: { fontStyle: 'italic', color: 'var(--meta-text-color, #666)', marginBottom: '5px'},
    suggestionsSection: { marginTop: '30px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '20px' },
    suggestionItem: { listStyle: 'none', marginBottom: '10px', padding: '10px', backgroundColor: 'var(--suggestion-bg-color, #f9f9f9)', borderRadius: '4px' },
    suggestionTitle: { fontWeight: 'bold', color: 'var(--accent-color, #007bff)', textDecoration: 'none' },
    reportButton: { background: 'none', border: '1px solid #ffc107', color: '#ffc107', fontSize: '0.8em', marginLeft: '10px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px', color: '#333' }, // Ensure modal text is visible
    modalTextarea: { width: '100%', minHeight: '100px', marginBottom: '10px', padding: '10px' }
  };

  const openReportModal = (id, type) => {
    if (!currentUser) { alert("Please login to report content."); router.push('/login'); return; }
    setReportingItem({ id, type });
    setReportReason('');
    setReportError('');
    setReportSuccess('');
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportingItem) return;
    setReportError('');
    setReportSuccess('');
    try {
      await createReport({
        item_id: reportingItem.id,
        item_type: reportingItem.type,
        reason: reportReason
      });
      setReportSuccess('Report submitted successfully. Thank you.');
      // Keep modal open to show success, or close after a delay
      setTimeout(() => {
        setShowReportModal(false);
        setReportingItem(null);
      }, 2000);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report.');
    }
  };

  const renderComment = (comment, level = 0) => (
    <article key={comment.id} style={{ ...styles.comment, marginLeft: `${level * 20}px` }}>
      <p style={styles.commentAuthor}>{comment.author_name}</p>
      <div style={styles.commentText}>{comment.text_content}</div>
      <footer style={styles.commentMeta}>
        Posted on: {new Date(comment.created_at).toLocaleDateString()} | Likes: {comment.likes_count || 0}
        <button onClick={() => handleLikeComment(comment.id)} style={{...styles.likeButton, fontSize: '0.8em', marginLeft: '10px', padding: '3px 8px'}}>Like</button>
        {currentUser && (
          <>
            <button onClick={() => handleReplyClick(comment)} style={{...styles.likeButton, fontSize: '0.8em', marginLeft: '10px', padding: '3px 8px'}}>Reply</button>
            <button onClick={() => openReportModal(comment.id, 'comment')} style={styles.reportButton}>Report</button>
          </>
        )}
        {currentUser && comment.user_id === currentUser.id && (
          <button onClick={() => handleDeleteComment(comment.id)} style={{...styles.deleteButton, fontSize: '0.8em', marginLeft: '10px', padding: '3px 8px'}}>Delete</button>
        )}
      </footer>
    </article>
  );

  const topLevelComments = comments.filter(c => !c.parent_comment_id);

  if (error && !topic) return <div style={{textAlign: 'center', marginTop: '50px'}}><p style={styles.error}>{error}</p><Link href="/" style={styles.navLink}>Go Home</Link></div>;
  if (!topic) return <div style={{textAlign: 'center', marginTop: '50px'}}><p>Topic not found or still loading...</p><Link href="/" style={styles.navLink}>Go Home</Link></div>;

  const isAuthor = currentUser && topic && topic.user_id === currentUser.id;
  const metaDescription = topic.meta_description_snippet || topic.text_content?.substring(0,160) || "Read more about this topic on Ver Ver Site.";


  return (
    <>
      <Head>
        <title>{topic.title} - ور ور سایت</title>
        <meta name="description" content={metaDescription} />
      </Head>
      <div className={activeThemeClass} style={styles.themedWrapper}>
        <main style={styles.container}>
          <nav style={{ marginBottom: '20px' }}>
            <Link href="/" style={styles.navLink}>Home</Link>
            {currentUser && <Link href="/topics/create" style={styles.navLink}>Create Topic</Link>}
          </nav>

          <article>
            <header>
              <h1 style={styles.title}>{topic.title}</h1>
              <button onClick={handleLikeTopic} style={styles.likeButton}>Like Topic ({topicLikes})</button>
              {currentUser && (
                <button onClick={() => openReportModal(topic.id, 'topic')} style={{...styles.reportButton, marginLeft: '10px'}}>Report Topic</button>
              )}
              <p style={styles.meta}>
                By: {topic.author_name} | Category: {topic.category_name || 'Uncategorized'} | Posted on: {new Date(topic.created_at).toLocaleDateString()}
              </p>
            </header>

            {topic.image_url && (
              <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${topic.image_url}`} alt={topic.title} style={styles.image} />
            )}
            <div style={styles.articleContent}>{topic.text_content}</div>

            {isAuthor && (
              <footer>
                <button onClick={handleDeleteTopic} style={styles.deleteButton}>
                  Delete Topic
                </button>
              </footer>
            )}
          </article>

          {showReportModal && (
            <div style={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
              <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3>Report {reportingItem?.type}</h3>
                <form onSubmit={handleReportSubmit}>
                  <textarea
                    style={styles.modalTextarea}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder={`Reason for reporting this ${reportingItem?.type} (optional)`}
                  />
                  {reportError && <p style={{color: 'red', fontSize: '0.9em'}}>{reportError}</p>}
                  {reportSuccess && <p style={{color: 'green', fontSize: '0.9em'}}>{reportSuccess}</p>}
                  {!reportSuccess && (
                    <button type="submit" style={styles.submitButton}>Submit Report</button>
                  )}
                  <button type="button" onClick={() => setShowReportModal(false)} style={{marginLeft: '10px'}}>Close</button>
                </form>
              </div>
            </div>
          )}

          <section style={styles.commentsSection}>
            <h2>Comments</h2>
            {currentUser ? (
              <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
                {replyingTo && (
                  <p style={styles.replyingToText}>
                    Replying to {replyingTo.author_name}
                    <button type="button" onClick={handleCancelReply} style={{marginLeft: '10px', background: 'none', border: 'none', color: 'red', cursor: 'pointer'}}>Cancel</button>
                  </p>
                )}
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={replyingTo ? `Write your reply...` : "Write a comment..."}
                  required
                  style={styles.textarea}
                />
                {commentError && <p style={{color: 'red', fontSize: '0.9em'}}>{commentError}</p>}
                <button type="submit" style={styles.submitButton}>Post Comment</button>
              </form>
            ) : (
              <p><Link href="/login" style={styles.navLink}>Login</Link> to post comments.</p>
            )}

            { comments.length > 0 ? (
                topLevelComments.map(comment => renderComment(comment))
              ) : <p>No comments yet. Be the first to comment!</p>
            }
          </section>

          {suggestions.length > 0 && (
            <aside style={styles.suggestionsSection}>
              <h2>Suggested Topics</h2>
              <ul>
                {suggestions.map(sugg => (
                  <li key={sugg.id} style={styles.suggestionItem}>
                    <Link href={`/topics/${sugg.id}`} style={styles.suggestionTitle}>
                      {sugg.title}
                    </Link>
                    <p style={{fontSize: '0.9em', color: '#666'}}>
                      By: {sugg.author_name} | Category: {sugg.category_name || 'Uncategorized'}
                    </p>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </main>
      </div>
    </>
  );
};

export async function getServerSideProps(context) {
  const { topicId } = context.params;
  let initialTopic = null;
  let initialComments = [];
  let initialSuggestions = [];
  let initialError = '';

  try {
    // These API calls are now to the full URL because they run server-side
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_SSR || process.env.NEXT_PUBLIC_BACKEND_URL;

    const topicRes = await fetch(`${baseUrl}/api/topics/${topicId}`);
    if (!topicRes.ok) {
      if (topicRes.status === 404) return { notFound: true };
      throw new Error(`Failed to fetch topic: ${topicRes.statusText}`);
    }
    initialTopic = await topicRes.json();

    const commentsRes = await fetch(`${baseUrl}/api/topics/${topicId}/comments`);
    if (!commentsRes.ok) throw new Error(`Failed to fetch comments: ${commentsRes.statusText}`);
    initialComments = await commentsRes.json();

    const suggestionsRes = await fetch(`${baseUrl}/api/topics/${topicId}/suggestions`);
    if (!suggestionsRes.ok) throw new Error(`Failed to fetch suggestions: ${suggestionsRes.statusText}`);
    initialSuggestions = await suggestionsRes.json();

  } catch (err) {
    console.error(`Error fetching data for topic ${topicId} in SSR:`, err);
    initialError = `Failed to load topic data. Please check the URL or try again later.`;
    // If topic fetch failed specifically with 404, it's handled above.
    // Other errors will show the error message on the page.
  }

  return {
    props: {
      initialTopic,
      initialComments,
      initialSuggestions,
      initialError,
      topicIdParam: topicId,
    },
  };
}

export default TopicPage;

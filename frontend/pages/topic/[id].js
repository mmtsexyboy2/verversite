import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Basic CommentItem component
const CommentItem = ({ comment, allComments, level = 0, onLikeComment, currentUserId }) => {
  const replies = allComments.filter(c => c.parent_comment_id === comment.id);

  const handleLikeClick = () => {
    if (onLikeComment) {
        onLikeComment(comment.id, comment.hasLiked);
    }
  };

  return (
    <div style={{
        marginLeft: `${level * 25}px`,
        borderLeft: level > 0 ? '2px solid #eee' : 'none',
        paddingLeft: level > 0 ? '10px' : '0px',
        marginTop: '10px',
        marginBottom: '10px'
    }}>
      <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', background: '#f9f9f9' }}>
        <p style={{margin: '0 0 5px 0'}}>
          <strong>{comment.author_username || 'Unknown'}:</strong>
        </p>
        <p style={{margin: '0 0 10px 0'}}>{comment.body}</p>
        <small>
          Likes: {comment.like_count}
          {currentUserId && (
            <button onClick={handleLikeClick} style={{marginLeft: '10px', padding: '2px 5px', fontSize: '0.8rem'}}>
              {comment.hasLiked ? 'Unlike' : 'Like'}
            </button>
          )}
          {' | '} Created: {new Date(comment.created_at).toLocaleDateString()}
        </small>
      </div>
      {/* Placeholder for reply button/form */}
      {replies.map(reply => (
        <CommentItem
            key={reply.id}
            comment={reply}
            allComments={allComments}
            level={level + 1}
            onLikeComment={onLikeComment}
            currentUserId={currentUserId}
        />
      ))}
    </div>
  );
};

const TopicPage = () => {
  const router = useRouter();
  const { id: topicId } = router.query;
  const [topic, setTopic] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalItems: 0 });
  const [loadingTopic, setLoadingTopic] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, user: currentUser } = useAuth();

  const fetchTopicData = useCallback(async () => {
    if (!topicId) return;
    setLoadingTopic(true);
    setError(null);
    try {
      const headers = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const topicRes = await axios.get(`${API_BASE_URL}/topics/${topicId}`, { headers });
      setTopic(topicRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch topic.');
      console.error(err);
    } finally {
      setLoadingTopic(false);
    }
  }, [topicId, accessToken]);

  const fetchCommentsData = useCallback(async (page = 1) => {
    if (!topicId) return;
    setLoadingComments(true);
    try {
      const headers = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const commentsRes = await axios.get(`${API_BASE_URL}/topics/${topicId}/comments`, {
        params: { page, pageSize: commentsPagination.pageSize, orderBy: 'created_at_asc' },
        headers
      });
      setComments(commentsRes.data.data);
      setCommentsPagination(commentsRes.data.pagination);
    } catch (err) {
      console.error('Failed to fetch comments:', err.response?.data?.message || err.message);
    } finally {
      setLoadingComments(false);
    }
  }, [topicId, accessToken, commentsPagination.pageSize]);

  useEffect(() => {
    if (topicId) { // Ensure topicId is available
        fetchTopicData();
        fetchCommentsData(commentsPagination.page);
    }
  }, [topicId, commentsPagination.page]); // Removed fetchTopicData, fetchCommentsData from deps to avoid re-runs due to useCallback changing

  const handleLikeTopic = async () => {
    if (!currentUser || !topic) return; // Must be logged in
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      if (topic.hasLiked) {
        await axios.delete(`${API_BASE_URL}/likes`, { data: { topicId: topic.id }, headers });
        setTopic(prev => ({ ...prev, like_count: prev.like_count - 1, hasLiked: false }));
      } else {
        await axios.post(`${API_BASE_URL}/likes`, { topicId: topic.id }, { headers });
        setTopic(prev => ({ ...prev, like_count: prev.like_count + 1, hasLiked: true }));
      }
    } catch (err) {
      console.error("Error liking/unliking topic", err.response?.data?.message || err.message);
    }
  };

  const handleLikeComment = async (commentId, hasLiked) => {
    if (!currentUser) return; // Must be logged in
    try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        if (hasLiked) {
            await axios.delete(`${API_BASE_URL}/likes`, { data: { commentId }, headers });
        } else {
            await axios.post(`${API_BASE_URL}/likes`, { commentId }, { headers });
        }
        // Refresh comments to show updated like counts and status
        fetchCommentsData(commentsPagination.page);
    } catch (err) {
        console.error("Error liking/unliking comment", err.response?.data?.message || err.message);
    }
  };


  const handleNextCommentsPage = () => {
    if (commentsPagination.page < commentsPagination.totalPages) {
      setCommentsPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };
  const handlePrevCommentsPage = () => {
     if (commentsPagination.page > 1) {
      setCommentsPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  if (loadingTopic) return <p>Loading topic details...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!topic) return <p>Topic not found.</p>;

  const topLevelComments = comments.filter(comment => !comment.parent_comment_id);

  return (
    <div>
      <h1>{topic.title}</h1>
      <p>
        By: <strong>{topic.author_username || 'Unknown'}</strong> |
        Category: <strong>{topic.category_name || 'N/A'}</strong>
      </p>
      <p>
        Likes: {topic.like_count}
        {currentUser && (
          <button onClick={handleLikeTopic} style={{marginLeft: '10px'}}>
            {topic.hasLiked ? 'Unlike Topic' : 'Like Topic'}
          </button>
        )}
        {' | '} Created: {new Date(topic.created_at).toLocaleDateString()}
      </p>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '5px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
        <p>{topic.body}</p>
      </div>

      <hr style={{ margin: '30px 0' }} />
      <h2>Comments ({commentsPagination.totalItems})</h2>
      {/* Placeholder for new comment form */}
      {loadingComments && comments.length === 0 ? <p>Loading comments...</p> : (
        comments.length === 0 ? <p>No comments yet. Be the first to comment!</p> :
        topLevelComments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            onLikeComment={handleLikeComment}
            currentUserId={currentUser?.id}
          />
        ))
      )}
      {comments.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button onClick={handlePrevCommentsPage} disabled={commentsPagination.page <= 1 || loadingComments}>
            Previous Comments
          </button>
          <span style={{ margin: '0 15px' }}>
            Page {commentsPagination.page} of {commentsPagination.totalPages}
          </span>
          <button onClick={handleNextCommentsPage} disabled={commentsPagination.page >= commentsPagination.totalPages || loadingComments}>
            Next Comments
          </button>
        </div>
      )}
    </div>
  );
};
export default TopicPage;

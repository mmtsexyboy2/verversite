import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, UserCircleIcon, ChatAlt2Icon, ThumbUpIcon, TrashIcon } from '@heroicons/react/solid';

// CommentForm component
const CommentForm = ({ topicId, parentCommentId = null, onCommentPosted }) => {
    const { user, api, loading: authLoading } = useAuth();
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!body.trim()) {
            setError('Comment cannot be empty.');
            return;
        }
        if (!user) {
            setError('You must be logged in to comment.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const response = await api.post(`/topics/${topicId}/comments`, {
                body,
                parent_comment_id: parentCommentId
            });
            setBody('');
            if (onCommentPosted) onCommentPosted(response.data); // Pass new comment up
        } catch (err) {
            console.error("Failed to post comment:", err);
            setError(err.response?.data?.message || 'Failed to post comment.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user && !authLoading) return <p className="text-sm text-gray-600">Please <Link href={`/login?redirect=/topics/${topicId}`} legacyBehavior><a className="text-blue-500 hover:underline">login</a></Link> to comment.</p>;
    if (authLoading) return <p className="text-sm">Loading comment form...</p>;

    return (
        <form onSubmit={handleSubmit} className="mt-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={parentCommentId ? "Write a reply..." : "Write a comment..."}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <button type="submit" disabled={submitting} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-60">
                {submitting ? 'Posting...' : 'Post Comment'}
            </button>
        </form>
    );
};

// CommentItem component (can be in its own file later)
const CommentItem = ({ comment, topicId, onCommentDeleted, onReplySuccess }) => {
    const { user, api, loading: authLoading } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [liked, setLiked] = useState(false); // Placeholder for like state
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);

    // Check if current user liked this comment (example)
    useEffect(() => {
        const checkLikeStatus = async () => {
            if (user && api) {
                try {
                    const res = await api.get(`/likes/status?comment_id=${comment.id}`);
                    setLiked(res.data.liked);
                } catch (e) { console.error("Failed to fetch comment like status", e); }
            }
        };
        checkLikeStatus();
    }, [user, api, comment.id]);


    const handleLikeUnlike = async () => {
        if (!user || !api) return;
        try {
            await api.post('/likes', { comment_id: comment.id });
            setLiked(!liked);
            setLikeCount(prev => liked ? prev - 1 : prev + 1);
        } catch (e) { console.error("Failed to like/unlike comment", e); }
    };

    const handleDeleteComment = async () => {
        if (!api || !confirm("Are you sure you want to delete this comment?")) return;
        try {
            await api.delete(`/topics/${topicId}/comments/${comment.id}`);
            if (onCommentDeleted) onCommentDeleted(comment.id);
        } catch (err) {
            console.error("Failed to delete comment:", err);
            alert(err.response?.data?.message || "Failed to delete comment.");
        }
    };

    const handleReplyPosted = (newReply) => {
        setShowReplyForm(false);
        if(onReplySuccess) onReplySuccess(newReply); // This should ideally add to a list of children comments
    }

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    return (
        <div className={`ml-${comment.parent_comment_id ? 6 * (String(comment.id).length - String(comment.parent_comment_id).length) : 0} py-3 border-b border-gray-200 last:border-b-0`}>
             {/* Simplified nesting display based on assumption of parent_comment_id depth */}
            <div className="flex items-start space-x-3">
                <img src={comment.author_avatar || `https://ui-avatars.com/api/?name=${comment.author_username}&background=random&size=40`} alt={comment.author_username} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${comment.author_username}`} legacyBehavior><a className="text-sm font-semibold text-gray-800 hover:underline">{comment.author_username}</a></Link>
                        <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="text-gray-700 mt-1 text-sm sm:text-base">{comment.body}</p>
                    <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                        <button onClick={handleLikeUnlike} className={`flex items-center hover:text-blue-500 ${liked ? 'text-blue-500' : ''}`}>
                            <ThumbUpIcon className="w-4 h-4 mr-0.5"/> {likeCount}
                        </button>
                        {!comment.parent_comment_id && ( // Allow replying only to top-level comments for simplicity now
                            <button onClick={() => setShowReplyForm(!showReplyForm)} className="hover:text-blue-500">Reply</button>
                        )}
                        {(user?.id === comment.user_id || user?.is_staff || user?.is_superuser) && (
                            <button onClick={handleDeleteComment} className="text-red-400 hover:text-red-600 flex items-center">
                                <TrashIcon className="w-4 h-4 mr-0.5"/> Delete
                            </button>
                        )}
                    </div>
                    {showReplyForm && (
                        <CommentForm topicId={topicId} parentCommentId={comment.id} onCommentPosted={handleReplyPosted} />
                    )}
                    {/* Render child comments here if implementing deeper nesting display */}
                </div>
            </div>
        </div>
    );
};


const SingleTopicPage = () => {
    const router = useRouter();
    const { id: topicId } = router.query;
    const { user, api, loading: authLoading } = useAuth();
    const [topic, setTopic] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const fetchTopicAndComments = async () => {
        if (!topicId || !api) return;
        setLoading(true);
        try {
            const [topicRes, commentsRes] = await Promise.all([
                api.get(`/topics/${topicId}`),
                api.get(`/topics/${topicId}/comments?sort_by=created_at&order=asc`) // Fetch comments sorted oldest first
            ]);
            setTopic(topicRes.data);
            setLikeCount(topicRes.data.like_count || 0)
            setComments(commentsRes.data.data || []);

            if (user) { // Check like status for topic if user is logged in
                const likeStatusRes = await api.get(`/likes/status?topic_id=${topicId}`);
                setLiked(likeStatusRes.data.liked);
            }

        } catch (err) {
            console.error("Failed to fetch topic or comments:", err);
            setError(err.response?.data?.message || 'Failed to load topic data.');
            if(err.response?.status === 404) setTopic(null); // Explicitly set topic to null on 404
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (router.isReady) { // Ensure topicId is available
             fetchTopicAndComments();
        }
    }, [topicId, api, user, router.isReady]); // Add user to deps for like status check

    const handleCommentPosted = (newComment) => {
        // If parent_comment_id is null, add to top level.
        // Otherwise, find parent and add as child (more complex UI update)
        // For now, just re-fetch all comments for simplicity or add to flat list
        setComments(prevComments => [...prevComments, newComment].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
        // Or fetchTopicAndComments(); // Simpler, but less performant
    };

    const handleCommentDeleted = (deletedCommentId) => {
        setComments(prev => prev.filter(c => c.id !== deletedCommentId));
        // Also need to deletion of child comments if parent is deleted (DB handles it, UI needs update)
    };

    const handleLikeUnlikeTopic = async () => {
        if (!user || !api) return;
        try {
            await api.post('/likes', { topic_id: topic.id });
            setLiked(!liked);
            setLikeCount(prev => liked ? prev - 1 : prev + 1);
        } catch (e) { console.error("Failed to like/unlike topic", e); }
    };

    const handleDeleteTopic = async () => {
        if (!api || !topic || !confirm("Are you sure you want to delete this topic?")) return;
        try {
            await api.delete(`/topics/${topic.id}`);
            router.push('/'); // Redirect to home after deletion
        } catch (err) {
            console.error("Failed to delete topic:", err);
            alert(err.response?.data?.message || "Failed to delete topic.");
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    // Apply dynamic theme based on category
    useEffect(() => {
        if (topic && topic.category_theme) {
            // Example: document.body.style.backgroundColor = topic.category_theme.backgroundColor;
            // This is a simplistic approach. A more robust solution would use CSS variables or styled-components themes.
            // For now, we'll just log it, actual theme change needs more setup.
            console.log("Category theme:", topic.category_theme);
        }
        return () => {
            // Reset theme if necessary: document.body.style.backgroundColor = '';
        };
    }, [topic]);


    if (loading || authLoading) return <div className="text-center py-10">Loading topic...</div>;
    if (error && !topic) return <div className="text-center py-10 text-red-500">Error: {error} <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">Go Home</a></Link></div>;
    if (!topic) return <div className="text-center py-10 text-gray-500">Topic not found. <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">Go Home</a></Link></div>;


    return (
        <div className="bg-white shadow-xl rounded-lg p-4 sm:p-6 lg:p-8">
            <Link href="/" legacyBehavior>
                <a className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-4 text-sm">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to topics
                </a>
            </Link>

            {topic.category_name && (
                <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium mb-2 inline-block">
                    {topic.category_name}
                </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3">{topic.title}</h1>

            <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 mb-4 space-x-3">
                <div className="flex items-center">
                    <UserCircleIcon className="w-5 h-5 mr-1 text-gray-400" />
                    <Link href={`/profile/${topic.author_username}`} legacyBehavior><a className="hover:underline">{topic.author_username || 'Anonymous'}</a></Link>
                    {topic.author_avatar && <img src={topic.author_avatar} alt={topic.author_username} className="w-6 h-6 rounded-full ml-2" />}
                </div>
                <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-1 text-gray-400" />
                    <span>{formatDate(topic.created_at)}</span>
                </div>
            </div>

            {topic.image_url && (
                <img src={topic.image_url} alt={topic.title} className="w-full max-h-[500px] object-contain rounded-md my-4 sm:my-6" />
            )}

            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: topic.body.replace(/\n/g, '<br />') }}>
                {/* Using dangerouslySetInnerHTML for simple <br />. Sanitize if allowing HTML input. */}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
                <button
                    onClick={handleLikeUnlikeTopic}
                    disabled={!user || authLoading}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150
                                ${liked ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}
                                disabled:opacity-50`}
                >
                    <ThumbUpIcon className="w-5 h-5" />
                    <span>{liked ? 'Liked' : 'Like'}</span>
                    <span className="ml-1">{likeCount}</span>
                </button>
                {(user?.id === topic.user_id || user?.is_staff || user?.is_superuser) && (
                     <button
                        onClick={handleDeleteTopic}
                        disabled={authLoading}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1 disabled:opacity-50">
                         <TrashIcon className="w-4 h-4"/> <span>Delete Topic</span>
                     </button>
                )}
            </div>


            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <ChatAlt2Icon className="w-6 h-6 mr-2 text-gray-500" /> Comments ({comments.length})
                </h2>
                <CommentForm topicId={topicId} onCommentPosted={handleCommentPosted} />
                {comments.length > 0 ? (
                    <div className="space-y-1"> {/* Reduced space for denser comments */}
                        {comments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                topicId={topicId}
                                onCommentDeleted={handleCommentDeleted}
                                onReplySuccess={handleCommentPosted} // Simplified reply handling
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                )}
            </div>
        </div>
    );
};

export default SingleTopicPage;

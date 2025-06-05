import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

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

    if (!user && !authLoading) return <p className="text-sm text-gray-600">Please <Link href={`/login?redirect=/topics/${topicId}`} legacyBehavior><a className="text-primary hover:text-primary-dark hover:underline transition-colors duration-150">login</a></Link> to comment.</p>;
    if (authLoading) return <p className="text-sm">Loading comment form...</p>;

    return (
        <form onSubmit={handleSubmit} className="mt-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={parentCommentId ? "Write a reply..." : "Write a comment..."}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" // Keeping existing blue focus for forms for now
                disabled={submitting}
            />
            {error && <p className="text-error text-xs mt-1">{error}</p>} {/* Use semantic error color */}
            <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-60 transition-colors duration-150"
            >
                {submitting ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Posting...
                    </>
                ) : (
                    'Post Comment'
                )}
            </button>
        </form>
    );
};

export default CommentForm;

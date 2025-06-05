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

export default CommentForm;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { ThumbUpIcon, TrashIcon } from '@heroicons/react/solid';
import CommentForm from './CommentForm'; // Import the newly created CommentForm

const CommentItem = ({ comment, topicId, allComments, onCommentDeleted, onReplySuccess, depth }) => {
    const { user, api, loading: authLoading } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);

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
            if (onCommentDeleted) onCommentDeleted(comment.id, comment.parent_comment_id);
        } catch (err) {
            console.error("Failed to delete comment:", err);
            alert(err.response?.data?.message || "Failed to delete comment.");
        }
    };

    const handleReplyPosted = (newReply) => {
        setShowReplyForm(false);
        if(onReplySuccess) onReplySuccess(newReply);
    }

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    const childComments = comment.children || [];

    return (
        <div
            style={{ marginLeft: `${depth * 16}px` }} // Reduced multiplier from 20px to 16px
            className={`py-3 border-b border-gray-200 last:border-b-0 ${depth > 0 ? 'border-l-2 border-gray-100 pl-3' : ''}`}
        >
            <div className="flex items-start space-x-3">
                <img src={comment.author_avatar || `https://ui-avatars.com/api/?name=${comment.author_username}&background=random&size=40`} alt={comment.author_username} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${comment.author_username}`} legacyBehavior>
                            <a className="text-sm font-semibold text-text_default hover:underline">{comment.author_username}</a>
                        </Link>
                        <p className="text-xs text-text_secondary">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="text-text_default mt-1 text-sm sm:text-base leading-relaxed">{comment.body}</p> {/* Added leading-relaxed */}
                    <div className="mt-2 flex items-center space-x-3 text-xs text-text_secondary">
                        <button
                            onClick={handleLikeUnlike}
                            className={`flex items-center hover:text-primary transition-colors duration-150 ${liked ? 'text-primary' : 'text-text_secondary'}`}
                        >
                            <ThumbUpIcon className="w-4 h-4 mr-0.5"/> {likeCount}
                        </button>
                        <button onClick={() => setShowReplyForm(!showReplyForm)} className="hover:text-primary transition-colors duration-150">Reply</button>
                        {(user?.id === comment.user_id || user?.is_staff || user?.is_superuser) && (
                            <button onClick={handleDeleteComment} className="text-error hover:opacity-80 flex items-center transition-opacity duration-150"> {/* Using semantic color */}
                                <TrashIcon className="w-4 h-4 mr-0.5"/> Delete
                            </button>
                        )}
                    </div>
                    {showReplyForm && (
                        <CommentForm topicId={topicId} parentCommentId={comment.id} onCommentPosted={handleReplyPosted} />
                    )}
                </div>
            </div>
            {childComments.length > 0 && (
                <div className="mt-3 space-y-1">
                    {childComments.map(child => (
                        <CommentItem
                            key={child.id}
                            comment={child}
                            topicId={topicId}
                            allComments={allComments}
                            onCommentDeleted={onCommentDeleted}
                            onReplySuccess={onReplySuccess}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;

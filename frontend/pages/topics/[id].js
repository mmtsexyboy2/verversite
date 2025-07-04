import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, ChatAlt2Icon, ThumbUpIcon, TrashIcon, UserIcon, TagIcon } from '@heroicons/react/solid';
import CommentForm from '../../components/CommentForm';
import CommentItem from '../../components/CommentItem';

const SingleTopicPage = () => {
    const router = useRouter();
    const { id: topicId } = router.query;
    const { user, api, loading: authLoading } = useAuth();
    const [topic, setTopic] = useState(null);
    const [comments, setComments] = useState([]); // This will store the flat list from API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [dynamicTopicStyles, setDynamicTopicStyles] = useState({});
    const [currentBgClass, setCurrentBgClass] = useState('bg-white');

    /**
     * Transforms a flat list of comments (received from the API) into a nested tree structure.
     * Each comment object in the output tree will have a `children` array property
     * containing its direct replies.
     *
     * @param {Array<Object>} commentList - The flat list of comment objects.
     *        Each comment should have an `id` and `parent_comment_id` (nullable).
     * @returns {Array<Object>} A list of top-level comment objects, each potentially
     *          containing a `children` array of nested comments.
     */
    const buildCommentTree = (commentList) => {
        const commentMap = {}; // Stores comments by ID for quick lookup and modification.

        // First pass: Initialize each comment in the map and add a 'children' array.
        // This ensures that every comment object, even those without children yet,
        // has the 'children' property, simplifying later rendering.
        commentList.forEach(comment => {
            commentMap[comment.id] = { ...comment, children: [] };
        });

        const tree = []; // This will hold the top-level comments (those without a parent_comment_id).

        // Second pass: Populate the 'children' arrays.
        // Iterate through the original list (now in commentMap with 'children' arrays).
        commentList.forEach(commentPtr => { // Using commentPtr to signify it's a pointer to an item in commentMap
            const comment = commentMap[commentPtr.id]; // Get the comment object from the map
            if (comment.parent_comment_id) {
                // If it's a child comment, find its parent in the map.
                const parent = commentMap[comment.parent_comment_id];
                if (parent) {
                    // If parent exists in the map, add this comment to the parent's 'children' array.
                    parent.children.push(comment);
                } else {
                    // Orphan comment (parent_comment_id refers to a non-existent or non-fetched comment).
                    // Treat it as a top-level comment for robustness, though this might indicate data integrity issues
                    // or incomplete data fetching from the backend.
                    tree.push(comment);
                }
            } else {
                // If it's a top-level comment (no parent_comment_id), add it directly to the tree.
                tree.push(comment);
            }
        });
        return tree; // Returns the list of top-level comments, which contain their children.
    };

    const fetchTopicAndComments = async () => {
        if (!topicId || !api) return;
        setLoading(true);
        try {
            const [topicRes, commentsRes] = await Promise.all([
                api.get(`/topics/${topicId}`),
                api.get(`/topics/${topicId}/comments?sort_by=created_at&order=asc`) // Fetch comments sorted oldest first
            ]);
            setTopic(topicRes.data);
            setLikeCount(topicRes.data.like_count || 0);
            // Sort comments by creation time to ensure parents are processed before children if backend doesn't guarantee order
            const sortedComments = (commentsRes.data.data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            setComments(sortedComments);


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
    }, [topicId, api, user, router.isReady]);

    const handleCommentPosted = (newComment) => {
        // Optimistically add the new comment to the local flat 'comments' state.
        // The `buildCommentTree` function will then correctly place it in the
        // displayed tree structure during the next render.
        // Re-sorting by date ensures that if multiple comments are posted quickly,
        // or if there's any slight delay, the chronological order is maintained
        // before tree construction, which can be helpful for some tree building strategies.
        setComments(prevComments => {
            const updatedComments = [...prevComments, newComment];
            return updatedComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        // A more complex optimistic update could involve inserting the new comment
        // directly into the tree structure in state, but simply updating the flat list
        // and letting `buildCommentTree` handle it is simpler and often sufficient.
    };

    const handleCommentDeleted = (deletedCommentId, parentCommentId) => {
        // When a comment is deleted, it and all its descendants must be removed
        // from the local flat 'comments' state. The `buildCommentTree` function
        // will then correctly reflect these removals in the displayed tree.
        setComments(prevComments => {
            const commentsToDelete = new Set();
            commentsToDelete.add(deletedCommentId);

            // Iteratively find all descendants of the deleted comment.
            // This loop continues as long as new descendants are being found and added.
            let newDescendantsFoundInLastPass;
            do {
                newDescendantsFoundInLastPass = false;
                prevComments.forEach(comment => {
                    // If a comment's parent is marked for deletion, and the comment itself isn't yet,
                    // mark it for deletion and note that we found new descendants in this pass.
                    if (comment.parent_comment_id && commentsToDelete.has(comment.parent_comment_id) && !commentsToDelete.has(comment.id)) {
                        commentsToDelete.add(comment.id);
                        newDescendantsFoundInLastPass = true;
                    }
                });
            } while (newDescendantsFoundInLastPass);

            // Return a new list excluding all comments marked for deletion.
            return prevComments.filter(c => !commentsToDelete.has(c.id));
        });
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
        if (topic && topic.category_theme && typeof topic.category_theme === 'object') {
            const theme = topic.category_theme;
            const newStyles = {};
            let newBgClass = 'bg-white';

            if (theme.pageBackgroundColor) {
                newStyles.backgroundColor = theme.pageBackgroundColor;
                newBgClass = 'bg-transparent';
            } else {
                newBgClass = 'bg-white';
            }

            if (theme.primaryTextColor) {
                newStyles.color = theme.primaryTextColor;
            }

            if (theme.backgroundImageUrl) {
                newStyles.backgroundImage = `url('${theme.backgroundImageUrl}')`;
                newStyles.backgroundSize = 'cover';
                newStyles.backgroundPosition = 'center';
            }

            setDynamicTopicStyles(newStyles);
            setCurrentBgClass(newBgClass);
        } else {
            setDynamicTopicStyles({});
            setCurrentBgClass('bg-white');
        }

        return () => {
            setDynamicTopicStyles({});
            setCurrentBgClass('bg-white');
        };
    }, [topic]);


    if (loading || authLoading) return <div className="text-center py-10 text-text_secondary">Loading topic...</div>;
    if (error && !topic) return <div className="text-center py-10 text-error">Error: {error} <Link href="/" legacyBehavior><a className="text-primary hover:text-primary-dark hover:underline">Go Home</a></Link></div>;
    if (!topic) return <div className="text-center py-10 text-text_secondary">Topic not found. <Link href="/" legacyBehavior><a className="text-primary hover:text-primary-dark hover:underline">Go Home</a></Link></div>;


    // Determine text color class based on dynamic styles
    const textColorClass = dynamicTopicStyles.color ? '' : 'text-text_default';

    return (
        <div
            style={dynamicTopicStyles}
            className={`${currentBgClass} ${textColorClass} shadow-xl rounded-lg p-4 sm:p-6 lg:p-8 transition-colors duration-300`}
        >
            <Link href="/" legacyBehavior>
                <a className="inline-flex items-center text-primary hover:text-primary-dark mb-4 text-sm transition-colors duration-150">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to topics
                </a>
            </Link>

            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${dynamicTopicStyles.color ? '' : 'text-text_default'}`}>{topic.title}</h1>

            {/* Updated Meta Information Section */}
            <div className={`flex flex-wrap items-center text-sm space-x-3 md:space-x-4 mb-4 ${dynamicTopicStyles.color ? '' : 'text-text_secondary'}`}>
                <div className="flex items-center">
                    <UserIcon className="w-5 h-5 mr-1.5 text-gray-400" /> {/* Keeping icon color slightly lighter for subtlety */}
                    <Link href={`/profile/${topic.author_username}`} legacyBehavior>
                        <a className="hover:underline font-medium text-text_default">{topic.author_username || 'Anonymous'}</a>
                    </Link>
                    {topic.author_avatar && <img src={topic.author_avatar} alt={topic.author_username} className="w-6 h-6 rounded-full ml-2" />}
                </div>

                {topic.created_at && (
                    <>
                        <span className="text-gray-400 hidden md:inline">•</span> {/* Separator color */}
                        <div className="flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-1.5 text-gray-400" /> {/* Keeping icon color slightly lighter */}
                            <span>{formatDate(topic.created_at)}</span>
                        </div>
                    </>
                )}

                {topic.category_name && (
                    <>
                        <span className="text-gray-400 hidden md:inline">•</span> {/* Separator color */}
                        <div className="flex items-center">
                            <TagIcon className="w-5 h-5 mr-1.5 text-gray-400" /> {/* Keeping icon color slightly lighter */}
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                {/* Category styling can remain distinct or be themed with primary/secondary later */}
                                {topic.category_name}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {topic.image_url && (
                <img src={topic.image_url} alt={topic.title} className="w-full max-h-[500px] object-contain rounded-md my-4 sm:my-6" />
            )}

            <div className={`prose prose-sm sm:prose-base lg:prose-lg max-w-none mb-6 ${dynamicTopicStyles.color ? '' : 'text-text_default'}`} dangerouslySetInnerHTML={{ __html: topic.body.replace(/\n/g, '<br />') }}>
                {/* text-text_default applied to prose container; prose itself will style internal elements. Consider prose-true_gray or similar if further refinement needed. */}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
                <button
                    onClick={handleLikeUnlikeTopic}
                    disabled={!user || authLoading}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150
                                ${liked ? 'bg-primary text-white' : `bg-gray-200 hover:bg-gray-300 ${dynamicTopicStyles.color ? '' : 'text-text_default'}`}
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
                        className="bg-error hover:opacity-80 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1 disabled:opacity-50 transition-opacity duration-150"> {/* Using semantic color */}
                         <TrashIcon className="w-4 h-4"/> <span>Delete Topic</span>
                     </button>
                )}
            </div>


            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className={`text-xl sm:text-2xl font-semibold mb-4 flex items-center ${dynamicTopicStyles.color ? '' : 'text-text_default'}`}>
                    <ChatAlt2Icon className={`w-6 h-6 mr-2 ${dynamicTopicStyles.color ? '' : 'text-text_secondary'}`} /> Comments ({comments.filter(c => !c.parent_comment_id).length} top-level)
                </h2>
                <CommentForm topicId={topicId} onCommentPosted={handleCommentPosted} />
                {comments.length > 0 ? (
                    <div className="space-y-1">
                        {buildCommentTree(comments).map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                topicId={topicId}
                                allComments={comments}
                                onCommentDeleted={handleCommentDeleted}
                                onReplySuccess={handleCommentPosted}
                                depth={0}
                            />
                        ))}
                    </div>
                ) : (
                    <p className={`${dynamicTopicStyles.color ? '' : 'text-text_secondary'} text-sm`}>No comments yet. Be the first to comment!</p>
                )}
            </div>
        </div>
    );
};

export default SingleTopicPage;

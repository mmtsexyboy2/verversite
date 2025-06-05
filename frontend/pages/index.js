import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TopicCard from '../components/TopicCard';
import TopicCardSkeleton from '../components/TopicCardSkeleton'; // Import Skeleton

const ITEMS_PER_PAGE = 15;

export default function HomePage() {
    const { api, loading: authLoading } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef(); // For infinite scroll

    const fetchFeedTopics = useCallback(async (currentPage) => {
        if (!api || loadingTopics) return; // Prevent multiple simultaneous fetches

        setLoadingTopics(true);
        setError(null);
        try {
            const response = await api.get(`/feed?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
            const newTopics = response.data.data || [];

            setTopics(prevTopics => {
                // Prevent duplicates if backend pagination isn't perfectly stable with the shuffling
                const existingIds = new Set(prevTopics.map(t => t.id));
                const uniqueNewTopics = newTopics.filter(t => !existingIds.has(t.id));
                return currentPage === 1 ? uniqueNewTopics : [...prevTopics, ...uniqueNewTopics];
            });

            setHasMore(newTopics.length === ITEMS_PER_PAGE && response.data.pagination.page < response.data.pagination.total_pages);
            // Or simply: setHasMore(newTopics.length > 0); if total_pages is an estimate
            // For a feed that might not always fill ITEMS_PER_PAGE but still has more pages:
            // setHasMore(response.data.pagination.page < response.data.pagination.total_pages);
            // The backend's total_pages is an estimate, so newTopics.length === ITEMS_PER_PAGE is a decent proxy for now
        } catch (err) {
            console.error("Failed to fetch feed topics:", err);
            setError(err.message || 'Failed to load topics.');
            // Potentially stop trying if error persists for a specific page?
        } finally {
            setLoadingTopics(false);
        }
    }, [api, loadingTopics]); // Add loadingTopics to dependencies

    // Initial load
    useEffect(() => {
        if (!authLoading && api) { // Ensure api is available
            setTopics([]); // Reset topics when auth state changes or on initial load after auth
            setPage(1);    // Reset page
            setHasMore(true); // Assume there's more initially
            fetchFeedTopics(1); // Fetch page 1
        }
    }, [authLoading, api, fetchFeedTopics]); // Added fetchFeedTopics to ensure it's stable before being used in the effect

    // Infinite scroll observer
    const lastTopicElementRef = useCallback(node => {
        if (loadingTopics) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingTopics) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingTopics, hasMore]);

    // Effect for fetching when page changes (due to scroll or button)
    useEffect(() => {
        if (page > 1 && hasMore) { // Only fetch if page > 1, initial load is separate
            fetchFeedTopics(page);
        }
    }, [page, hasMore, fetchFeedTopics]);


    // Render logic
    if (!topics.length && (authLoading || (loadingTopics && page === 1))) {
        // Show skeleton loaders for initial load
        return (
            <>
                <h1 className="text-3xl font-semibold mb-8 text-center text-text_default">Topic Feed</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <TopicCardSkeleton key={index} />
                    ))}
                </div>
            </>
        );
    }

    if (error && !topics.length) { // Show error prominently if initial load fails
        return <div className="text-center py-10 text-error">Error: {error}</div>; {/* Use semantic error color */}
    }

    return (
        <>
            <h1 className="text-3xl font-semibold mb-8 text-center text-text_default">Topic Feed</h1> {/* Use text_default */}
            {topics.length === 0 && !loadingTopics && !error && (
                <p className="text-center text-text_secondary">No topics in your feed right now. Check back later or create one!</p> {/* Use text_secondary */}
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic, index) => {
                    if (topics.length === index + 1) { // If it's the last topic
                        return (
                            <div ref={lastTopicElementRef} key={topic.id}>
                                <TopicCard topic={topic} />
                            </div>
                        );
                    } else {
                        return <TopicCard key={topic.id} topic={topic} />;
                    }
                })}
            </div>
            {loadingTopics && (page > 1 || topics.length > 0) && ( // Show spinner only for subsequent loads
                <div className="text-center py-10 flex items-center justify-center text-text_secondary">
                    <svg className="animate-spin h-5 w-5 mr-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading more topics...
                </div>
            )}
            {!loadingTopics && !hasMore && topics.length > 0 && (
                <p className="text-center text-text_secondary py-10">You've reached the end of the feed!</p> {/* Use text_secondary */}
            )}
            {/* Fallback "Load More" button if infinite scroll is problematic or as an alternative */}
            {/* {!loadingTopics && hasMore && topics.length > 0 && (
                <div className="text-center py-10">
                    <button
                        onClick={() => setPage(prevPage => prevPage + 1)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Load More
                    </button>
                </div>
            )} */}
             {error && topics.length > 0 && ( // Show non-blocking error for subsequent loads
                <div className="text-center py-5 text-red-500">Could not load more topics: {error}</div>
            )}
        </>
    );
}

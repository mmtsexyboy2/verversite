const knex = require('knex')(require('../../knexfile').development);

const getFeedTopics = async ({ page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;

    // Define date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const dayBeforeYesterdayStart = new Date(yesterdayStart);
    dayBeforeYesterdayStart.setDate(yesterdayStart.getDate() - 1); // For "older days" demarcation

    // Helper to fetch topics with common fields and ordering
    const fetchTopicsWithDetails = (queryBuilder) => {
        return queryBuilder
            .select(
                'topics.*',
                'users.username as author_username',
                'users.avatar_url as author_avatar',
                'categories.name as category_name',
                knex.raw('(SELECT COUNT(*)::integer FROM comments WHERE comments.topic_id = topics.id) as comment_count'),
                knex.raw('(SELECT COUNT(*)::integer FROM likes WHERE likes.topic_id = topics.id) as like_count'),
                // Popularity score: sum of likes and comments. Adjust weighting if needed.
                knex.raw('(COALESCE((SELECT COUNT(*)::integer FROM likes WHERE likes.topic_id = topics.id), 0) + COALESCE((SELECT COUNT(*)::integer FROM comments WHERE comments.topic_id = topics.id), 0)) as popularity_score')
            )
            .leftJoin('users', 'topics.user_id', 'users.id')
            .leftJoin('categories', 'topics.category_id', 'categories.id');
    };

    // --- Logic for 90% (Today & Yesterday) ---
    const ninetyPercentLimit = Math.floor(limit * 0.9);
    const todayLimit = Math.floor(ninetyPercentLimit * 0.6); // 60% of 90% total limit
    const yesterdayLimit = ninetyPercentLimit - todayLimit; // 30% of 90% total limit (remaining of the 90%)

    // Section 1: Today's Topics (target: 60% of 90% of total feed items)
    // Sub-section: Popular topics from today (target: 10% of today's 60% share)
    const todayPopularLimit = Math.floor(todayLimit * 0.1);
    // Sub-section: Other (less popular, newer) topics from today (target: remaining 50% of today's 60% share)
    const todayOtherLimit = todayLimit - todayPopularLimit;

    const todayPopularTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '>=', todayStart)
        .orderBy('popularity_score', 'desc')
        .orderBy('topics.created_at', 'desc')
        .limit(todayPopularLimit);

    const todayOtherTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '>=', todayStart)
        .whereNotIn('topics.id', todayPopularTopics.map(t => t.id)) // Exclude already selected popular
        .orderBy('topics.created_at', 'desc') // Prioritize newer among these
        .orderBy('popularity_score', 'asc') // And less popular ones
        .limit(todayOtherLimit);

    // Section 2: Yesterday's Topics (target: 30% of 90% of total feed items)
    // Sub-section: Popular topics from yesterday (target: ~20% of yesterday's 30% share)
    const yesterdayPopularLimit = Math.floor(yesterdayLimit * (20/30));
    // Sub-section: Less popular topics from yesterday (target: ~5% of yesterday's 30% share)
    const yesterdayLessPopularLimit = Math.floor(yesterdayLimit * (5/30));
    // Sub-section: Super popular topics from before yesterday, filling remaining yesterday slots (target: ~5% of yesterday's 30% share)
    const yesterdayPastSuperPopularLimit = yesterdayLimit - yesterdayPopularLimit - yesterdayLessPopularLimit;

    const yesterdayPopularTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '>=', yesterdayStart)
        .andWhere('topics.created_at', '<', todayStart)
        .orderBy('popularity_score', 'desc')
        .orderBy('topics.created_at', 'desc')
        .limit(yesterdayPopularLimit);

    const yesterdayLessPopularTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '>=', yesterdayStart)
        .andWhere('topics.created_at', '<', todayStart)
        .whereNotIn('topics.id', yesterdayPopularTopics.map(t => t.id))
        .orderBy('popularity_score', 'asc')
        .orderBy('topics.created_at', 'desc')
        .limit(yesterdayLessPopularLimit);

    const pastSuperPopularForYesterdaySlot = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '<', yesterdayStart) // From before yesterday
        .orderBy('popularity_score', 'desc') // Super popular
        .orderBy('topics.created_at', 'desc') // Freshest among super popular
        .limit(yesterdayPastSuperPopularLimit);


    // Section 3: Historical Topics (target: remaining 10% of total feed items)
    const tenPercentLimit = limit - ninetyPercentLimit;
    // Sub-section: Less popular historical topics (target: 4% of 10% historical share)
    const historicalLessPopularLimit = Math.floor(tenPercentLimit * 0.4);
    // Sub-section: Other historical topics (potentially more popular or random, target: remaining 6% of 10% historical share)
    const historicalRandomOrMorePopularLimit = tenPercentLimit - historicalLessPopularLimit;


    const historicalLessPopularTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '<', dayBeforeYesterdayStart) // Older than yesterday
        .whereNotIn('topics.id', pastSuperPopularForYesterdaySlot.map(t => t.id))
        .orderBy('popularity_score', 'asc') // Less popular
        .orderBy('topics.created_at', 'desc') // Freshest among these
        .limit(historicalLessPopularLimit);

    const historicalOtherTopics = await fetchTopicsWithDetails(knex('topics'))
        .where('topics.created_at', '<', dayBeforeYesterdayStart)
        .whereNotIn('topics.id', pastSuperPopularForYesterdaySlot.map(t => t.id).concat(historicalLessPopularTopics.map(t => t.id)))
        .orderBy('topics.created_at', 'desc')
        .limit(historicalRandomOrMorePopularLimit);

    let combinedTopics = [
        ...todayPopularTopics, ...todayOtherTopics,
        ...yesterdayPopularTopics, ...yesterdayLessPopularTopics, ...pastSuperPopularForYesterdaySlot,
        ...historicalLessPopularTopics, ...historicalOtherTopics
    ];

    const uniqueTopics = Array.from(new Map(combinedTopics.map(topic => [topic.id, topic])).values());

    // The problem description implies a somewhat structured feed rather than fully random shuffle of the combined pool.
    // "The final list is then shuffled but maintaining the separation of these main groups" - this is a bit ambiguous.
    // If groups must be strictly separate and then shuffled *within*, that's one interpretation.
    // If the *overall proportion* is what matters and then items are interleaved, that's another.
    // For now, we'll combine then apply pagination to the whole unique set.
    // A true "maintain separation of main groups" might mean presenting sections like "Today's Popular", "Yesterday's Catch-up" etc.
    // Or, if it just means the *proportions* are respected in a single list:
    // We have fetched components according to proportions. Now combine and paginate.
    // The current approach does not guarantee 'limit' items if any segment is exhausted and doesn't "spill over".

    const paginatedTopics = uniqueTopics.slice(offset, offset + limit); // Apply pagination after combining

    // Total topics for pagination: This is tricky.
    // For a truly paginated complex feed, we can't just count all topics in DB.
    // We're returning a "view" of the feed. The total number of items *that could possibly appear in this mixed feed view*
    // is not straightforward. For simplicity, we'll use the length of the unique pool we constructed *before* pagination.
    // This means `total_topics` reflects the size of the currently constructed potential feed, not all topics in the database.
    // TODO: Known limitations:
    // 1. No "spill-over": If one category (e.g., "Today's Popular") has fewer topics than its limit,
    //    the overall feed might have fewer items than `limit`. The deficit is not filled from other categories.
    // 2. Limited Randomness/Personalization: The feed is rule-based. True user-specific personalization or more dynamic shuffling is not yet implemented.
    const totalTopicsInConstructedPool = uniqueTopics.length;

    return {
        data: paginatedTopics,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total_topics: totalTopicsInConstructedPool, // Represents the total number of items available in the current feed generation logic.
            total_pages: Math.ceil(totalTopicsInConstructedPool / limit)
        }
    };
};

module.exports = { getFeedTopics };

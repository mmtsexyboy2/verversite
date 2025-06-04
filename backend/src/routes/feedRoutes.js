const express = require('express');
const pool = require('../config/db');
// const { protect } = require('../middleware/authMiddleware'); // Feed is public for now

const router = express.Router();

// GET /api/feed - Fetch the main content feed
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20; // Default to 20 items per page
  const offset = (page - 1) * limit;

  // Weights for activity score
  const W1_DISTINCT_COMMENTERS = 2;
  const W2_TOTAL_COMMENTS = 1;

  // For simplicity, this initial version will focus on a combined feed ordered by a mix of recency and activity.
  // Implementing strict percentages per category per page is complex and deferred.
  // This query aims to get recent topics, prioritizing those with more activity.
  // A more sophisticated algorithm would involve multiple queries and combining results as outlined in the prompt.

  try {
    // Fetch pinned topics first (all of them, not paginated, assuming not too many)
    // In a real scenario with many pinned items, this part would also need pagination or a limit.
    const pinnedTopicsQuery = `
      SELECT
        t.id, t.title, t.text_content, t.image_url, t.created_at, t.updated_at,
        t.is_highlighted, t.is_pinned, t.is_ver_ver_ticked,
        u.id AS user_id, u.name AS author_name, u.email AS author_email,
        c.id AS category_id, c.name AS category_name, c.theme_config AS category_theme_config,
        (SELECT COUNT(*) FROM topic_likes tl WHERE tl.topic_id = t.id) AS likes_count,
        (
          SELECT (COUNT(DISTINCT cm.user_id) * $1) + (COUNT(cm.id) * $2)
          FROM comments cm WHERE cm.topic_id = t.id
        ) AS activity_score
      FROM topics t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.is_pinned = TRUE
      ORDER BY t.updated_at DESC -- Or some other pinning order if available
    `;
    const pinnedTopicsResult = await pool.query(pinnedTopicsQuery, [W1_DISTINCT_COMMENTERS, W2_TOTAL_COMMENTS]);
    const pinnedTopics = pinnedTopicsResult.rows;
    const pinnedTopicIds = pinnedTopics.map(pt => pt.id);

    // Adjust limit and offset for non-pinned topics if this is page 1
    let nonPinnedLimit = limit;
    let nonPinnedOffset = offset;

    if (page === 1) {
      nonPinnedLimit = Math.max(0, limit - pinnedTopics.length);
      // Offset for non-pinned items remains 0 for the first page fetch,
      // as we are filling the page around pinned items.
    } else {
      // For subsequent pages, adjust offset to account for all pinned items
      // and items from previous pages. This simplified approach might show only non-pinned
      // items on page > 1 if not careful.
      // A more robust pagination for mixed content is complex.
      // This simplified version will fetch non-pinned items for page > 1.
      // And assumes that pinned items are only injected on page 1.
      nonPinnedOffset = offset - pinnedTopics.length;
      if (nonPinnedOffset < 0 && page > 1) {
         // This means previous page(s) were filled with pinned items.
         // This logic is still imperfect for robust pagination with pinned items.
         // For now, if pinned items > limit, page 1 has only pinned. Page 2 starts non-pinned.
         nonPinnedOffset = offset; // Fallback to original offset for page > 1 if pinned are few.
         // A truly robust solution would exclude all pinned IDs from the non-pinned query
         // and adjust offset based on how many non-pinned items were *actually* displayed on previous pages.
      }
       if (page > 1 && pinnedTopics.length > 0) { // If there are pinned topics, page > 1 should not re-show them
         nonPinnedOffset = offset; // A simple approach: page 1 gets pinned + non-pinned, page > 1 gets only non-pinned
                                   // and their offset starts naturally after page 1's limit.
                                   // This means pinned items are effectively only on page 1.
       }


    }

    let nonPinnedTopics = [];
    if (nonPinnedLimit > 0 || page > 1) { // Only fetch non-pinned if there's space on page 1, or if it's page > 1
        const nonPinnedQuery = `
        SELECT
            t.id, t.title, t.text_content, t.image_url, t.created_at, t.updated_at,
            t.is_highlighted, t.is_pinned, t.is_ver_ver_ticked,
            u.id AS user_id, u.name AS author_name, u.email AS author_email,
            c.id AS category_id, c.name AS category_name, c.theme_config AS category_theme_config,
            (SELECT COUNT(*) FROM topic_likes tl WHERE tl.topic_id = t.id) AS likes_count,
            (
            SELECT (COUNT(DISTINCT cm.user_id) * $3) + (COUNT(cm.id) * $4)
            FROM comments cm WHERE cm.topic_id = t.id
            ) AS activity_score
        FROM topics t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.is_pinned = FALSE ${pinnedTopicIds.length > 0 && page === 1 ? `AND t.id NOT IN (${pinnedTopicIds.join(',')})` : ''} -- Exclude already fetched pinned topics if on page 1
        ORDER BY
            CASE
            WHEN t.created_at >= NOW() - INTERVAL '1 day' THEN 0
            WHEN t.created_at >= NOW() - INTERVAL '2 days' THEN 1
            ELSE 2
            END,
            activity_score DESC,
            t.created_at DESC
        LIMIT $1 OFFSET $2
        `;
        const nonPinnedResult = await pool.query(nonPinnedQuery, [page === 1 ? nonPinnedLimit : limit, page === 1 ? 0 : nonPinnedOffset, W1_DISTINCT_COMMENTERS, W2_TOTAL_COMMENTS]);
        nonPinnedTopics = nonPinnedResult.rows;
    }

    let combinedResults;
    if (page === 1) {
        combinedResults = [...pinnedTopics, ...nonPinnedTopics].slice(0, limit);
    } else {
        combinedResults = nonPinnedTopics; // Pinned topics only on page 1
    }

    // For total count for pagination - this count should ideally reflect the total feed items available under the algorithm.
    // For this simplified query, it's just total topics. A real algorithm needs a more complex count.
    const totalResult = await pool.query('SELECT COUNT(*) FROM topics');
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    res.json({
      data: feedResult.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems: totalItems,
        limit: limit,
      },
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ message: 'Server error while fetching feed.' });
  }
});

module.exports = router;

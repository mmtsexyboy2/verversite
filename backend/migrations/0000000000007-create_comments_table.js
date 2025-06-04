exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('comments', {
    id: 'id', // SERIAL PRIMARY KEY
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    topic_id: {
      type: 'integer',
      notNull: true,
      references: 'topics(id)',
      onDelete: 'CASCADE',
    },
    parent_comment_id: {
      type: 'integer',
      references: 'comments(id)', // Self-referencing for nesting
      onDelete: 'CASCADE', // If a parent comment is deleted, its replies are also deleted
      allowNull: true,
    },
    text_content: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Add indexes for frequently queried columns
  pgm.createIndex('comments', 'user_id');
  pgm.createIndex('comments', 'topic_id');
  pgm.createIndex('comments', 'parent_comment_id');
  // Composite index for fetching comments of a topic, ordered by creation might be useful
  pgm.createIndex('comments', ['topic_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('comments');
};

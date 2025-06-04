exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('topic_likes', {
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
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Composite primary key
  pgm.addConstraint('topic_likes', 'topic_likes_pkey', {
    primaryKey: ['user_id', 'topic_id'],
  });

  // Index for faster lookups on topic_id (e.g., to count likes for a topic)
  pgm.createIndex('topic_likes', 'topic_id');
};

exports.down = (pgm) => {
  pgm.dropTable('topic_likes');
};

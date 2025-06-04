exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('comment_likes', {
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    comment_id: {
      type: 'integer',
      notNull: true,
      references: 'comments(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Composite primary key
  pgm.addConstraint('comment_likes', 'comment_likes_pkey', {
    primaryKey: ['user_id', 'comment_id'],
  });

  // Index for faster lookups on comment_id (e.g., to count likes for a comment)
  pgm.createIndex('comment_likes', 'comment_id');
};

exports.down = (pgm) => {
  pgm.dropTable('comment_likes');
};

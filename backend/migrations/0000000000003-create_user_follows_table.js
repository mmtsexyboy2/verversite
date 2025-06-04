exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('user_follows', {
    follower_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    following_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  // Add a composite primary key
  pgm.addConstraint('user_follows', 'user_follows_pkey', {
    primaryKey: ['follower_id', 'following_id'],
  });
  // Add indexes for faster lookups
  pgm.createIndex('user_follows', 'follower_id');
  pgm.createIndex('user_follows', 'following_id');
};

exports.down = (pgm) => {
  pgm.dropTable('user_follows');
};

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('user_profiles', {
    id: 'id', // SERIAL PRIMARY KEY
    user_id: {
      type: 'integer',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    bio: { type: 'text' },
    avatar_url: { type: 'text' },
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
};

exports.down = (pgm) => {
  pgm.dropTable('user_profiles');
};

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('auth_tokens', {
    id: 'id', // SERIAL PRIMARY KEY
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    token: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true, default: 'jwt' },
    expires_at: { type: 'timestamp with time zone' },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('auth_tokens');
};

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('topics', {
    id: 'id', // SERIAL PRIMARY KEY
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE', // If user is deleted, their topics are deleted
    },
    category_id: {
      type: 'integer',
      references: 'categories(id)',
      onDelete: 'SET NULL', // If category is deleted, topic's category_id becomes NULL
    },
    title: { type: 'varchar(255)', notNull: true },
    text_content: { type: 'text', notNull: true },
    image_url: { type: 'varchar(255)', allowNull: true }, // Path to the uploaded image
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
  pgm.createIndex('topics', 'user_id');
  pgm.createIndex('topics', 'category_id');
};

exports.down = (pgm) => {
  pgm.dropTable('topics');
};

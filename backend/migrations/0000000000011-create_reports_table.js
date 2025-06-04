exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('reports', {
    id: 'id', // SERIAL PRIMARY KEY
    item_id: { type: 'integer', notNull: true },
    item_type: { type: 'varchar(50)', notNull: true }, // 'topic' or 'comment'
    reported_by_user_id: {
      type: 'integer',
      references: 'users(id)',
      onDelete: 'SET NULL', // Keep report even if reporting user is deleted
    },
    reason: { type: 'text', allowNull: true },
    status: {
      type: 'varchar(50)',
      default: 'pending', // 'pending', 'resolved_no_action', 'resolved_item_removed'
      notNull: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    reviewed_by_admin_id: {
      type: 'integer',
      references: 'users(id)', // Admin who reviewed
      onDelete: 'SET NULL',
      allowNull: true,
    },
    reviewed_at: {
      type: 'timestamp with time zone',
      allowNull: true,
    },
  });

  pgm.createIndex('reports', 'status');
  pgm.createIndex('reports', ['item_type', 'item_id']); // To easily find reports for a specific item
  pgm.createIndex('reports', 'reported_by_user_id');
  pgm.createIndex('reports', 'reviewed_by_admin_id');
};

exports.down = (pgm) => {
  pgm.dropTable('reports');
};

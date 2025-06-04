/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('likes', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('topic_id').unsigned().nullable().references('id').inTable('topics').onDelete('CASCADE');
    table.integer('comment_id').unsigned().nullable().references('id').inTable('comments').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Table-level unique constraints
    table.unique(['user_id', 'topic_id']);
    table.unique(['user_id', 'comment_id']);

    // Check constraint: either topic_id OR comment_id is set, but not both
    // Note: Knex syntax for raw check constraints can vary slightly by DB. This is a general approach.
    // For PostgreSQL, this would be:
    // table.check('(topic_id IS NOT NULL AND comment_id IS NULL) OR (topic_id IS NULL AND comment_id IS NOT NULL)');
    // Knex typically handles this abstraction well.
    // If using a DB that doesn't support this specific knex.check, a knex.raw() might be needed.
    table.check('(topic_id IS NOT NULL AND comment_id IS NULL) OR (topic_id IS NULL AND comment_id IS NOT NULL)', null, 'likes_topic_or_comment_check');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('likes');
};

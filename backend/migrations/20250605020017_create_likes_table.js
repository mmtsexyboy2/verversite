exports.up = function(knex) {
  return knex.schema.createTable('likes', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('topic_id').unsigned().nullable();
    table.foreign('topic_id').references('id').inTable('topics').onDelete('CASCADE');
    table.integer('comment_id').unsigned().nullable();
    table.foreign('comment_id').references('id').inTable('comments').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    // Ensure a user can only like a specific topic/comment once
    table.unique(['user_id', 'topic_id']);
    table.unique(['user_id', 'comment_id']);
    // Add a check constraint to ensure either topic_id or comment_id is set, but not both (or neither)
    // This might be complex for a check constraint, often handled at application level or with triggers
    // For now, we'll rely on application logic to ensure one is not null and the other is null.
    // A simpler constraint could be:
    // table.check('(topic_id IS NOT NULL AND comment_id IS NULL) OR (topic_id IS NULL AND comment_id IS NOT NULL)')
    // However, this specific syntax might vary slightly by DB or be tricky with Knex.
    // Simpler: allow both to be nullable and enforce logic in the application.
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('likes'); };

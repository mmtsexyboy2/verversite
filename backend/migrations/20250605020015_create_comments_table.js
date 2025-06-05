exports.up = function(knex) {
  return knex.schema.createTable('comments', function(table) {
    table.increments('id').primary();
    table.text('body').notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('topic_id').unsigned().notNullable();
    table.foreign('topic_id').references('id').inTable('topics').onDelete('CASCADE');
    table.integer('parent_comment_id').unsigned().nullable(); // For nested comments
    table.foreign('parent_comment_id').references('id').inTable('comments').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    // Add an index for faster querying
    table.index(['user_id']);
    table.index(['topic_id']);
    table.index(['parent_comment_id']);
    table.index(['created_at']);
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('comments'); };

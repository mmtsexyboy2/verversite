/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('comments', function(table) {
    table.increments('id').primary();
    table.integer('topic_id').unsigned().notNullable().references('id').inTable('topics').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('parent_comment_id').unsigned().nullable().references('id').inTable('comments').onDelete('CASCADE');
    table.text('body').notNullable();
    table.timestamps(true, true); // Adds created_at and updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('comments');
};

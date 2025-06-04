/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('topics', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    // Consider if category_id should be nullable or have a default, and onDelete behavior (SET NULL or RESTRICT)
    table.integer('category_id').unsigned().notNullable().references('id').inTable('categories').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('body').notNullable();
    table.text('image_url').nullable();
    table.timestamps(true, true); // Adds created_at and updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('topics');
};

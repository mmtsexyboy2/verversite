exports.up = function(knex) {
  return knex.schema.createTable('topics', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE'); // User who created topic
    table.integer('category_id').unsigned().nullable();
    table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL'); // Optional category
    table.string('image_url').nullable(); // For topic image
    table.boolean('is_verified_by_admin').defaultTo(false); // "ور ور" tick
    table.boolean('is_pinned').defaultTo(false); // For admin panel to pin topics
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    // Add an index for faster querying by user_id and category_id
    table.index(['user_id']);
    table.index(['category_id']);
    table.index(['created_at']); // For sorting by time
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('topics'); };

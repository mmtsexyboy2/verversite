exports.up = function(knex) {
  return knex.schema.createTable('categories', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('description').nullable();
    // For dynamic themes, as per requirements
    table.jsonb('theme_settings').nullable(); // e.g., { backgroundColor: '#000', textColor: '#fff', accentColor: '#1E90FF' }
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('categories'); };

exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('google_id').unique().nullable();
    table.string('email').unique().notNullable();
    table.boolean('email_verified').defaultTo(false);
    table.string('username').unique().notNullable();
    table.string('full_name').nullable();
    table.text('avatar_url').nullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.boolean('is_staff').defaultTo(false).notNullable();
    table.boolean('is_superuser').defaultTo(false).notNullable();
    table.timestamp('date_joined').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_login').nullable();
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('users'); };

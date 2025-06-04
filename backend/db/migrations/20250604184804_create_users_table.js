/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('google_id').unique().index().nullable();
    table.string('email').unique().notNullable().index();
    table.boolean('email_verified').defaultTo(false);
    table.string('username').unique().notNullable();
    table.string('full_name').nullable();
    table.text('avatar_url').nullable();
    table.string('password_hash').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_staff').notNullable().defaultTo(false);
    table.boolean('is_superuser').notNullable().defaultTo(false);
    table.timestamp('date_joined').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_login').nullable();
    table.timestamps(true, true); // Adds created_at and updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};

exports.up = function(knex) {
  return knex.schema.createTable('followers', function(table) {
    table.increments('id').primary();
    // user_id is the one being followed (the target user)
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    // follower_id is the one doing the following (the initiator)
    table.integer('follower_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'follower_id']); // A user can only follow another user once
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('followers'); };

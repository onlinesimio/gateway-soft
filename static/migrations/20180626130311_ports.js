
exports.up = function (knex, Promise) {
  return knex.schema.createTable('ports', function (t) {
    t.string('ID').primary();
    t.string('name').notNull();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('ports');
};

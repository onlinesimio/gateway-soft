
exports.up = function (knex, Promise) {
  return knex.schema.createTable('operations', function (t) {
    t.increments('id').unsigned().primary();
    t.bigInteger('IMSI').notNull();
    t.bigInteger('IMEI').notNull();
    t.bigInteger('number').unsigned();
    t.integer('status').unsigned().notNull();
    t.string('service').nullable();
    t.string('country').nullable();
    t.text('messages').notNull();
    t.decimal('sum', 6, 2).notNull();
    t.dateTime('createdAt').notNull();
    t.dateTime('updatedAt').nullable();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('operations');
};


exports.up = function (knex, Promise) {
  return knex.schema.createTable('modem_configuration', function (t) {
    t.increments('id').unsigned().primary();
    t.string('vendorID').notNull();
    t.string('deviceID').notNull();
    t.string('manufacturer').nullable();
    t.string('model').nullable();
    t.text('config').notNull();
    t.dateTime('createdAt').notNull();
    t.dateTime('updatedAt').nullable();

    t.unique(['vendorID', 'deviceID']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('modem_configuration');
};

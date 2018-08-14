
exports.up = function (knex, Promise) {
  return knex.schema.createTable('configurations', function (t) {
    t.bigInteger('IMEI').unsigned().primary();
    t.string('name').nullable();
    t.string('vendorID').nullable();
    t.string('deviceID').nullable();
    t.string('manufacturer').nullable();
    t.string('model').nullable();
    t.text('config').notNull();
    t.dateTime('createdAt').notNull();
    t.dateTime('updatedAt').nullable();

    t.unique('IMEI');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('configurations');
};

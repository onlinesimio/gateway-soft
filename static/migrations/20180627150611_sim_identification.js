
exports.up = function (knex, Promise) {
  return knex.schema.createTable('sim_identification', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('mcc').unsigned().notNull();
    t.integer('mnc').unsigned().notNull();
    t.string('iso').notNull();
    t.string('country').notNull();
    t.string('operator').notNull();
    t.text('ussd_commands');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('sim_identification');
};

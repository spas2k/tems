exports.up = async function (knex) {
  await knex.schema.table('roles', t => {
    t.string('color', 20).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('roles', t => {
    t.dropColumn('color');
  });
};

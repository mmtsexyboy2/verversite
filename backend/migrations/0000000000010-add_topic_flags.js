exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('topics', {
    is_highlighted: {
      type: 'boolean',
      default: false,
      notNull: true,
    },
    is_pinned: {
      type: 'boolean',
      default: false,
      notNull: true,
    },
    is_ver_ver_ticked: { // "Ver Ver Tick"
      type: 'boolean',
      default: false,
      notNull: true,
    },
  });
  // Add index for is_pinned for feed performance
  pgm.createIndex('topics', 'is_pinned');
};

exports.down = (pgm) => {
  pgm.dropColumn('topics', 'is_highlighted');
  pgm.dropColumn('topics', 'is_pinned');
  pgm.dropColumn('topics', 'is_ver_ver_ticked');
};

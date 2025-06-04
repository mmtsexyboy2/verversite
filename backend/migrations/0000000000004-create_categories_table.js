exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('categories', {
    id: 'id', // SERIAL PRIMARY KEY
    name: { type: 'varchar(255)', notNull: true, unique: true },
    description: { type: 'text' },
    theme_config: { type: 'jsonb', default: '{}' },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Seed initial categories with theme_config
  pgm.sql(`INSERT INTO categories (name, description, theme_config) VALUES
    ('بحث علمی', 'گفتگوهای علمی و پژوهشی', '{"backgroundColor": "black", "textColor": "white", "accentColor": "cyan", "pageClassName": "theme-science"}'),
    ('عشق', 'مباحث مربوط به روابط و احساسات', '{"backgroundColor": "pink", "textColor": "darkred", "accentColor": "red", "pageClassName": "theme-love"}'),
    ('بیزینس', 'کارآفرینی، مدیریت و تجارت', '{"backgroundColor": "lightblue", "textColor": "darkblue", "accentColor": "blue", "pageClassName": "theme-business"}'),
    ('عمومی', 'موضوعات عمومی و روزمره', '{"backgroundColor": "lightgray", "textColor": "black", "accentColor": "gray", "pageClassName": "theme-general"}')
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('categories');
};

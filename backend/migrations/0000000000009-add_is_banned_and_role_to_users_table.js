exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add is_banned column
  pgm.addColumn('users', {
    is_banned: {
      type: 'boolean',
      default: false,
      notNull: true,
    },
  });

  // Add role column
  pgm.addColumn('users', {
    role: {
      type: 'varchar(50)',
      default: 'user',
      notNull: true,
    },
  });

  // Example: Update existing users to 'admin' role if their email is in ADMIN_EMAILS
  // This is a bit tricky directly in migration with env vars that might not be perfectly in sync
  // or available at migration time. A separate script or manual update is often safer for this.
  // However, for a simple case, and if ADMIN_EMAILS is reliably set for the migration execution env:
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  if (adminEmailsStr) {
    const adminEmailList = adminEmailsStr.split(',').map(email => `'${email.trim().toLowerCase()}'`).join(',');
    if (adminEmailList) {
        // This SQL might need adjustment based on your DB & SQL injection safety for migrations.
        // Using pgm.sql is generally safe if the input is controlled.
        pgm.sql(`UPDATE users SET role = 'admin' WHERE LOWER(email) IN (${adminEmailList});`);
    }
  }
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'is_banned');
  pgm.dropColumn('users', 'role');
  // Note: Downgrading role changes is not explicitly handled here, users would revert to default 'user' if re-created or if up was re-run.
};

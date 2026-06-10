import { spawn } from 'child_process';

// @desc    Stream a live pg_dump of the database as a .sql file download
// @route   GET /api/super-admin/database/backup/download
// @access  Private (Super Admin only)
export const downloadDatabaseBackup = async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `spc_backup_${timestamp}.sql`;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const pgDump = spawn(
    'pg_dump',
    [
      '-h', process.env.DB_HOST || 'postgres',
      '-p', String(process.env.DB_PORT || 5432),
      '-U', process.env.DB_USER || 'postgres',
      '-d', process.env.DB_NAME || 'campus_placement_portal',
      '--no-password',
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || '',
      },
    }
  );

  pgDump.on('error', (err) => {
    console.error('pg_dump spawn error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to start database backup. pg_dump not found.' });
    } else {
      res.end();
    }
  });

  pgDump.stderr.on('data', (data) => {
    console.error('pg_dump stderr:', data.toString());
  });

  pgDump.on('close', (code) => {
    if (code !== 0) {
      console.error(`pg_dump exited with non-zero code: ${code}`);
    }
  });

  pgDump.stdout.pipe(res);
};

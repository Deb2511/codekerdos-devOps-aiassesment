import { query } from '../db';
import { config } from '../config';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Deletes assessments, audit rows and orphaned students older than RETENTION_DAYS.
// Safe to run from more than one container: each run only deletes expired rows.
export async function purgeExpiredRecords(): Promise<{ assessments: number; audit: number; students: number }> {
  const days = config.RETENTION_DAYS;

  const assessments = await query(
    `DELETE FROM assessments
    WHERE created_at < NOW() - make_interval(days => $1::int)
    RETURNING id`,
    [days]
  );

  const audit = await query(
    `DELETE FROM assessment_audit
    WHERE started_at < NOW() - make_interval(days => $1::int)
    RETURNING assessment_id`,
    [days]
  );

  // Students are removed only when they have no assessments left
  const students = await query(
    `DELETE FROM students s
    WHERE s.created_at < NOW() - make_interval(days => $1::int)
      AND NOT EXISTS (SELECT 1 FROM assessments a WHERE a.student_email = s.email)
    RETURNING id`,
    [days]
  );

  return { assessments: assessments.length, audit: audit.length, students: students.length };
}

// Runs once at startup, then every 24 hours
export function startRetentionJob(): void {
  const run = async () => {
    try {
      const deleted = await purgeExpiredRecords();
      console.log(`Retention (${config.RETENTION_DAYS} days): deleted`, deleted);
    } catch (error) {
      console.error('Retention job failed:', error);
    }
  };

  run();
  setInterval(run, ONE_DAY_MS).unref();
}

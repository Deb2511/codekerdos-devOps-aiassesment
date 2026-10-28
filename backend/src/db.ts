import { Pool, PoolClient } from 'pg';
import { config } from './config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function initializeDatabase(): Promise<void> {
  const client = await getClient();
  try {
    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create assessments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_email VARCHAR(255) NOT NULL REFERENCES students(email),
        assessment_type VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        topics JSONB NOT NULL,
        questions JSONB NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        per_topic_scores JSONB NOT NULL,
        feedback_json JSONB NOT NULL,
        plagiarism_risk VARCHAR(20),
        plagiarism_notes TEXT,
        tokens_used JSONB,
        jd_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Add new columns if they don't exist (for plagiarism-based scoring)
    const columnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'assessments'
    `);
    const columnNames = columnsResult.rows.map((col: any) => col.column_name);

    if (!columnNames.includes('base_score')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN base_score INTEGER
      `);
    }

    if (!columnNames.includes('final_score')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN final_score INTEGER
      `);
    }

    if (!columnNames.includes('plagiarism_deduction_amount')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN plagiarism_deduction_amount INTEGER DEFAULT 0
      `);
    }

    if (!columnNames.includes('plagiarism_deduction_percent')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN plagiarism_deduction_percent DECIMAL(5, 2) DEFAULT 0
      `);
    }

    if (!columnNames.includes('max_possible_score')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN max_possible_score INTEGER DEFAULT 0
      `);
    }

    if (!columnNames.includes('score_percent')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN score_percent INTEGER
      `);
    }

    if (!columnNames.includes('repair_log')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN repair_log JSONB
      `);
    }

    // Submit deadline. Rows created before this column existed have no deadline (NULL).
    if (!columnNames.includes('expires_at')) {
      await client.query(`
        ALTER TABLE assessments ADD COLUMN expires_at TIMESTAMPTZ
      `);
    }

    // Create audit table: one row per assessment, kept for records only.
    // No foreign key, so audit rows survive if assessment rows are ever removed.
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessment_audit (
        assessment_id UUID PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        assessment_type VARCHAR(10) NOT NULL,
        topics JSONB,
        question_count INTEGER NOT NULL,
        score INTEGER,
        total_tokens INTEGER,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assessments_email_date
      ON assessments(student_email, created_at DESC)
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne(text: string, params?: any[]): Promise<any | null> {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function queryCount(text: string, params?: any[]): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}

export async function close(): Promise<void> {
  await pool.end();
}

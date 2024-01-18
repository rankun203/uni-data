import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import { logger } from '../utils/logger';

// Check if Database Exists
async function databaseExists(filePath: string): Promise<boolean> {
  return fs.promises
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

// Initialize or Reinitialize SQLite Database
export async function initializeDatabase(): Promise<Database> {
  const dbExists = await databaseExists('./contacts.db');
  const db = await open({
    filename: './contacts.db',
    driver: sqlite3.Database,
  });

  if (!dbExists || (await schemaMismatch(db))) {
    await recreateTable(db);
  }

  return db;
}

// Check for Schema Mismatch
export async function schemaMismatch(db: Database): Promise<boolean> {
  try {
    const tableInfo = await db.all(`PRAGMA table_info(contacts)`);
    // Implement logic to check if tableInfo matches expected schema
    return tableInfo.length === 0;
  } catch (error) {
    return true;
  }
}

// Recreate contacts table
export async function recreateTable(db: Database): Promise<void> {
  await db.exec(`DROP TABLE IF EXISTS contacts`);
  await db.exec(`
    CREATE TABLE contacts (
      url TEXT PRIMARY KEY,
      lastModified TEXT,
      name TEXT,
      position TEXT,
      college TEXT,
      school TEXT,
      phone TEXT,
      email TEXT,
      campus TEXT,
      contactAbout TEXT,
      orcid TEXT
    )
  `);
}

// Function to get a contact from SQLite
export async function getContactFromDatabase(db: Database, url: string) {
  return db.get('SELECT * FROM contacts WHERE url = ?', url);
}

// Function to save a contact to SQLite
export async function saveContactToDatabase(db: Database, url: ContactUrl, contact: Contact) {
  logger.info(`[saveContactToDatabase] ${url}, ${contact}`);
  const { name, position, college, school, phone, email, campus, contactAbout, orcid } = contact;
  await db.run(
    `
    INSERT INTO contacts (url, lastModified, name, position, college, school, phone, email, campus, contactAbout, orcid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url)
    DO UPDATE SET lastModified = ?, name = ?, position = ?, college = ?, school = ?, phone = ?, email = ?, campus = ?, contactAbout = ?, orcid = ?`,
    url.url,
    url.lastModified,
    name,
    position,
    college,
    school,
    phone,
    email,
    campus,
    contactAbout,
    orcid,
    url.lastModified,
    name,
    position,
    college,
    school,
    phone,
    email,
    campus,
    contactAbout,
    orcid,
  );
}

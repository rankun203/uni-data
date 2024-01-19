import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import { logger } from '../utils/logger';
import { MemoryCache } from '../utils/memory-cache';

const cache = new MemoryCache();

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

  await updateCachedContacts(db);

  return db;
}

// Check for Schema Mismatch
export async function schemaMismatch(db: Database): Promise<boolean> {
  try {
    const tableInfo = await db.all(`PRAGMA table_info(contacts)`);
    // TODO: Implement logic to check if tableInfo matches expected schema
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
      orcid TEXT,
      meta JSONB
    )
  `);
}

// Function to get a contact from SQLite
export async function getContactFromDatabase(
  db: Database,
  url: string,
): Promise<Contact | undefined> {
  return db.get('SELECT * FROM contacts WHERE url = ?', url);
}

export async function getContactsFromDatabase(db: Database): Promise<Contact[] | undefined> {
  let contacts = await db.all('SELECT * FROM contacts order by name');
  // out of sqlite, c.meta is string
  contacts = contacts?.map((c) => ({ ...c, meta: c.meta ? JSON.parse(c.meta as any) : {} }));
  return contacts;
}

export async function getContactsCached(
  db: Database,
  forceRefresh = false,
): Promise<Contact[] | undefined> {
  if (!forceRefresh) {
    const cachedContacts = cache.get('getContactsFromDatabase');
    if (cachedContacts) return cachedContacts;
  }

  await updateCachedContacts(db);
  return getContactsCached(db);
}

export async function updateCachedContacts(db: Database) {
  let contacts = await getContactsFromDatabase(db);
  contacts = contacts?.filter((c) => Boolean(c.name));
  cache.set('getContactsFromDatabase', contacts, 60 * 60 * 24 * 365);
}

// Function to save a contact to SQLite
export async function saveContactToDatabase(db: Database, url: ContactUrl, contact: Contact) {
  logger.info(`[saveContactToDatabase] ${url.url}`);
  const { name, position, college, school, phone, email, campus, contactAbout, orcid, meta } =
    contact;
  await db.run(
    `
    INSERT INTO contacts (url, lastModified, name, position, college, school, phone, email, campus, contactAbout, orcid, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url)
    DO UPDATE SET lastModified = ?, name = ?, position = ?, college = ?, school = ?, phone = ?, email = ?, campus = ?, contactAbout = ?, orcid = ?, meta = ?`,
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
    JSON.stringify(meta),
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
    JSON.stringify(meta),
  );

  await updateCachedContacts(db);
}

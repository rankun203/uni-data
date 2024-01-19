import { XMLParser } from 'fast-xml-parser';
import R from 'ramda';
import { logger } from '../utils/logger';
import { getContactsCached, getContactsFromDatabase, saveContactToDatabase } from './contacts-db';
import { Database } from 'sqlite';
import { createContact } from './rmit-contact-parser';
import { NotFoundError, UnknownPageStructureError } from './errors';

export async function getRMITContactUrls(): Promise<ContactUrl[]> {
  const sitemapUrl = 'https://www.rmit.edu.au/sitemap.xml';
  const urlPrefix = 'https://www.rmit.edu.au/contact/staff-contacts/academic-staff/';
  const urls: ContactUrl[] = [];
  logger.info(`[getRMITContactUrls] ${sitemapUrl}`);

  const result = await fetch(sitemapUrl);
  if (!(result.ok && result.body)) {
    throw new Error(`Unable to fetch ${sitemapUrl}`);
  }

  const xml = await result.text();
  const parser = new XMLParser();
  const jsonObj: Sitemap = parser.parse(xml);

  jsonObj.urlset.url.forEach((entry) => {
    const loc = entry.loc;
    const lastmod = entry.lastmod;

    if (loc.includes(urlPrefix)) {
      if (loc.replace(urlPrefix, '').includes('/')) {
        urls.push({ url: loc, lastModified: lastmod });
      }
    }
  });

  logger.info(`[getRMITContactUrls] urls ${urls.length}`);
  return urls;
}

export async function updateContacts(db: Database) {
  const urls = await getRMITContactUrls();
  const dbContacts = (await getContactsFromDatabase(db)) || [];
  const keyedDbContacts = R.indexBy(R.prop('url'), dbContacts);
  logger.info(`[updateContacts] urls ${urls.length}, db contacts ${dbContacts.length}`);

  // Function to process a chunk of URLs
  async function processChunk(chunk: ContactUrl[]) {
    return Promise.all(
      chunk.map(async (url) => {
        logger.info(`[updateContacts] processing lastModified ${url.lastModified}, url ${url.url}`);
        // const existingContact = await getContactFromDatabase(db, url.url);
        const existingContact = keyedDbContacts[url.url];

        if (existingContact) {
          if (shouldSkipLink(existingContact)) {
            logger.info(
              `[updateContacts] skipping ${url.url}: ${existingContact.meta?.skipReason}}`,
            );
            return null;
          }
          // sitemap doesn't have lastModified for page, return cached
          if (url.lastModified === undefined) return existingContact;

          // sitemap lastModified === db lastModified
          if (url.lastModified === existingContact.lastModified) return existingContact;
        }

        // sitemap lastModified !== db lastModified, remote record updated
        logger.info(
          `[updateContacts] remote contact updated local ${existingContact?.lastModified}, sitemap ${url.lastModified}, url ${url.url}`,
        );

        let contact: Contact | undefined;
        try {
          contact = await createContact(url);

          if (!contact) {
            logger.error(`[updateContacts] Unable to parse page to contact ${url.url}`);
            return null;
          }
        } catch (e) {
          logger.error(`[updateContacts] Unable to fetch ${url.url}: ${(e as Error).message}`);

          if (e instanceof UnknownPageStructureError) {
            const meta = { skip: true, skipReason: 'unknown page structure' };
            contact = { url: url.url, lastModified: url.lastModified, meta };
          } else if (e instanceof NotFoundError) {
            const meta = { skip: true, skipReason: 'dead link' };
            contact = { url: url.url, lastModified: url.lastModified, meta };
          } else {
            const meta = { skip: true, skipReason: 'link issue' };
            contact = { url: url.url, lastModified: url.lastModified, meta };
          }
        }
        await saveContactToDatabase(db, url, contact);
        keyedDbContacts[url.url] = contact;
        return contact;
      }),
    );
  }

  // Chunking the URLs
  const chunkSize = 10;
  const contacts = [];

  for (let i = 0; i < urls.length; i += chunkSize) {
    logger.info(`[updateContacts] processing (${i}-${i + chunkSize})/${urls.length}`);
    const chunk = urls.slice(i, i + chunkSize);
    const contactsInChunk = await processChunk(chunk);
    const filteredContacts = contactsInChunk.filter(Boolean);
    contacts.push(...filteredContacts);
  }

  return contacts;
}

export async function getContacts(db: Database, forceRefresh = false) {
  const dbContacts = (await getContactsCached(db, forceRefresh)) || [];
  return dbContacts;
}

function shouldSkipLink(contact: Contact | undefined) {
  return contact?.meta?.skip || false;
}

import { XMLParser } from 'fast-xml-parser';
import { JSDOM } from 'jsdom';
import { logger } from '../utils/logger';
import { getContactFromDatabase, initializeDatabase, saveContactToDatabase } from './contacts-db';
import { Database } from 'sqlite';

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

export async function parsePageToContact(url: ContactUrl) {
  logger.info(`[parsePageToContact] ${url}`);
  const result = await fetch(url.url);
  if (!result.ok) {
    throw new Error(`Unable to fetch ${url}`);
  }

  const html = await result.text();
  const contact = await parsePageContentToContact(html);
  if (!contact) return contact;

  contact.url = url.url;
  contact.lastModified = url.lastModified;
  return contact;
}

export async function parsePageContentToContact(html: string) {
  logger.info(`[parsePageContentToContact] ${html.length}`);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const contact: Contact = {};

  contact.name = doc.querySelector('.masthead > h1')?.textContent?.trim();

  const summaryEle = doc.querySelector('.staff-summary .c-summary');

  summaryEle?.querySelectorAll('div.c-summary-cell').forEach((p) => {
    const spans = p.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      const span = spans.item(i);
      const spanName = span.textContent?.trim();
      switch (spanName) {
        case 'Position:':
          contact.position = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'College / Portfolio:':
          contact.college = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'School / Department:':
          contact.school = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'Phone:':
          contact.position = spans
            .item(i + 1)
            ?.textContent?.trim()
            .replace(/\s+/g, ' ');
          break;
        case 'Email:':
          contact.email = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'Campus:':
          contact.campus = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'Contact me about:':
          contact.contactAbout = spans.item(i + 1)?.textContent?.trim();
          break;
        case 'ORCID:':
          contact.orcid = spans.item(i + 1)?.textContent?.trim();
          break;
      }
    }
  });

  if (!contact.name) {
    return null;
  }

  return contact;
}

export async function getContacts(db: Database) {
  const urls = await getRMITContactUrls();
  logger.info(`[getContacts] urls ${urls.length}`);

  // Function to process a chunk of URLs
  async function processChunk(chunk: ContactUrl[]) {
    logger.info('[getContacts] processChunk');
    return Promise.all(
      chunk.map(async (url) => {
        const existingContact = await getContactFromDatabase(db, url.url);
        if (existingContact && existingContact.lastModified === url.lastModified) {
          return existingContact;
        } else {
          try {
            const contact = await parsePageToContact(url);
            if (contact) {
              await saveContactToDatabase(db, url, contact);
            }
            return contact;
          } catch (e) {
            logger.error(`Unable to fetch ${url.url}`);
            return null;
          }
        }
      }),
    );
  }

  // Chunking the URLs
  const chunkSize = 10;
  const contacts = [];

  for (let i = 0; i < urls.length; i += chunkSize) {
    logger.info(`[getContacts] processing (${i}-${i + chunkSize})/${urls.length}`);
    const chunk = urls.slice(i, i + chunkSize);
    const contactsInChunk = await processChunk(chunk);
    const filteredContacts = contactsInChunk.filter(Boolean);
    contacts.push(...filteredContacts);
  }

  logger.info('contacts', contacts);
  return contacts;
}

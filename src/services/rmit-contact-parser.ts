import { JSDOM } from 'jsdom';
import { logger } from '../utils/logger';
import { NotFoundError, UnknownPageStructureError } from './errors';

export async function createContact(url: ContactUrl) {
  logger.info(`[parsePageToContact] ${url.url}`);
  const result = await fetch(url.url);
  if (!result.ok) {
    throw new NotFoundError(`Request status not ok 200`);
  }

  const html = await result.text();
  let contact = await parsePageContentToContact(html);
  if (!contact) contact = await parsePageContentToContact2(html);
  if (!contact) throw new UnknownPageStructureError(`Unknown page structure ${url.url}`);

  contact.url = url.url;
  contact.lastModified = url.lastModified;
  contact.meta = {};
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
    logger.error(`Unable to parse contact ${JSON.stringify(contact)}`);
    return null;
  }

  return contact;
}

export async function parsePageContentToContact2(html: string) {
  logger.info(`[parsePageContentToContact2] ${html.length}`);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const contact: Contact = {};

  contact.name = doc.querySelector('h2.hero-header')?.textContent?.trim();
  contact.position = doc.querySelector('h2.hero-header + p')?.textContent?.trim();

  doc.querySelectorAll('p').forEach((p) => {
    const pText = p.textContent?.trim();
    const hasIcon = p.querySelectorAll('i').length === 1;
    if (hasIcon && pText?.includes('Phone:')) {
      contact.phone = pText.replace('Phone:', '').trim();
      return;
    } else if (hasIcon && pText?.includes('Email:')) {
      contact.email = pText.replace('Email:', '').trim();
      return;
    } else if (hasIcon && pText?.includes('Campus:')) {
      contact.campus = pText.replace('Campus:', '').trim();
      return;
    } else if (hasIcon && pText?.includes('School of')) {
      contact.school = pText.substring(pText.indexOf('School of')).trim();
    }
  });
  doc.querySelectorAll('a').forEach((a) => {
    const aText = a.textContent?.trim();
    if (aText?.includes('Media engagement')) {
      if (contact.contactAbout) contact.contactAbout += ', ';
      contact.contactAbout = 'Media engagement';
    } else if (aText?.includes('PhD supervision')) {
      if (contact.contactAbout) contact.contactAbout += ', ';
      contact.contactAbout = 'PhD supervision';
    } else if (aText?.includes('ORCID')) {
      contact.orcid = a.href;
    }
  });

  if (!contact.name) {
    logger.error(`Unable to parse contact ${JSON.stringify(contact)}`);
    return null;
  }

  return contact;
}

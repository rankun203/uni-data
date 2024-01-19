import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { logger } from '../utils/logger';
import { NotFoundError, UnknownPageStructureError } from './errors';

export async function createContact(url: ContactUrl) {
  logger.info(`[parsePageToContact] ${url.url}`);
  const resp = await fetch(url.url);
  const finalUrl = resp.url;
  if (!resp.ok) {
    throw new NotFoundError(`Request status not ok 200`);
  }

  const html = await resp.text();
  let contact = await parsePageContentToContact(html);
  if (!contact) contact = await parsePageContentToContact2(html);
  if (!contact) throw new UnknownPageStructureError(`Unknown page structure ${url.url}`);

  contact.url = finalUrl;
  contact.lastModified = url.lastModified;
  contact.meta = {};
  return contact;
}

const strip = (str?: string | null) => (str ? str.replaceAll(/[\s\s]+/g, ' ').trim() : undefined);

export async function parsePageContentToContact(html: string) {
  logger.info(`[parsePageContentToContact] ${html.length}`);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const contact: Contact = {};

  contact.name = strip(doc.querySelector('.masthead > h1')?.textContent);

  const summaryEle = doc.querySelector('.staff-summary .c-summary');

  summaryEle?.querySelectorAll('div.c-summary-cell').forEach((p) => {
    const spans = p.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      const span = spans.item(i);
      const spanName = strip(span.textContent);
      switch (spanName) {
        case 'Position:':
          contact.position = strip(spans.item(i + 1)?.textContent);
          break;
        case 'College / Portfolio:':
          contact.college = strip(spans.item(i + 1)?.textContent);
          break;
        case 'School / Department:':
          contact.school = strip(spans.item(i + 1)?.textContent);
          break;
        case 'Phone:':
          contact.position = strip(spans.item(i + 1)?.textContent?.replace(/\s+/g, ' '));
          break;
        case 'Email:':
          contact.email = strip(spans.item(i + 1)?.textContent);
          break;
        case 'Campus:':
          contact.campus = strip(spans.item(i + 1)?.textContent);
          break;
        case 'Contact me about:':
          contact.contactAbout = strip(spans.item(i + 1)?.textContent);
          break;
        case 'ORCID:':
          contact.orcid = strip(spans.item(i + 1)?.textContent);
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

const hasChild = (ele: Element, tagName: string, className?: string) => {
  const child = ele.querySelector(tagName);
  if (child && className) {
    return [...child.classList].includes(className);
  } else {
    return !!child;
  }
};

export async function parsePageContentToContact2(html: string) {
  logger.info(`[parsePageContentToContact2] ${html.length}`);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const contact: Contact = {};

  contact.name = strip(doc.querySelector('h2.hero-header')?.textContent);
  contact.position = strip(doc.querySelector('h2.hero-header + p')?.textContent);

  doc.querySelectorAll('p').forEach((p) => {
    const pText = strip(p.textContent);
    if (hasChild(p, 'i', 'fa-mobile') && pText?.includes('Phone:')) {
      contact.phone = strip(pText.replace('Phone:', ''));
      return;
    } else if (hasChild(p, 'i', 'fa-envelope-o') && pText?.includes('Email:')) {
      contact.email = strip(pText.replace('Email:', ''));
      return;
    } else if (hasChild(p, 'i', 'fa-map-marker') && pText?.includes('Campus:')) {
      contact.campus = strip(pText.replace('Campus:', ''));
      return;
    } else if (hasChild(p, 'i', 'fa-users') && pText) {
      contact.school = pText;
    }
  });
  doc.querySelectorAll('a').forEach((a) => {
    const aText = strip(a.textContent);
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

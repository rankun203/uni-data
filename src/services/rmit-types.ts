interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface Sitemap {
  urlset: {
    url: SitemapEntry[];
  };
}

interface ContactUrl {
  url: string;
  lastModified?: string;
}

interface Contact {
  url?: string;
  lastModified?: string;
  name?: string;
  position?: string;
  college?: string;
  school?: string;
  phone?: string;
  email?: string;
  campus?: string;
  contactAbout?: string;
  orcid?: string;
}

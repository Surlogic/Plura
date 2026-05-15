import type { GetServerSideProps } from 'next';
import type { HomeResponse } from '@/types/home';
import { buildAbsoluteUrl } from '@/lib/seo';

const STATIC_PUBLIC_PATHS = [
  '/',
  '/explorar',
  '/profesional/auth/register',
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const fetchHomeData = async (): Promise<HomeResponse | null> => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const response = await fetch(`${apiBaseUrl}/api/home`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as HomeResponse;
  } catch {
    return null;
  }
};

const urlNode = (path: string, priority: string, changefreq = 'weekly') => `  <url>
    <loc>${escapeXml(buildAbsoluteUrl(path))}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const homeData = await fetchHomeData();
  const categoryPaths = (homeData?.categories ?? [])
    .filter((category) => category.slug)
    .map((category) => `/explorar/${encodeURIComponent(category.slug)}`);
  const professionalPaths = (homeData?.topProfessionals ?? [])
    .filter((professional) => professional.slug)
    .map((professional) => `/profesional/pagina/${encodeURIComponent(professional.slug)}`);

  const uniquePaths = Array.from(new Set([
    ...STATIC_PUBLIC_PATHS,
    ...categoryPaths,
    ...professionalPaths,
  ]));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePaths
  .map((path) => {
    if (path === '/') return urlNode(path, '1.0', 'daily');
    if (path.startsWith('/explorar')) return urlNode(path, '0.9', 'daily');
    if (path.startsWith('/profesional/pagina')) return urlNode(path, '0.8', 'daily');
    return urlNode(path, '0.6', 'weekly');
  })
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.write(body);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}

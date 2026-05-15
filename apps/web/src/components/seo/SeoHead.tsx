import Head from 'next/head';
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SITE_NAME,
  buildAbsoluteUrl,
  normalizeSeoText,
  safeJsonLd,
} from '@/lib/seo';

type SeoHeadProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  imageUrl?: string | null;
  noindex?: boolean;
  structuredData?: unknown | unknown[];
};

export default function SeoHead({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  canonicalPath = '/',
  imageUrl,
  noindex = false,
  structuredData,
}: SeoHeadProps) {
  const resolvedTitle = normalizeSeoText(title, 68);
  const resolvedDescription = normalizeSeoText(description, 160);
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);
  const resolvedImageUrl = imageUrl ? buildAbsoluteUrl(imageUrl) : buildAbsoluteUrl('/logo.png');
  const jsonLdItems = Array.isArray(structuredData)
    ? structuredData.filter(Boolean)
    : structuredData
      ? [structuredData]
      : [];

  return (
    <Head>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={resolvedImageUrl} />
      <meta property="og:locale" content="es_UY" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImageUrl} />

      {jsonLdItems.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(item) }}
        />
      ))}
    </Head>
  );
}

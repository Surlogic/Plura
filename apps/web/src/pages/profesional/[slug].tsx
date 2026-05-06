import type { GetServerSideProps } from 'next';

export default function LegacyProfessionalProfileRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = Array.isArray(context.params?.slug)
    ? context.params.slug[0]
    : context.params?.slug;
  const normalizedSlug = slug?.trim();

  if (!normalizedSlug) {
    return {
      redirect: {
        destination: '/explorar',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: `/profesional/pagina/${encodeURIComponent(normalizedSlug)}`,
      permanent: false,
    },
  };
};

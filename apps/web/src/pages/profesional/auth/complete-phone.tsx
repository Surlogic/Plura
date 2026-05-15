import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/profesional/auth/register?resume=1&needsPhone=1',
    permanent: false,
  },
});

export default function ProfesionalCompletePhoneRedirect() {
  return null;
}

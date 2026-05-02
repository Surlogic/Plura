import { Redirect } from 'expo-router';
import { WORKER_HOME_ROUTE } from '../../src/features/shared/auth/routes';

export default function WorkerIndexRoute() {
  return <Redirect href={WORKER_HOME_ROUTE} />;
}

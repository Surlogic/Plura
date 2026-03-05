import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PUBLIC_SLUG = __ENV.PUBLIC_SLUG || 'demo-slug';
const SERVICE_ID = __ENV.SERVICE_ID || 'demo-service-id';
const BOOKING_TOKEN = __ENV.BOOKING_BEARER_TOKEN || '';
const BOOKING_DATE = __ENV.BOOKING_DATE || new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const searchTrend = new Trend('endpoint_search_duration');
const suggestTrend = new Trend('endpoint_suggest_duration');
const profileTrend = new Trend('endpoint_profile_duration');
const slotsTrend = new Trend('endpoint_slots_duration');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.005'],
    checks: ['rate>0.995'],
    endpoint_search_duration: ['p(95)<250'],
    endpoint_suggest_duration: ['p(95)<80'],
    endpoint_profile_duration: ['p(95)<80'],
    endpoint_slots_duration: ['p(95)<120'],
    'http_req_duration{endpoint:search}': ['p(95)<250'],
    'http_req_duration{endpoint:suggest}': ['p(95)<80'],
    'http_req_duration{endpoint:profile}': ['p(95)<80'],
    'http_req_duration{endpoint:slots}': ['p(95)<120'],
  },
  scenarios: {
    suggest_typeahead: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      exec: 'suggestScenario',
    },
    search_results: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      exec: 'searchScenario',
    },
    public_profile: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'profileScenario',
    },
    public_slots: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'slotsScenario',
    },
    booking_create: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10m',
      exec: 'bookingScenario',
    },
  },
};

function jsonHeaders(auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && BOOKING_TOKEN) {
    headers.Authorization = `Bearer ${BOOKING_TOKEN}`;
  }
  return { headers };
}

export function suggestScenario() {
  const q = ['pelu', 'barbe', 'uñas', 'masa', 'cejas'][Math.floor(Math.random() * 5)];
  const res = http.get(`${BASE_URL}/api/search/suggest?q=${encodeURIComponent(q)}`, {
    tags: { endpoint: 'suggest' },
  });
  suggestTrend.add(res.timings.duration);
  check(res, {
    'suggest status 200': (r) => r.status === 200,
  });
  sleep(0.2);
}

export function searchScenario() {
  const query = ['peluqueria', 'barberia', 'spa', 'masajes', 'nails'][Math.floor(Math.random() * 5)];
  const page = Math.floor(Math.random() * 3);
  const res = http.get(
    `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&type=SERVICIO&page=${page}&size=24`,
    { tags: { endpoint: 'search' } }
  );
  searchTrend.add(res.timings.duration);
  check(res, {
    'search status 200': (r) => r.status === 200,
  });
  sleep(0.4);
}

export function profileScenario() {
  const res = http.get(`${BASE_URL}/public/profesionales/${PUBLIC_SLUG}`, {
    tags: { endpoint: 'profile' },
  });
  profileTrend.add(res.timings.duration);
  check(res, {
    'profile status 200': (r) => r.status === 200,
  });
  sleep(0.4);
}

export function slotsScenario() {
  const res = http.get(
    `${BASE_URL}/public/profesionales/${PUBLIC_SLUG}/slots?date=${BOOKING_DATE}&serviceId=${SERVICE_ID}`,
    { tags: { endpoint: 'slots' } }
  );
  slotsTrend.add(res.timings.duration);
  check(res, {
    'slots status 200': (r) => r.status === 200,
  });
  sleep(0.4);
}

export function bookingScenario() {
  const slots = http.get(
    `${BASE_URL}/public/profesionales/${PUBLIC_SLUG}/slots?date=${BOOKING_DATE}&serviceId=${SERVICE_ID}`,
    { tags: { endpoint: 'slots' } }
  );

  if (slots.status !== 200) {
    check(slots, { 'pre-booking slots status': (r) => r.status === 200 });
    sleep(1);
    return;
  }

  let parsed = [];
  try {
    parsed = JSON.parse(slots.body);
  } catch (_) {
    parsed = [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    sleep(1);
    return;
  }

  const chosenSlot = parsed[Math.floor(Math.random() * parsed.length)];
  const payload = JSON.stringify({
    serviceId: SERVICE_ID,
    startDateTime: `${BOOKING_DATE}T${chosenSlot}:00`,
  });

  const res = http.post(
    `${BASE_URL}/public/profesionales/${PUBLIC_SLUG}/reservas`,
    payload,
    { ...jsonHeaders(true), tags: { endpoint: 'booking' } }
  );

  check(res, {
    'booking status expected': (r) => [201, 409, 401].includes(r.status),
  });

  sleep(1);
}

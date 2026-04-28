import type { SearchItem, SearchResultKind } from '@/types/search';

const normalizeText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isDistinct = (left?: string | null, right?: string | null) => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft !== normalizedRight);
};

export const getSearchResultKind = (item: SearchItem): SearchResultKind => {
  if (item.resultKind === 'LOCAL' || item.resultKind === 'PROFESIONAL') {
    return item.resultKind;
  }

  if (isDistinct(item.businessName, item.professionalName)) {
    return 'LOCAL';
  }

  return 'PROFESIONAL';
};

export const getSearchResultPrimaryName = (item: SearchItem) => {
  const kind = getSearchResultKind(item);
  const primary =
    kind === 'LOCAL'
      ? normalizeText(item.businessName) || normalizeText(item.name) || normalizeText(item.professionalName)
      : normalizeText(item.professionalName) || normalizeText(item.name) || normalizeText(item.businessName);

  return primary || 'Profesional';
};

export const getSearchResultSecondaryName = (item: SearchItem) => {
  const kind = getSearchResultKind(item);
  const primary = getSearchResultPrimaryName(item);
  const secondaryCandidate =
    kind === 'LOCAL'
      ? normalizeText(item.professionalName)
      : normalizeText(item.businessName);

  if (!secondaryCandidate || secondaryCandidate === primary) {
    return null;
  }

  return secondaryCandidate;
};

export const getSearchResultKindLabel = (item: SearchItem) =>
  getSearchResultKind(item) === 'LOCAL' ? 'Local' : 'Perfil profesional';


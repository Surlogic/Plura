const DEFAULT_POPUP_CARD_HEIGHT_PX = 252;
const MIN_SELECTION_VERTICAL_OFFSET_PX = 96;
const MIN_MAX_SELECTION_VERTICAL_OFFSET_PX = 128;
const MAX_SELECTION_VERTICAL_OFFSET_RATIO = 0.34;

export const MAPBOX_POPUP_OFFSET_PX = 18;
export const LEAFLET_POPUP_OFFSET_Y_PX = 7;
export const MAPBOX_POPUP_CARD_SELECTOR =
  '.mapboxgl-popup.explore-map-popup .mapboxgl-popup-content > *';
export const LEAFLET_POPUP_CARD_SELECTOR =
  '.leaflet-popup.explore-map-popup .leaflet-popup-content > *';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const measureExploreMapPopupCardHeight = (
  container: ParentNode | null | undefined,
  selector: string,
) => {
  if (!container) return DEFAULT_POPUP_CARD_HEIGHT_PX;

  const popupCard = container.querySelector<HTMLElement>(selector);
  const height = popupCard?.getBoundingClientRect().height;

  if (!height || !Number.isFinite(height)) {
    return DEFAULT_POPUP_CARD_HEIGHT_PX;
  }

  return Math.round(height);
};

export const getExploreMapPopupVerticalFocusOffset = ({
  containerHeight,
  popupHeight,
  popupOffset,
}: {
  containerHeight: number;
  popupHeight: number;
  popupOffset: number;
}) => {
  const safePopupHeight =
    Number.isFinite(popupHeight) && popupHeight > 0
      ? popupHeight
      : DEFAULT_POPUP_CARD_HEIGHT_PX;
  const desiredOffset = Math.round(safePopupHeight / 2 + popupOffset);

  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    return desiredOffset;
  }

  const maxOffset = Math.max(
    MIN_MAX_SELECTION_VERTICAL_OFFSET_PX,
    Math.round(containerHeight * MAX_SELECTION_VERTICAL_OFFSET_RATIO),
  );

  return clamp(desiredOffset, MIN_SELECTION_VERTICAL_OFFSET_PX, maxOffset);
};

export type ExploreMapViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export const areExploreMapViewportBoundsEqual = (
  current: ExploreMapViewportBounds | null,
  next: ExploreMapViewportBounds | null,
) => {
  if (current === next) return true;
  if (!current || !next) return false;

  return current.north === next.north
    && current.south === next.south
    && current.east === next.east
    && current.west === next.west;
};

export const isPointWithinExploreMapViewportBounds = (
  point: {
    latitude: number;
    longitude: number;
  },
  bounds: ExploreMapViewportBounds,
) => {
  const isWithinLatitude = point.latitude >= bounds.south && point.latitude <= bounds.north;
  const isWithinLongitude = bounds.west <= bounds.east
    ? point.longitude >= bounds.west && point.longitude <= bounds.east
    : point.longitude >= bounds.west || point.longitude <= bounds.east;

  return isWithinLatitude && isWithinLongitude;
};

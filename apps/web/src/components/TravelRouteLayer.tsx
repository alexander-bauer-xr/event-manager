import { useEffect, useMemo, useState } from 'react';
import { Polyline } from 'react-leaflet';

type LatLng = [number, number];

interface TravelRouteLayerProps {
  positions: LatLng[];
  profile?: 'driving' | 'walking' | 'cycling';
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: Array<[number, number]>;
    };
  }>;
  message?: string;
}

function toOsrmProfile(profile: TravelRouteLayerProps['profile']) {
  if (profile === 'cycling') return 'bike';
  if (profile === 'walking') return 'foot';
  return 'driving';
}

function toRoutePositions(response: OsrmRouteResponse): LatLng[] {
  const coordinates = response.routes?.[0]?.geometry?.coordinates ?? [];
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

export function TravelRouteLayer({ positions, profile = 'walking' }: TravelRouteLayerProps) {
  const [routePositions, setRoutePositions] = useState<LatLng[]>([]);
  const [failed, setFailed] = useState(false);

  const routeKey = useMemo(() => positions.map(([lat, lng]) => `${lat},${lng}`).join('|'), [positions]);

  useEffect(() => {
    if (positions.length < 2) {
      setRoutePositions([]);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    const coordinates = positions.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const osrmProfile = toOsrmProfile(profile);
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&steps=false`;

    setFailed(false);

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: OsrmRouteResponse) => {
        if (data.code !== 'Ok') {
          setFailed(true);
          setRoutePositions([]);
          return;
        }

        const nextRoutePositions = toRoutePositions(data);
        setRoutePositions(nextRoutePositions.length > 1 ? nextRoutePositions : []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFailed(true);
        setRoutePositions([]);
      });

    return () => controller.abort();
  }, [routeKey, profile]);

  if (positions.length < 2) return null;

  if (routePositions.length > 1) {
    return <Polyline positions={routePositions} />;
  }

  if (failed) {
    return <Polyline positions={positions} dashArray="8 8" />;
  }

  return <Polyline positions={positions} dashArray="4 8" />;
}

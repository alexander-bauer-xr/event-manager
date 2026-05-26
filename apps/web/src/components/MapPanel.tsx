import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export function MapPanel() {
  const { t } = useTranslation();
  const locations = useStore((s) => s.locations);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const validLocations = locations.filter((loc) => loc.lat !== null && loc.lng !== null);

  const defaultCenter: LatLngExpression =
    validLocations.length > 0 && validLocations[0].lat && validLocations[0].lng
      ? [validLocations[0].lat, validLocations[0].lng]
      : [51.505, -0.09];

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error(t('map.geoNotSupported'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast.success(t('map.locationUpdated'));
        setLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error(t('map.locationError'));
        setLocating(false);
      }
    );
  };

  const getNavigationUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/directions?from=&to=${lat},${lng}`;
  };

  if (validLocations.length === 0 && !userLocation) {
    return (
      <div className="empty-state">
        <p>{t('map.empty')}</p>
        <button onClick={handleLocateMe} disabled={locating} className="locate-btn">
          {locating ? t('map.locating') : t('map.showMyLocation')}
        </button>
      </div>
    );
  }

  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] as LatLngExpression : defaultCenter;

  return (
    <div className="map-panel">
      <div className="map-controls">
        <button onClick={handleLocateMe} disabled={locating} className="locate-btn">
          {locating ? t('map.locating') : userLocation ? t('map.updateMyLocation') : t('map.locateMe')}
        </button>
      </div>
      <MapContainer center={mapCenter} zoom={13} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={mapCenter} />
        {validLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat!, loc.lng!]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="map-popup">
                <h3>{loc.title}</h3>
                {loc.address && <p>{loc.address}</p>}
                {loc.note && <p className="map-popup-note">{loc.note}</p>}
                <a
                  href={getNavigationUrl(loc.lat!, loc.lng!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-popup-link"
                >
                  {t('map.navigateHere')}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="map-popup">
                <h3>{t('map.youAreHere')}</h3>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

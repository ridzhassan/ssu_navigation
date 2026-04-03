using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using SSCNavigation.Network;
using SSCNavigation.Location;

namespace SSCNavigation.UI
{
    /// <summary>
    /// Map View Controller - Interactive 2D map display with POI markers
    /// </summary>
    public class MapViewController : MonoBehaviour, IDragHandler, IScrollHandler
    {
        #region Settings
        [Header("Map Components")]
        [SerializeField] private RawImage mapImage;
        [SerializeField] private RectTransform mapContainer;
        [SerializeField] private RectTransform markersContainer;

        [Header("Marker Prefabs")]
        [SerializeField] private GameObject poiMarkerPrefab;
        [SerializeField] private GameObject userMarkerPrefab;

        [Header("Map Settings")]
        [SerializeField] private float minZoom = 0.5f;
        [SerializeField] private float maxZoom = 3f;
        [SerializeField] private float zoomSpeed = 0.1f;
        [SerializeField] private float panSpeed = 1f;

        [Header("Map Bounds (GPS)")]
        [Tooltip("Top-left corner latitude")]
        [SerializeField] private double minLatitude = 6.0500;
        [Tooltip("Top-left corner longitude")]
        [SerializeField] private double minLongitude = 121.0000;
        [Tooltip("Bottom-right corner latitude")]
        [SerializeField] private double maxLatitude = 6.0550;
        [Tooltip("Bottom-right corner longitude")]
        [SerializeField] private double maxLongitude = 121.0050;

        [Header("User Marker")]
        [SerializeField] private bool showUserMarker = true;
        [SerializeField] private float userMarkerUpdateInterval = 0.5f;
        #endregion

        #region Private Fields
        private float _currentZoom = 1f;
        private Vector2 _panOffset = Vector2.zero;
        private Dictionary<int, GameObject> _poiMarkers = new Dictionary<int, GameObject>();
        private GameObject _userMarker;
        private float _lastUserUpdate;
        #endregion

        #region Unity Lifecycle
        private void Start()
        {
            InitializeMap();
            LoadPOIMarkers();
            
            if (showUserMarker)
            {
                CreateUserMarker();
            }
        }

        private void Update()
        {
            if (showUserMarker && Time.time - _lastUserUpdate > userMarkerUpdateInterval)
            {
                UpdateUserMarker();
                _lastUserUpdate = Time.time;
            }
        }
        #endregion

        #region Initialization
        private void InitializeMap()
        {
            if (mapContainer == null)
                mapContainer = GetComponent<RectTransform>();

            ApplyZoom();
        }

        private void CreateUserMarker()
        {
            if (userMarkerPrefab == null || markersContainer == null) return;

            _userMarker = Instantiate(userMarkerPrefab, markersContainer);
            _userMarker.name = "UserMarker";
        }
        #endregion

        #region POI Markers
        public void LoadPOIMarkers()
        {
            var pois = NetworkManager.Instance?.POIs;
            if (pois == null || pois.Count == 0) return;

            foreach (var poi in pois)
            {
                CreatePOIMarker(poi);
            }
        }

        public void CreatePOIMarker(POIData poi)
        {
            if (poiMarkerPrefab == null || markersContainer == null) return;

            var marker = Instantiate(poiMarkerPrefab, markersContainer);
            marker.name = $"Marker_{poi.BuildingName}";

            // Position marker
            Vector2 mapPos = GPSToMapPosition(poi.Latitude, poi.Longitude);
            marker.GetComponent<RectTransform>().anchoredPosition = mapPos;

            // Setup marker content
            var label = marker.GetComponentInChildren<TextMeshProUGUI>();
            if (label != null)
                label.text = poi.BuildingName;

            // Setup click handler
            var button = marker.GetComponent<Button>();
            if (button != null)
            {
                var capturedPOI = poi;
                button.onClick.AddListener(() => OnMarkerClicked(capturedPOI));
            }

            _poiMarkers[poi.POIId] = marker;
        }

        public void ClearMarkers()
        {
            foreach (var marker in _poiMarkers.Values)
            {
                Destroy(marker);
            }
            _poiMarkers.Clear();
        }

        public void HighlightMarker(int poiId)
        {
            foreach (var kvp in _poiMarkers)
            {
                var image = kvp.Value.GetComponent<Image>();
                if (image != null)
                {
                    image.color = kvp.Key == poiId ? Color.yellow : Color.white;
                }
            }
        }
        #endregion

        #region User Marker
        private void UpdateUserMarker()
        {
            if (_userMarker == null || GPSManager.Instance == null) return;

            var location = GPSManager.Instance.CurrentLocation;
            if (location.Latitude == 0 && location.Longitude == 0) return;

            Vector2 mapPos = GPSToMapPosition(location.Latitude, location.Longitude);
            _userMarker.GetComponent<RectTransform>().anchoredPosition = mapPos;

            // Rotate based on compass
            if (CompassManager.Instance != null)
            {
                float heading = CompassManager.Instance.CurrentHeading;
                _userMarker.transform.rotation = Quaternion.Euler(0, 0, -heading);
            }
        }
        #endregion

        #region Coordinate Conversion
        /// <summary>
        /// Convert GPS coordinates to map UI position
        /// </summary>
        public Vector2 GPSToMapPosition(double latitude, double longitude)
        {
            if (mapContainer == null) return Vector2.zero;

            // Normalize coordinates to 0-1 range
            float normalizedX = (float)((longitude - minLongitude) / (maxLongitude - minLongitude));
            float normalizedY = (float)((latitude - minLatitude) / (maxLatitude - minLatitude));

            // Convert to map rect coordinates
            var rect = mapContainer.rect;
            float x = (normalizedX - 0.5f) * rect.width;
            float y = (normalizedY - 0.5f) * rect.height;

            return new Vector2(x, y);
        }

        /// <summary>
        /// Convert map UI position to GPS coordinates
        /// </summary>
        public (double latitude, double longitude) MapPositionToGPS(Vector2 mapPos)
        {
            if (mapContainer == null) return (0, 0);

            var rect = mapContainer.rect;

            // Convert from rect coordinates to normalized
            float normalizedX = (mapPos.x / rect.width) + 0.5f;
            float normalizedY = (mapPos.y / rect.height) + 0.5f;

            // Convert to GPS
            double longitude = minLongitude + (normalizedX * (maxLongitude - minLongitude));
            double latitude = minLatitude + (normalizedY * (maxLatitude - minLatitude));

            return (latitude, longitude);
        }
        #endregion

        #region Pan & Zoom
        public void OnDrag(PointerEventData eventData)
        {
            if (mapContainer == null) return;

            Vector2 delta = eventData.delta * panSpeed / _currentZoom;
            _panOffset += delta;
            
            // Clamp pan
            var rect = mapContainer.rect;
            float maxPanX = rect.width * (_currentZoom - 1) * 0.5f;
            float maxPanY = rect.height * (_currentZoom - 1) * 0.5f;
            
            _panOffset.x = Mathf.Clamp(_panOffset.x, -maxPanX, maxPanX);
            _panOffset.y = Mathf.Clamp(_panOffset.y, -maxPanY, maxPanY);

            ApplyTransform();
        }

        public void OnScroll(PointerEventData eventData)
        {
            float zoomDelta = eventData.scrollDelta.y * zoomSpeed;
            SetZoom(_currentZoom + zoomDelta);
        }

        public void SetZoom(float zoom)
        {
            _currentZoom = Mathf.Clamp(zoom, minZoom, maxZoom);
            ApplyZoom();
        }

        public void ZoomIn()
        {
            SetZoom(_currentZoom + zoomSpeed);
        }

        public void ZoomOut()
        {
            SetZoom(_currentZoom - zoomSpeed);
        }

        public void ResetView()
        {
            _currentZoom = 1f;
            _panOffset = Vector2.zero;
            ApplyZoom();
            ApplyTransform();
        }

        private void ApplyZoom()
        {
            if (mapContainer != null)
            {
                mapContainer.localScale = Vector3.one * _currentZoom;
            }
        }

        private void ApplyTransform()
        {
            if (mapContainer != null)
            {
                mapContainer.anchoredPosition = _panOffset;
            }
        }

        /// <summary>
        /// Center map on a specific GPS coordinate
        /// </summary>
        public void CenterOnLocation(double latitude, double longitude)
        {
            Vector2 mapPos = GPSToMapPosition(latitude, longitude);
            _panOffset = -mapPos * _currentZoom;
            ApplyTransform();
        }

        /// <summary>
        /// Center on user's current location
        /// </summary>
        public void CenterOnUser()
        {
            if (GPSManager.Instance == null) return;

            var location = GPSManager.Instance.CurrentLocation;
            CenterOnLocation(location.Latitude, location.Longitude);
        }
        #endregion

        #region Event Handlers
        private void OnMarkerClicked(POIData poi)
        {
            // Highlight this marker
            HighlightMarker(poi.POIId);

            // Show building info
            UIManager.Instance?.ShowBuildingInfo(poi);

            Debug.Log($"[MapView] Marker clicked: {poi.BuildingName}");
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Set the map bounds (GPS coordinates)
        /// </summary>
        public void SetMapBounds(double minLat, double minLon, double maxLat, double maxLon)
        {
            minLatitude = minLat;
            minLongitude = minLon;
            maxLatitude = maxLat;
            maxLongitude = maxLon;

            // Refresh marker positions
            RefreshMarkerPositions();
        }

        /// <summary>
        /// Refresh all marker positions (call after map bounds change)
        /// </summary>
        public void RefreshMarkerPositions()
        {
            var pois = NetworkManager.Instance?.POIs;
            if (pois == null) return;

            foreach (var poi in pois)
            {
                if (_poiMarkers.TryGetValue(poi.POIId, out var marker))
                {
                    Vector2 mapPos = GPSToMapPosition(poi.Latitude, poi.Longitude);
                    marker.GetComponent<RectTransform>().anchoredPosition = mapPos;
                }
            }
        }
        #endregion
    }
}


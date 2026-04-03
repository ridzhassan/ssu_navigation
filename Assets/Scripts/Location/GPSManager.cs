using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Android;

namespace SSCNavigation.Location
{
    /// <summary>
    /// GPS Manager - Handles device GPS location tracking for AR navigation
    /// Attach this script to a persistent GameObject in your scene
    /// </summary>
    public class GPSManager : MonoBehaviour
    {
        #region Singleton
        public static GPSManager Instance { get; private set; }
        #endregion

        #region Events
        /// <summary>Fired when GPS location is updated</summary>
        public event Action<GPSData> OnLocationUpdated;
        
        /// <summary>Fired when GPS status changes</summary>
        public event Action<GPSStatus> OnStatusChanged;
        
        /// <summary>Fired when compass heading updates</summary>
        public event Action<float> OnCompassUpdated;
        #endregion

        #region Settings
        [Header("GPS Settings")]
        [Tooltip("Desired accuracy in meters")]
        [SerializeField] private float desiredAccuracy = 5f;
        
        [Tooltip("Update distance threshold in meters")]
        [SerializeField] private float updateDistance = 2f;
        
        [Tooltip("Maximum wait time for GPS initialization (seconds)")]
        [SerializeField] private int maxWaitTime = 20;
        
        [Tooltip("GPS update interval (seconds)")]
        [SerializeField] private float updateInterval = 1f;

        [Header("Compass Settings")]
        [SerializeField] private bool useCompass = true;
        [SerializeField] private float compassUpdateInterval = 0.1f;

        [Header("Reference Point (Campus Center)")]
        [Tooltip("Latitude of campus center point")]
        [SerializeField] private double referenceLatitude = 6.0523;
        
        [Tooltip("Longitude of campus center point")]
        [SerializeField] private double referenceLongitude = 121.0021;
        #endregion

        #region Properties
        /// <summary>Current GPS data</summary>
        public GPSData CurrentLocation { get; private set; }
        
        /// <summary>Current GPS status</summary>
        public GPSStatus Status { get; private set; } = GPSStatus.Disabled;
        
        /// <summary>Current compass heading (0-360 degrees)</summary>
        public float CompassHeading { get; private set; }
        
        /// <summary>Is GPS currently tracking</summary>
        public bool IsTracking { get; private set; }
        
        /// <summary>Reference latitude for coordinate conversion</summary>
        public double ReferenceLatitude => referenceLatitude;
        
        /// <summary>Reference longitude for coordinate conversion</summary>
        public double ReferenceLongitude => referenceLongitude;
        #endregion

        #region Private Fields
        private Coroutine _gpsCoroutine;
        private Coroutine _compassCoroutine;
        private const double METERS_PER_DEGREE_LAT = 111320.0; // Approximate meters per degree latitude
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            // Singleton setup
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            // Auto-start GPS on mobile
            #if UNITY_ANDROID || UNITY_IOS
            StartGPS();
            #endif
        }

        private void OnDestroy()
        {
            StopGPS();
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Start GPS tracking
        /// </summary>
        public void StartGPS()
        {
            if (IsTracking) return;
            
            _gpsCoroutine = StartCoroutine(GPSCoroutine());
            
            if (useCompass)
            {
                _compassCoroutine = StartCoroutine(CompassCoroutine());
            }
        }

        /// <summary>
        /// Stop GPS tracking
        /// </summary>
        public void StopGPS()
        {
            IsTracking = false;
            
            if (_gpsCoroutine != null)
            {
                StopCoroutine(_gpsCoroutine);
                _gpsCoroutine = null;
            }
            
            if (_compassCoroutine != null)
            {
                StopCoroutine(_compassCoroutine);
                _compassCoroutine = null;
            }

            Input.location.Stop();
            Input.compass.enabled = false;
            
            SetStatus(GPSStatus.Disabled);
        }

        /// <summary>
        /// Convert GPS coordinates to Unity world position relative to reference point
        /// </summary>
        /// <param name="latitude">Target latitude</param>
        /// <param name="longitude">Target longitude</param>
        /// <returns>Unity world position (Y is always 0)</returns>
        public Vector3 GPSToUnityPosition(double latitude, double longitude)
        {
            // Calculate offset from reference point in meters
            double deltaLat = latitude - referenceLatitude;
            double deltaLon = longitude - referenceLongitude;

            // Convert to meters
            // Latitude: 1 degree ≈ 111,320 meters
            // Longitude: varies by latitude, use cosine correction
            double metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.Cos(referenceLatitude * Math.PI / 180.0);

            float x = (float)(deltaLon * metersPerDegreeLon);
            float z = (float)(deltaLat * METERS_PER_DEGREE_LAT);

            return new Vector3(x, 0, z);
        }

        /// <summary>
        /// Convert Unity world position back to GPS coordinates
        /// </summary>
        /// <param name="position">Unity world position</param>
        /// <returns>GPS coordinates (latitude, longitude)</returns>
        public (double latitude, double longitude) UnityPositionToGPS(Vector3 position)
        {
            double metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.Cos(referenceLatitude * Math.PI / 180.0);

            double latitude = referenceLatitude + (position.z / METERS_PER_DEGREE_LAT);
            double longitude = referenceLongitude + (position.x / metersPerDegreeLon);

            return (latitude, longitude);
        }

        /// <summary>
        /// Calculate distance between two GPS coordinates in meters
        /// Uses Haversine formula for accuracy
        /// </summary>
        public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000; // Earth's radius in meters

            double dLat = (lat2 - lat1) * Math.PI / 180.0;
            double dLon = (lon2 - lon1) * Math.PI / 180.0;

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c;
        }

        /// <summary>
        /// Calculate bearing between two GPS coordinates
        /// </summary>
        /// <returns>Bearing in degrees (0-360)</returns>
        public static double CalculateBearing(double lat1, double lon1, double lat2, double lon2)
        {
            double dLon = (lon2 - lon1) * Math.PI / 180.0;
            double lat1Rad = lat1 * Math.PI / 180.0;
            double lat2Rad = lat2 * Math.PI / 180.0;

            double x = Math.Sin(dLon) * Math.Cos(lat2Rad);
            double y = Math.Cos(lat1Rad) * Math.Sin(lat2Rad) -
                       Math.Sin(lat1Rad) * Math.Cos(lat2Rad) * Math.Cos(dLon);

            double bearing = Math.Atan2(x, y) * 180.0 / Math.PI;
            return (bearing + 360) % 360;
        }

        /// <summary>
        /// Set the campus reference point for coordinate conversion
        /// </summary>
        public void SetReferencePoint(double latitude, double longitude)
        {
            referenceLatitude = latitude;
            referenceLongitude = longitude;
            Debug.Log($"[GPSManager] Reference point set to: {latitude}, {longitude}");
        }
        #endregion

        #region Private Methods
        private IEnumerator GPSCoroutine()
        {
            SetStatus(GPSStatus.Initializing);

            // Check and request permissions on Android
            #if UNITY_ANDROID
            if (!Permission.HasUserAuthorizedPermission(Permission.FineLocation))
            {
                Permission.RequestUserPermission(Permission.FineLocation);
                yield return new WaitForSeconds(1f);
            }
            #endif

            // Check if location service is enabled
            if (!Input.location.isEnabledByUser)
            {
                SetStatus(GPSStatus.PermissionDenied);
                Debug.LogWarning("[GPSManager] Location services not enabled by user");
                yield break;
            }

            // Start location service
            Input.location.Start(desiredAccuracy, updateDistance);

            // Wait for initialization
            int waitCount = 0;
            while (Input.location.status == LocationServiceStatus.Initializing && waitCount < maxWaitTime)
            {
                yield return new WaitForSeconds(1f);
                waitCount++;
            }

            // Check initialization result
            if (waitCount >= maxWaitTime)
            {
                SetStatus(GPSStatus.TimedOut);
                Debug.LogWarning("[GPSManager] GPS initialization timed out");
                yield break;
            }

            if (Input.location.status == LocationServiceStatus.Failed)
            {
                SetStatus(GPSStatus.Failed);
                Debug.LogError("[GPSManager] GPS initialization failed");
                yield break;
            }

            // GPS is now running
            SetStatus(GPSStatus.Running);
            IsTracking = true;
            Debug.Log("[GPSManager] GPS tracking started successfully");

            // Main GPS update loop
            while (IsTracking)
            {
                UpdateGPSData();
                yield return new WaitForSeconds(updateInterval);
            }
        }

        private IEnumerator CompassCoroutine()
        {
            // Enable compass
            Input.compass.enabled = true;

            // Wait for compass to initialize
            yield return new WaitForSeconds(0.5f);

            while (IsTracking && useCompass)
            {
                CompassHeading = Input.compass.trueHeading;
                OnCompassUpdated?.Invoke(CompassHeading);
                yield return new WaitForSeconds(compassUpdateInterval);
            }
        }

        private void UpdateGPSData()
        {
            if (Input.location.status != LocationServiceStatus.Running) return;

            var locationData = Input.location.lastData;

            CurrentLocation = new GPSData
            {
                Latitude = locationData.latitude,
                Longitude = locationData.longitude,
                Altitude = locationData.altitude,
                HorizontalAccuracy = locationData.horizontalAccuracy,
                VerticalAccuracy = locationData.verticalAccuracy,
                Timestamp = locationData.timestamp,
                UnityPosition = GPSToUnityPosition(locationData.latitude, locationData.longitude)
            };

            OnLocationUpdated?.Invoke(CurrentLocation);

            #if UNITY_EDITOR
            Debug.Log($"[GPSManager] Location: {CurrentLocation.Latitude:F6}, {CurrentLocation.Longitude:F6} | Accuracy: {CurrentLocation.HorizontalAccuracy}m");
            #endif
        }

        private void SetStatus(GPSStatus newStatus)
        {
            if (Status != newStatus)
            {
                Status = newStatus;
                OnStatusChanged?.Invoke(newStatus);
                Debug.Log($"[GPSManager] Status changed to: {newStatus}");
            }
        }
        #endregion

        #region Editor Testing
        #if UNITY_EDITOR
        [Header("Editor Testing")]
        [SerializeField] private double testLatitude = 6.0523;
        [SerializeField] private double testLongitude = 121.0021;

        [ContextMenu("Simulate GPS Update")]
        private void SimulateGPSUpdate()
        {
            CurrentLocation = new GPSData
            {
                Latitude = testLatitude,
                Longitude = testLongitude,
                Altitude = 10,
                HorizontalAccuracy = 5,
                VerticalAccuracy = 10,
                Timestamp = Time.time,
                UnityPosition = GPSToUnityPosition(testLatitude, testLongitude)
            };

            OnLocationUpdated?.Invoke(CurrentLocation);
            Debug.Log($"[GPSManager] Simulated location: {testLatitude}, {testLongitude}");
        }
        #endif
        #endregion
    }

    /// <summary>
    /// GPS data structure containing location information
    /// </summary>
    [Serializable]
    public struct GPSData
    {
        public double Latitude;
        public double Longitude;
        public double Altitude;
        public float HorizontalAccuracy;
        public float VerticalAccuracy;
        public double Timestamp;
        public Vector3 UnityPosition;

        public override string ToString()
        {
            return $"GPS({Latitude:F6}, {Longitude:F6}) | Accuracy: {HorizontalAccuracy}m";
        }
    }

    /// <summary>
    /// GPS service status
    /// </summary>
    public enum GPSStatus
    {
        Disabled,
        Initializing,
        Running,
        Failed,
        TimedOut,
        PermissionDenied
    }
}


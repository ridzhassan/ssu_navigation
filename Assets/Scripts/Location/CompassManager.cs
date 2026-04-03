using System;
using UnityEngine;

namespace SSCNavigation.Location
{
    /// <summary>
    /// Compass Manager - Provides smooth compass heading for AR navigation
    /// Can be used independently or with GPSManager
    /// </summary>
    public class CompassManager : MonoBehaviour
    {
        #region Singleton
        public static CompassManager Instance { get; private set; }
        #endregion

        #region Events
        public event Action<float> OnHeadingUpdated;
        #endregion

        #region Settings
        [Header("Compass Settings")]
        [Tooltip("Smoothing factor (0-1). Higher = smoother but less responsive")]
        [SerializeField, Range(0f, 0.99f)] private float smoothing = 0.8f;
        
        [Tooltip("Update interval in seconds")]
        [SerializeField] private float updateInterval = 0.05f;
        
        [Tooltip("Use true north instead of magnetic north")]
        [SerializeField] private bool useTrueHeading = true;

        [Header("Filter Settings")]
        [Tooltip("Minimum heading change to trigger update (degrees)")]
        [SerializeField] private float minimumDelta = 0.5f;
        #endregion

        #region Properties
        /// <summary>Current smoothed heading (0-360 degrees)</summary>
        public float CurrentHeading { get; private set; }
        
        /// <summary>Raw unfiltered heading from device</summary>
        public float RawHeading { get; private set; }
        
        /// <summary>Is compass enabled and running</summary>
        public bool IsEnabled { get; private set; }
        #endregion

        #region Private Fields
        private float _lastUpdateTime;
        private float _previousHeading;
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            EnableCompass();
        }

        private void Update()
        {
            if (!IsEnabled) return;
            
            if (Time.time - _lastUpdateTime >= updateInterval)
            {
                UpdateCompass();
                _lastUpdateTime = Time.time;
            }
        }

        private void OnDestroy()
        {
            DisableCompass();
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Enable compass tracking
        /// </summary>
        public void EnableCompass()
        {
            Input.compass.enabled = true;
            IsEnabled = true;
            Debug.Log("[CompassManager] Compass enabled");
        }

        /// <summary>
        /// Disable compass tracking
        /// </summary>
        public void DisableCompass()
        {
            Input.compass.enabled = false;
            IsEnabled = false;
            Debug.Log("[CompassManager] Compass disabled");
        }

        /// <summary>
        /// Get direction vector from current heading
        /// </summary>
        public Vector3 GetDirectionVector()
        {
            float radians = CurrentHeading * Mathf.Deg2Rad;
            return new Vector3(Mathf.Sin(radians), 0, Mathf.Cos(radians));
        }

        /// <summary>
        /// Get rotation quaternion from current heading
        /// </summary>
        public Quaternion GetRotation()
        {
            return Quaternion.Euler(0, CurrentHeading, 0);
        }

        /// <summary>
        /// Calculate angle difference between current heading and target bearing
        /// </summary>
        /// <param name="targetBearing">Target bearing in degrees</param>
        /// <returns>Signed angle difference (-180 to 180)</returns>
        public float GetAngleToTarget(float targetBearing)
        {
            float diff = targetBearing - CurrentHeading;
            
            // Normalize to -180 to 180
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            
            return diff;
        }
        #endregion

        #region Private Methods
        private void UpdateCompass()
        {
            // Get raw heading
            RawHeading = useTrueHeading ? Input.compass.trueHeading : Input.compass.magneticHeading;

            // Handle wrap-around (359 -> 0)
            float delta = Mathf.DeltaAngle(_previousHeading, RawHeading);
            float targetHeading = _previousHeading + delta;

            // Apply smoothing
            CurrentHeading = Mathf.LerpAngle(CurrentHeading, targetHeading, 1f - smoothing);

            // Normalize to 0-360
            CurrentHeading = (CurrentHeading + 360) % 360;

            // Fire event if significant change
            if (Mathf.Abs(Mathf.DeltaAngle(_previousHeading, CurrentHeading)) >= minimumDelta)
            {
                OnHeadingUpdated?.Invoke(CurrentHeading);
            }

            _previousHeading = CurrentHeading;
        }
        #endregion

        #region Editor Testing
        #if UNITY_EDITOR
        [Header("Editor Testing")]
        [SerializeField] private float testHeading = 0f;

        [ContextMenu("Simulate Heading")]
        private void SimulateHeading()
        {
            CurrentHeading = testHeading;
            OnHeadingUpdated?.Invoke(CurrentHeading);
            Debug.Log($"[CompassManager] Simulated heading: {testHeading}°");
        }
        #endif
        #endregion
    }
}


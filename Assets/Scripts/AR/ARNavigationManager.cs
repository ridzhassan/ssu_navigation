using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using SSCNavigation.Location;
using SSCNavigation.Pathfinding;
using SSCNavigation.Network;

namespace SSCNavigation.AR
{
    /// <summary>
    /// AR Navigation Manager - Core controller for AR navigation system
    /// Manages AR arrows, route visualization, and navigation state
    /// </summary>
    [RequireComponent(typeof(ARRaycastManager))]
    public class ARNavigationManager : MonoBehaviour
    {
        #region Singleton
        public static ARNavigationManager Instance { get; private set; }
        #endregion

        #region Events
        public event Action<NavigationState> OnNavigationStateChanged;
        public event Action<POIData> OnDestinationReached;
        public event Action<float> OnDistanceUpdated;
        public event Action<string> OnInstructionUpdated;
        #endregion

        #region Settings
        [Header("AR Components")]
        [SerializeField] private ARSession arSession;
        [SerializeField] private ARSessionOrigin arSessionOrigin;
        [SerializeField] private ARRaycastManager raycastManager;
        [SerializeField] private ARPlaneManager planeManager;

        [Header("Navigation Prefabs")]
        [SerializeField] private GameObject arrowPrefab;
        [SerializeField] private GameObject destinationMarkerPrefab;
        [SerializeField] private GameObject waypointMarkerPrefab;

        [Header("Navigation Settings")]
        [Tooltip("Distance between navigation arrows (meters)")]
        [SerializeField] private float arrowSpacing = 3f;
        
        [Tooltip("Height of arrows above ground (meters)")]
        [SerializeField] private float arrowHeight = 0.5f;
        
        [Tooltip("Maximum arrows to display at once")]
        [SerializeField] private int maxVisibleArrows = 10;
        
        [Tooltip("Distance threshold to consider waypoint reached (meters)")]
        [SerializeField] private float waypointReachedThreshold = 5f;
        
        [Tooltip("Distance threshold to consider destination reached (meters)")]
        [SerializeField] private float destinationReachedThreshold = 10f;
        
        [Tooltip("Arrow update interval (seconds)")]
        [SerializeField] private float updateInterval = 0.5f;

        [Header("Recalculation Settings")]
        [Tooltip("Distance from route to trigger recalculation (meters)")]
        [SerializeField] private float recalculationThreshold = 15f;
        
        [Tooltip("Minimum time between recalculations (seconds)")]
        [SerializeField] private float recalculationCooldown = 5f;
        #endregion

        #region Properties
        public NavigationState CurrentState { get; private set; } = NavigationState.Idle;
        public POIData CurrentDestination { get; private set; }
        public List<PathNode> CurrentRoute { get; private set; }
        public float DistanceToDestination { get; private set; }
        public int CurrentWaypointIndex { get; private set; }
        #endregion

        #region Private Fields
        private List<GameObject> _activeArrows = new List<GameObject>();
        private GameObject _destinationMarker;
        private List<GameObject> _waypointMarkers = new List<GameObject>();
        private Coroutine _navigationCoroutine;
        private float _lastRecalculationTime;
        private Camera _arCamera;
        private PathfindingManager _pathfinder;
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
            InitializeComponents();
        }

        private void OnDestroy()
        {
            StopNavigation();
            ClearAllMarkers();
        }
        #endregion

        #region Initialization
        private void InitializeComponents()
        {
            // Get AR components
            if (arSessionOrigin == null)
                arSessionOrigin = FindObjectOfType<ARSessionOrigin>();
            
            if (raycastManager == null)
                raycastManager = GetComponent<ARRaycastManager>();

            if (arSessionOrigin != null)
                _arCamera = arSessionOrigin.camera;
            else
                _arCamera = Camera.main;

            // Get pathfinder
            _pathfinder = PathfindingManager.Instance;
            if (_pathfinder == null)
            {
                Debug.LogWarning("[ARNavigation] PathfindingManager not found. Creating one.");
                var go = new GameObject("PathfindingManager");
                _pathfinder = go.AddComponent<PathfindingManager>();
            }

            Debug.Log("[ARNavigation] Initialized successfully");
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Start navigation to a destination POI
        /// </summary>
        public void StartNavigation(POIData destination)
        {
            if (CurrentState == NavigationState.Navigating)
            {
                StopNavigation();
            }

            CurrentDestination = destination;
            SetState(NavigationState.CalculatingRoute);

            // Calculate route
            if (GPSManager.Instance == null || GPSManager.Instance.CurrentLocation.Latitude == 0)
            {
                Debug.LogError("[ARNavigation] GPS not available");
                SetState(NavigationState.Error);
                return;
            }

            var startPos = GPSManager.Instance.CurrentLocation.UnityPosition;
            var endPos = GPSManager.Instance.GPSToUnityPosition(destination.Latitude, destination.Longitude);

            CurrentRoute = _pathfinder.FindPath(startPos, endPos);

            if (CurrentRoute == null || CurrentRoute.Count == 0)
            {
                // If no path found, create direct route
                CurrentRoute = CreateDirectRoute(startPos, endPos);
            }

            CurrentWaypointIndex = 0;
            _lastRecalculationTime = Time.time;

            // Start navigation coroutine
            _navigationCoroutine = StartCoroutine(NavigationCoroutine());

            SetState(NavigationState.Navigating);
            Debug.Log($"[ARNavigation] Started navigation to: {destination.BuildingName}");
        }

        /// <summary>
        /// Stop current navigation
        /// </summary>
        public void StopNavigation()
        {
            if (_navigationCoroutine != null)
            {
                StopCoroutine(_navigationCoroutine);
                _navigationCoroutine = null;
            }

            ClearAllMarkers();
            CurrentRoute = null;
            CurrentDestination = null;
            CurrentWaypointIndex = 0;

            SetState(NavigationState.Idle);
            Debug.Log("[ARNavigation] Navigation stopped");
        }

        /// <summary>
        /// Pause navigation (arrows hidden but route kept)
        /// </summary>
        public void PauseNavigation()
        {
            if (CurrentState != NavigationState.Navigating) return;

            foreach (var arrow in _activeArrows)
            {
                arrow.SetActive(false);
            }

            SetState(NavigationState.Paused);
        }

        /// <summary>
        /// Resume paused navigation
        /// </summary>
        public void ResumeNavigation()
        {
            if (CurrentState != NavigationState.Paused) return;

            foreach (var arrow in _activeArrows)
            {
                arrow.SetActive(true);
            }

            SetState(NavigationState.Navigating);
        }

        /// <summary>
        /// Force route recalculation
        /// </summary>
        public void RecalculateRoute()
        {
            if (CurrentDestination == null) return;
            
            var destination = CurrentDestination;
            StopNavigation();
            StartNavigation(destination);
        }

        /// <summary>
        /// Get current navigation instruction
        /// </summary>
        public string GetCurrentInstruction()
        {
            if (CurrentState != NavigationState.Navigating || CurrentRoute == null)
                return "No active navigation";

            if (CurrentWaypointIndex >= CurrentRoute.Count)
                return "You have arrived at your destination";

            var currentWaypoint = CurrentRoute[CurrentWaypointIndex];
            var userPos = GPSManager.Instance.CurrentLocation.UnityPosition;
            var distance = Vector3.Distance(userPos, currentWaypoint.Position);

            if (CurrentWaypointIndex == CurrentRoute.Count - 1)
            {
                return $"Destination ahead in {distance:F0} meters";
            }

            // Calculate direction
            var direction = (currentWaypoint.Position - userPos).normalized;
            var heading = GPSManager.Instance != null ? 
                CompassManager.Instance?.CurrentHeading ?? 0 : 0;
            
            var targetBearing = Mathf.Atan2(direction.x, direction.z) * Mathf.Rad2Deg;
            var angleDiff = Mathf.DeltaAngle(heading, targetBearing);

            string directionText;
            if (Mathf.Abs(angleDiff) < 15)
                directionText = "Continue straight";
            else if (angleDiff > 0)
                directionText = angleDiff > 45 ? "Turn right" : "Bear right";
            else
                directionText = angleDiff < -45 ? "Turn left" : "Bear left";

            return $"{directionText} - {distance:F0}m to next point";
        }
        #endregion

        #region Private Methods
        private IEnumerator NavigationCoroutine()
        {
            while (CurrentState == NavigationState.Navigating || CurrentState == NavigationState.Paused)
            {
                if (CurrentState == NavigationState.Navigating)
                {
                    UpdateNavigation();
                }

                yield return new WaitForSeconds(updateInterval);
            }
        }

        private void UpdateNavigation()
        {
            if (CurrentRoute == null || CurrentRoute.Count == 0) return;

            var userPos = GPSManager.Instance.CurrentLocation.UnityPosition;

            // Check if current waypoint reached
            if (CurrentWaypointIndex < CurrentRoute.Count)
            {
                var waypointDistance = Vector3.Distance(userPos, CurrentRoute[CurrentWaypointIndex].Position);
                
                if (waypointDistance < waypointReachedThreshold)
                {
                    CurrentWaypointIndex++;
                    Debug.Log($"[ARNavigation] Waypoint {CurrentWaypointIndex} reached");
                }
            }

            // Check if destination reached
            var destPos = GPSManager.Instance.GPSToUnityPosition(
                CurrentDestination.Latitude, 
                CurrentDestination.Longitude
            );
            DistanceToDestination = Vector3.Distance(userPos, destPos);
            OnDistanceUpdated?.Invoke(DistanceToDestination);

            if (DistanceToDestination < destinationReachedThreshold)
            {
                OnDestinationReached?.Invoke(CurrentDestination);
                StopNavigation();
                SetState(NavigationState.Arrived);
                return;
            }

            // Check if off route - recalculate if needed
            if (ShouldRecalculateRoute(userPos))
            {
                RecalculateRoute();
                return;
            }

            // Update arrows
            UpdateArrows(userPos);

            // Update instruction
            OnInstructionUpdated?.Invoke(GetCurrentInstruction());
        }

        private bool ShouldRecalculateRoute(Vector3 userPos)
        {
            if (Time.time - _lastRecalculationTime < recalculationCooldown)
                return false;

            // Check distance to nearest route point
            float minDistance = float.MaxValue;
            foreach (var node in CurrentRoute)
            {
                float dist = Vector3.Distance(userPos, node.Position);
                if (dist < minDistance)
                    minDistance = dist;
            }

            return minDistance > recalculationThreshold;
        }

        private void UpdateArrows(Vector3 userPos)
        {
            // Clear existing arrows
            foreach (var arrow in _activeArrows)
            {
                if (arrow != null)
                    Destroy(arrow);
            }
            _activeArrows.Clear();

            if (arrowPrefab == null) return;

            // Create arrows along route from current position
            int arrowCount = 0;
            int startIndex = Mathf.Max(0, CurrentWaypointIndex - 1);

            for (int i = startIndex; i < CurrentRoute.Count && arrowCount < maxVisibleArrows; i++)
            {
                var node = CurrentRoute[i];
                var distance = Vector3.Distance(userPos, node.Position);

                // Only show arrows within reasonable distance
                if (distance > 50f) break;

                // Create arrow
                var arrow = Instantiate(arrowPrefab);
                var arrowPos = node.Position;
                arrowPos.y = GetGroundHeight(arrowPos) + arrowHeight;
                arrow.transform.position = arrowPos;

                // Point arrow towards next waypoint
                if (i < CurrentRoute.Count - 1)
                {
                    var direction = CurrentRoute[i + 1].Position - node.Position;
                    direction.y = 0;
                    if (direction.sqrMagnitude > 0.01f)
                    {
                        arrow.transform.rotation = Quaternion.LookRotation(direction);
                    }
                }
                else
                {
                    // Last arrow points to destination
                    var destPos = GPSManager.Instance.GPSToUnityPosition(
                        CurrentDestination.Latitude,
                        CurrentDestination.Longitude
                    );
                    var direction = destPos - node.Position;
                    direction.y = 0;
                    if (direction.sqrMagnitude > 0.01f)
                    {
                        arrow.transform.rotation = Quaternion.LookRotation(direction);
                    }
                }

                _activeArrows.Add(arrow);
                arrowCount++;
            }

            // Update destination marker
            UpdateDestinationMarker();
        }

        private void UpdateDestinationMarker()
        {
            if (destinationMarkerPrefab == null) return;

            var destPos = GPSManager.Instance.GPSToUnityPosition(
                CurrentDestination.Latitude,
                CurrentDestination.Longitude
            );

            if (_destinationMarker == null)
            {
                _destinationMarker = Instantiate(destinationMarkerPrefab);
            }

            destPos.y = GetGroundHeight(destPos) + 2f; // Raise marker above ground
            _destinationMarker.transform.position = destPos;

            // Make marker face camera
            if (_arCamera != null)
            {
                var lookDir = _arCamera.transform.position - _destinationMarker.transform.position;
                lookDir.y = 0;
                if (lookDir.sqrMagnitude > 0.01f)
                {
                    _destinationMarker.transform.rotation = Quaternion.LookRotation(-lookDir);
                }
            }
        }

        private float GetGroundHeight(Vector3 position)
        {
            // Try AR raycast first
            var hits = new List<ARRaycastHit>();
            var screenPoint = _arCamera.WorldToScreenPoint(position);
            
            if (raycastManager != null && 
                raycastManager.Raycast(screenPoint, hits, TrackableType.PlaneWithinPolygon))
            {
                return hits[0].pose.position.y;
            }

            // Fallback to physics raycast
            if (Physics.Raycast(position + Vector3.up * 10f, Vector3.down, out RaycastHit hit, 20f))
            {
                return hit.point.y;
            }

            return 0f;
        }

        private List<PathNode> CreateDirectRoute(Vector3 start, Vector3 end)
        {
            var route = new List<PathNode>();
            var direction = (end - start).normalized;
            var distance = Vector3.Distance(start, end);
            int nodeCount = Mathf.CeilToInt(distance / arrowSpacing);

            for (int i = 0; i <= nodeCount; i++)
            {
                float t = (float)i / nodeCount;
                var pos = Vector3.Lerp(start, end, t);
                route.Add(new PathNode { Position = pos, NodeType = PathNodeType.Waypoint });
            }

            return route;
        }

        private void ClearAllMarkers()
        {
            foreach (var arrow in _activeArrows)
            {
                if (arrow != null)
                    Destroy(arrow);
            }
            _activeArrows.Clear();

            if (_destinationMarker != null)
            {
                Destroy(_destinationMarker);
                _destinationMarker = null;
            }

            foreach (var marker in _waypointMarkers)
            {
                if (marker != null)
                    Destroy(marker);
            }
            _waypointMarkers.Clear();
        }

        private void SetState(NavigationState newState)
        {
            if (CurrentState != newState)
            {
                CurrentState = newState;
                OnNavigationStateChanged?.Invoke(newState);
                Debug.Log($"[ARNavigation] State changed to: {newState}");
            }
        }
        #endregion
    }

    /// <summary>
    /// Navigation state enum
    /// </summary>
    public enum NavigationState
    {
        Idle,
        CalculatingRoute,
        Navigating,
        Paused,
        Arrived,
        Error
    }
}


using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.SceneManagement;
using SSCNavigation.Location;
using SSCNavigation.Network;
using SSCNavigation.AR;
using SSCNavigation.Pathfinding;
using SSCNavigation.UI;

namespace SSCNavigation.Core
{
    /// <summary>
    /// Game Manager - Central controller that initializes and coordinates all systems
    /// Attach to a persistent GameObject in your first scene
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        #region Singleton
        public static GameManager Instance { get; private set; }
        #endregion

        #region Events
        public event Action OnInitializationComplete;
        public event Action<string> OnInitializationFailed;
        public event Action<float, string> OnInitializationProgress;
        #endregion

        #region Settings
        [Header("Scene Names")]
        [SerializeField] private string mainMenuScene = "MainMenu";
        [SerializeField] private string arNavigationScene = "ARNavigation";

        [Header("API Configuration")]
        [SerializeField] private string apiBaseUrl = "http://localhost:3000/api";

        [Header("Campus Configuration")]
        [SerializeField] private double campusCenterLatitude = 6.0523;
        [SerializeField] private double campusCenterLongitude = 121.0021;

        [Header("Debug")]
        [SerializeField] private bool debugMode = false;
        [SerializeField] private bool skipGPSCheck = false;
        #endregion

        #region Properties
        public bool IsInitialized { get; private set; }
        public bool IsARMode { get; private set; }
        public AppState CurrentState { get; private set; } = AppState.Uninitialized;
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
            DontDestroyOnLoad(gameObject);

            // Set target frame rate
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }

        private async void Start()
        {
            await InitializeApplication();
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                // Save state if needed
                Debug.Log("[GameManager] Application paused");
            }
            else
            {
                // Resume services
                Debug.Log("[GameManager] Application resumed");
            }
        }
        #endregion

        #region Initialization
        private async Task InitializeApplication()
        {
            CurrentState = AppState.Initializing;
            Debug.Log("[GameManager] Starting initialization...");

            try
            {
                // Step 1: Initialize Core Services
                OnInitializationProgress?.Invoke(0.1f, "Initializing core services...");
                InitializeCoreServices();
                await Task.Delay(100);

                // Step 2: Check permissions
                OnInitializationProgress?.Invoke(0.2f, "Checking permissions...");
                bool permissionsGranted = await CheckPermissions();
                if (!permissionsGranted && !skipGPSCheck)
                {
                    OnInitializationFailed?.Invoke("Required permissions not granted");
                    return;
                }

                // Step 3: Initialize GPS
                OnInitializationProgress?.Invoke(0.3f, "Starting GPS...");
                InitializeGPS();
                await Task.Delay(500);

                // Step 4: Setup Network
                OnInitializationProgress?.Invoke(0.5f, "Connecting to server...");
                SetupNetwork();

                // Step 5: Load Data
                OnInitializationProgress?.Invoke(0.6f, "Loading campus data...");
                await LoadCampusData();

                // Step 6: Initialize Pathfinding
                OnInitializationProgress?.Invoke(0.8f, "Setting up pathfinding...");
                InitializePathfinding();

                // Complete
                OnInitializationProgress?.Invoke(1.0f, "Ready!");
                IsInitialized = true;
                CurrentState = AppState.Ready;

                Debug.Log("[GameManager] Initialization complete!");
                OnInitializationComplete?.Invoke();

                // Load main menu
                LoadMainMenu();
            }
            catch (Exception e)
            {
                Debug.LogError($"[GameManager] Initialization failed: {e.Message}");
                CurrentState = AppState.Error;
                OnInitializationFailed?.Invoke(e.Message);
            }
        }

        private void InitializeCoreServices()
        {
            // Ensure all manager singletons exist
            EnsureManager<GPSManager>("GPSManager");
            EnsureManager<CompassManager>("CompassManager");
            EnsureManager<NetworkManager>("NetworkManager");
            EnsureManager<PathfindingManager>("PathfindingManager");
        }

        private void EnsureManager<T>(string name) where T : MonoBehaviour
        {
            if (FindObjectOfType<T>() == null)
            {
                var go = new GameObject(name);
                go.AddComponent<T>();
                go.transform.SetParent(transform);
                Debug.Log($"[GameManager] Created {name}");
            }
        }

        private async Task<bool> CheckPermissions()
        {
            #if UNITY_ANDROID && !UNITY_EDITOR
            if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.FineLocation))
            {
                UnityEngine.Android.Permission.RequestUserPermission(UnityEngine.Android.Permission.FineLocation);
                await Task.Delay(2000); // Wait for user response
                
                return UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.FineLocation);
            }
            if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Camera))
            {
                UnityEngine.Android.Permission.RequestUserPermission(UnityEngine.Android.Permission.Camera);
                await Task.Delay(2000);
                
                return UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Camera);
            }
            #endif
            
            return true;
        }

        private void InitializeGPS()
        {
            if (GPSManager.Instance != null)
            {
                GPSManager.Instance.SetReferencePoint(campusCenterLatitude, campusCenterLongitude);
                GPSManager.Instance.StartGPS();
            }
        }

        private void SetupNetwork()
        {
            if (NetworkManager.Instance != null)
            {
                NetworkManager.Instance.SetBaseUrl(apiBaseUrl);
            }
        }

        private async Task LoadCampusData()
        {
            if (NetworkManager.Instance != null)
            {
                await NetworkManager.Instance.LoadAllDataAsync();
            }
        }

        private void InitializePathfinding()
        {
            if (PathfindingManager.Instance != null && NetworkManager.Instance != null)
            {
                // Add POIs as navigation nodes
                PathfindingManager.Instance.AddNodesFromPOIs(
                    NetworkManager.Instance.POIs,
                    GPSManager.Instance
                );
            }
        }
        #endregion

        #region Scene Management
        public void LoadMainMenu()
        {
            IsARMode = false;
            CurrentState = AppState.MainMenu;
            
            if (!string.IsNullOrEmpty(mainMenuScene))
            {
                SceneManager.LoadScene(mainMenuScene);
            }
        }

        public void LoadARNavigation()
        {
            IsARMode = true;
            CurrentState = AppState.ARNavigation;
            
            if (!string.IsNullOrEmpty(arNavigationScene))
            {
                SceneManager.LoadScene(arNavigationScene);
            }
        }

        public void SwitchToARMode()
        {
            if (!IsInitialized)
            {
                Debug.LogWarning("[GameManager] Cannot switch to AR - not initialized");
                return;
            }

            LoadARNavigation();
        }

        public void ExitARMode()
        {
            ARNavigationManager.Instance?.StopNavigation();
            LoadMainMenu();
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Start navigation to a destination
        /// </summary>
        public void StartNavigationTo(POIData destination)
        {
            if (!IsInitialized)
            {
                Debug.LogWarning("[GameManager] Cannot start navigation - not initialized");
                return;
            }

            // Switch to AR mode if not already
            if (!IsARMode)
            {
                // Save destination for after scene load
                PlayerPrefs.SetInt("PendingDestinationId", destination.POIId);
                LoadARNavigation();
            }
            else
            {
                ARNavigationManager.Instance?.StartNavigation(destination);
            }
        }

        /// <summary>
        /// Refresh all data from server
        /// </summary>
        public async void RefreshData()
        {
            if (NetworkManager.Instance != null)
            {
                await NetworkManager.Instance.LoadAllDataAsync();
            }
        }

        /// <summary>
        /// Update API configuration
        /// </summary>
        public void SetAPIUrl(string url)
        {
            apiBaseUrl = url;
            if (NetworkManager.Instance != null)
            {
                NetworkManager.Instance.SetBaseUrl(url);
            }
        }

        /// <summary>
        /// Set campus center for GPS calculations
        /// </summary>
        public void SetCampusCenter(double latitude, double longitude)
        {
            campusCenterLatitude = latitude;
            campusCenterLongitude = longitude;
            
            if (GPSManager.Instance != null)
            {
                GPSManager.Instance.SetReferencePoint(latitude, longitude);
            }
        }
        #endregion

        #region Application Events
        public void QuitApplication()
        {
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
            #else
            Application.Quit();
            #endif
        }
        #endregion
    }

    /// <summary>
    /// Application state enum
    /// </summary>
    public enum AppState
    {
        Uninitialized,
        Initializing,
        Ready,
        MainMenu,
        ARNavigation,
        Error
    }
}


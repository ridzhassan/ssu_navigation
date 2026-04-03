using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace SSCNavigation.Network
{
    /// <summary>
    /// Network Manager - Handles all API communication with backend
    /// </summary>
    public class NetworkManager : MonoBehaviour
    {
        #region Singleton
        public static NetworkManager Instance { get; private set; }
        #endregion

        #region Events
        public event Action<List<BuildingData>> OnBuildingsLoaded;
        public event Action<List<POIData>> OnPOIsLoaded;
        public event Action<string> OnError;
        #endregion

        #region Settings
        [Header("API Configuration")]
        [SerializeField] private string baseUrl = "http://localhost:3000/api";
        
        [Tooltip("Request timeout in seconds")]
        [SerializeField] private int timeout = 30;

        [Header("Authentication")]
        [SerializeField] private string authToken = "";
        
        [Header("Caching")]
        [SerializeField] private bool enableCaching = true;
        [SerializeField] private float cacheExpiry = 300f; // 5 minutes
        #endregion

        #region Properties
        public List<BuildingData> Buildings { get; private set; } = new List<BuildingData>();
        public List<POIData> POIs { get; private set; } = new List<POIData>();
        public bool IsLoading { get; private set; }
        #endregion

        #region Private Fields
        private Dictionary<string, CachedResponse> _cache = new Dictionary<string, CachedResponse>();
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
        }
        #endregion

        #region Public Methods - Buildings
        /// <summary>
        /// Fetch all buildings from API
        /// </summary>
        public async Task<List<BuildingData>> GetBuildingsAsync()
        {
            string endpoint = "/buildings";
            
            try
            {
                string json = await GetAsync(endpoint);
                var response = JsonUtility.FromJson<BuildingsResponse>($"{{\"buildings\":{json}}}");
                Buildings = response.buildings;
                OnBuildingsLoaded?.Invoke(Buildings);
                return Buildings;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to fetch buildings: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }

        /// <summary>
        /// Get single building by ID
        /// </summary>
        public async Task<BuildingData> GetBuildingAsync(int id)
        {
            string endpoint = $"/buildings/{id}";
            
            try
            {
                string json = await GetAsync(endpoint);
                return JsonUtility.FromJson<BuildingData>(json);
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to fetch building {id}: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }
        #endregion

        #region Public Methods - POIs
        /// <summary>
        /// Fetch all POIs from API
        /// </summary>
        public async Task<List<POIData>> GetPOIsAsync()
        {
            string endpoint = "/poi";
            
            try
            {
                string json = await GetAsync(endpoint);
                var response = JsonUtility.FromJson<POIsResponse>($"{{\"pois\":{json}}}");
                POIs = response.pois;
                OnPOIsLoaded?.Invoke(POIs);
                return POIs;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to fetch POIs: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }

        /// <summary>
        /// Get POIs by building ID
        /// </summary>
        public async Task<List<POIData>> GetPOIsByBuildingAsync(int buildingId)
        {
            string endpoint = $"/poi?buildingId={buildingId}";
            
            try
            {
                string json = await GetAsync(endpoint);
                var response = JsonUtility.FromJson<POIsResponse>($"{{\"pois\":{json}}}");
                return response.pois;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to fetch POIs for building {buildingId}: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }

        /// <summary>
        /// Search POIs by name
        /// </summary>
        public async Task<List<POIData>> SearchPOIsAsync(string query)
        {
            string endpoint = $"/poi/search?q={UnityWebRequest.EscapeURL(query)}";
            
            try
            {
                string json = await GetAsync(endpoint, useCache: false);
                var response = JsonUtility.FromJson<POIsResponse>($"{{\"pois\":{json}}}");
                return response.pois;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to search POIs: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }
        #endregion

        #region Public Methods - Navigation Data
        /// <summary>
        /// Fetch navigation paths/routes from API
        /// </summary>
        public async Task<List<RouteData>> GetRoutesAsync()
        {
            string endpoint = "/routes";
            
            try
            {
                string json = await GetAsync(endpoint);
                var response = JsonUtility.FromJson<RoutesResponse>($"{{\"routes\":{json}}}");
                return response.routes;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to fetch routes: {e.Message}");
                OnError?.Invoke(e.Message);
                return null;
            }
        }

        /// <summary>
        /// Load all navigation data (buildings, POIs, routes)
        /// </summary>
        public async Task LoadAllDataAsync()
        {
            IsLoading = true;
            Debug.Log("[Network] Loading all navigation data...");

            try
            {
                // Parallel loading
                var buildingsTask = GetBuildingsAsync();
                var poisTask = GetPOIsAsync();

                await Task.WhenAll(buildingsTask, poisTask);

                Debug.Log($"[Network] Loaded {Buildings.Count} buildings and {POIs.Count} POIs");
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Failed to load data: {e.Message}");
                OnError?.Invoke(e.Message);
            }
            finally
            {
                IsLoading = false;
            }
        }
        #endregion

        #region HTTP Methods
        /// <summary>
        /// Perform GET request
        /// </summary>
        private async Task<string> GetAsync(string endpoint, bool useCache = true)
        {
            string url = baseUrl + endpoint;
            
            // Check cache
            if (useCache && enableCaching && _cache.TryGetValue(endpoint, out var cached))
            {
                if (Time.time - cached.Timestamp < cacheExpiry)
                {
                    Debug.Log($"[Network] Using cached response for: {endpoint}");
                    return cached.Data;
                }
            }

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = timeout;
                
                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                request.SetRequestHeader("Content-Type", "application/json");

                var operation = request.SendWebRequest();
                
                while (!operation.isDone)
                {
                    await Task.Yield();
                }

                if (request.result != UnityWebRequest.Result.Success)
                {
                    throw new Exception($"HTTP Error: {request.error} - {request.downloadHandler.text}");
                }

                string response = request.downloadHandler.text;

                // Cache response
                if (enableCaching)
                {
                    _cache[endpoint] = new CachedResponse
                    {
                        Data = response,
                        Timestamp = Time.time
                    };
                }

                return response;
            }
        }

        /// <summary>
        /// Perform POST request
        /// </summary>
        private async Task<string> PostAsync(string endpoint, string jsonBody)
        {
            string url = baseUrl + endpoint;

            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.timeout = timeout;

                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                request.SetRequestHeader("Content-Type", "application/json");

                var operation = request.SendWebRequest();

                while (!operation.isDone)
                {
                    await Task.Yield();
                }

                if (request.result != UnityWebRequest.Result.Success)
                {
                    throw new Exception($"HTTP Error: {request.error} - {request.downloadHandler.text}");
                }

                return request.downloadHandler.text;
            }
        }
        #endregion

        #region Utility Methods
        /// <summary>
        /// Set the API base URL
        /// </summary>
        public void SetBaseUrl(string url)
        {
            baseUrl = url.TrimEnd('/');
            ClearCache();
        }

        /// <summary>
        /// Set authentication token
        /// </summary>
        public void SetAuthToken(string token)
        {
            authToken = token;
        }

        /// <summary>
        /// Clear response cache
        /// </summary>
        public void ClearCache()
        {
            _cache.Clear();
            Debug.Log("[Network] Cache cleared");
        }

        /// <summary>
        /// Check if network is available
        /// </summary>
        public bool IsNetworkAvailable()
        {
            return Application.internetReachability != NetworkReachability.NotReachable;
        }
        #endregion

        #region Coroutine Wrappers (for non-async contexts)
        public void LoadAllData(Action onComplete = null, Action<string> onError = null)
        {
            StartCoroutine(LoadAllDataCoroutine(onComplete, onError));
        }

        private IEnumerator LoadAllDataCoroutine(Action onComplete, Action<string> onError)
        {
            var task = LoadAllDataAsync();
            
            while (!task.IsCompleted)
            {
                yield return null;
            }

            if (task.IsFaulted)
            {
                onError?.Invoke(task.Exception?.Message ?? "Unknown error");
            }
            else
            {
                onComplete?.Invoke();
            }
        }
        #endregion
    }

    #region Data Classes
    [Serializable]
    public class BuildingData
    {
        public int id;
        public string name;
        public string description;
        public double latitude;
        public double longitude;
        public string imageUrl;
        public string category;
        public int floors;
        public string[] facilities;
    }

    [Serializable]
    public class POIData
    {
        public int POIId;
        public string BuildingName;
        public double Latitude;
        public double Longitude;
        public string Type;
        public string Description;
        public string ImageUrl;
        public int BuildingId;
        public string Floor;
        public string[] Tags;
    }

    [Serializable]
    public class RouteData
    {
        public int id;
        public string name;
        public WaypointData[] waypoints;
        public float totalDistance;
    }

    [Serializable]
    public class WaypointData
    {
        public double latitude;
        public double longitude;
        public int order;
    }

    // Response wrapper classes for JSON parsing
    [Serializable]
    internal class BuildingsResponse
    {
        public List<BuildingData> buildings;
    }

    [Serializable]
    internal class POIsResponse
    {
        public List<POIData> pois;
    }

    [Serializable]
    internal class RoutesResponse
    {
        public List<RouteData> routes;
    }

    internal class CachedResponse
    {
        public string Data;
        public float Timestamp;
    }
    #endregion
}


using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SSCNavigation.Network;
using SSCNavigation.AR;
using SSCNavigation.Location;

namespace SSCNavigation.UI
{
    /// <summary>
    /// UI Manager - Central controller for all UI elements
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        #region Singleton
        public static UIManager Instance { get; private set; }
        #endregion

        #region Events
        public event Action<POIData> OnDestinationSelected;
        public event Action OnNavigationStartRequested;
        public event Action OnNavigationStopRequested;
        #endregion

        #region UI References
        [Header("Panels")]
        [SerializeField] private GameObject mainMenuPanel;
        [SerializeField] private GameObject navigationPanel;
        [SerializeField] private GameObject searchPanel;
        [SerializeField] private GameObject buildingInfoPanel;
        [SerializeField] private GameObject loadingPanel;
        [SerializeField] private GameObject settingsPanel;

        [Header("Main Menu")]
        [SerializeField] private TMP_Dropdown buildingDropdown;
        [SerializeField] private Button startNavigationButton;
        [SerializeField] private Button searchButton;
        [SerializeField] private Button settingsButton;
        [SerializeField] private TMP_InputField searchInput;

        [Header("Navigation HUD")]
        [SerializeField] private TextMeshProUGUI instructionText;
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private TextMeshProUGUI destinationNameText;
        [SerializeField] private Button stopNavigationButton;
        [SerializeField] private Button recenterButton;
        [SerializeField] private Image compassImage;
        [SerializeField] private Slider progressSlider;

        [Header("Building Info")]
        [SerializeField] private TextMeshProUGUI buildingNameText;
        [SerializeField] private TextMeshProUGUI buildingDescriptionText;
        [SerializeField] private Image buildingImage;
        [SerializeField] private Button navigateToButton;
        [SerializeField] private Button closeInfoButton;

        [Header("Search Results")]
        [SerializeField] private Transform searchResultsContainer;
        [SerializeField] private GameObject searchResultPrefab;
        [SerializeField] private Button closeSearchButton;

        [Header("Loading")]
        [SerializeField] private TextMeshProUGUI loadingText;
        [SerializeField] private Slider loadingProgressBar;

        [Header("Notifications")]
        [SerializeField] private GameObject notificationPanel;
        [SerializeField] private TextMeshProUGUI notificationText;
        [SerializeField] private float notificationDuration = 3f;

        [Header("GPS Status")]
        [SerializeField] private Image gpsStatusIcon;
        [SerializeField] private TextMeshProUGUI gpsStatusText;
        [SerializeField] private Color gpsActiveColor = Color.green;
        [SerializeField] private Color gpsInactiveColor = Color.red;
        #endregion

        #region Private Fields
        private POIData _selectedDestination;
        private List<POIData> _poiList = new List<POIData>();
        private List<GameObject> _searchResultItems = new List<GameObject>();
        private Coroutine _notificationCoroutine;
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
            InitializeUI();
            SetupEventListeners();
            ShowMainMenu();
        }

        private void Update()
        {
            UpdateCompass();
            UpdateGPSStatus();
        }

        private void OnDestroy()
        {
            RemoveEventListeners();
        }
        #endregion

        #region Initialization
        private void InitializeUI()
        {
            // Hide all panels initially
            HideAllPanels();
            
            // Setup button listeners
            if (startNavigationButton != null)
                startNavigationButton.onClick.AddListener(OnStartNavigationClicked);
            
            if (stopNavigationButton != null)
                stopNavigationButton.onClick.AddListener(OnStopNavigationClicked);
            
            if (searchButton != null)
                searchButton.onClick.AddListener(ShowSearchPanel);
            
            if (closeSearchButton != null)
                closeSearchButton.onClick.AddListener(HideSearchPanel);
            
            if (closeInfoButton != null)
                closeInfoButton.onClick.AddListener(HideBuildingInfo);
            
            if (navigateToButton != null)
                navigateToButton.onClick.AddListener(OnNavigateToClicked);
            
            if (recenterButton != null)
                recenterButton.onClick.AddListener(OnRecenterClicked);
            
            if (settingsButton != null)
                settingsButton.onClick.AddListener(ShowSettings);

            // Setup dropdown
            if (buildingDropdown != null)
            {
                buildingDropdown.onValueChanged.AddListener(OnBuildingSelected);
            }

            // Setup search input
            if (searchInput != null)
            {
                searchInput.onEndEdit.AddListener(OnSearchSubmit);
            }

            Debug.Log("[UIManager] Initialized");
        }

        private void SetupEventListeners()
        {
            // GPS events
            if (GPSManager.Instance != null)
            {
                GPSManager.Instance.OnStatusChanged += OnGPSStatusChanged;
            }

            // Navigation events
            if (ARNavigationManager.Instance != null)
            {
                ARNavigationManager.Instance.OnNavigationStateChanged += OnNavigationStateChanged;
                ARNavigationManager.Instance.OnDistanceUpdated += OnDistanceUpdated;
                ARNavigationManager.Instance.OnInstructionUpdated += OnInstructionUpdated;
                ARNavigationManager.Instance.OnDestinationReached += OnDestinationReached;
            }

            // Network events
            if (NetworkManager.Instance != null)
            {
                NetworkManager.Instance.OnPOIsLoaded += OnPOIsLoaded;
                NetworkManager.Instance.OnError += OnNetworkError;
            }
        }

        private void RemoveEventListeners()
        {
            if (GPSManager.Instance != null)
            {
                GPSManager.Instance.OnStatusChanged -= OnGPSStatusChanged;
            }

            if (ARNavigationManager.Instance != null)
            {
                ARNavigationManager.Instance.OnNavigationStateChanged -= OnNavigationStateChanged;
                ARNavigationManager.Instance.OnDistanceUpdated -= OnDistanceUpdated;
                ARNavigationManager.Instance.OnInstructionUpdated -= OnInstructionUpdated;
                ARNavigationManager.Instance.OnDestinationReached -= OnDestinationReached;
            }

            if (NetworkManager.Instance != null)
            {
                NetworkManager.Instance.OnPOIsLoaded -= OnPOIsLoaded;
                NetworkManager.Instance.OnError -= OnNetworkError;
            }
        }
        #endregion

        #region Panel Management
        public void ShowMainMenu()
        {
            HideAllPanels();
            if (mainMenuPanel != null)
                mainMenuPanel.SetActive(true);
        }

        public void ShowNavigationHUD()
        {
            HideAllPanels();
            if (navigationPanel != null)
                navigationPanel.SetActive(true);
        }

        public void ShowSearchPanel()
        {
            if (searchPanel != null)
                searchPanel.SetActive(true);
        }

        public void HideSearchPanel()
        {
            if (searchPanel != null)
                searchPanel.SetActive(false);
        }

        public void ShowBuildingInfo(POIData poi)
        {
            if (buildingInfoPanel == null) return;

            _selectedDestination = poi;

            if (buildingNameText != null)
                buildingNameText.text = poi.BuildingName;
            
            if (buildingDescriptionText != null)
                buildingDescriptionText.text = poi.Description;

            // Load image if available
            if (buildingImage != null && !string.IsNullOrEmpty(poi.ImageUrl))
            {
                // TODO: Load image from URL
            }

            buildingInfoPanel.SetActive(true);
        }

        public void HideBuildingInfo()
        {
            if (buildingInfoPanel != null)
                buildingInfoPanel.SetActive(false);
        }

        public void ShowLoading(string message = "Loading...")
        {
            if (loadingPanel != null)
            {
                loadingPanel.SetActive(true);
                if (loadingText != null)
                    loadingText.text = message;
            }
        }

        public void HideLoading()
        {
            if (loadingPanel != null)
                loadingPanel.SetActive(false);
        }

        public void ShowSettings()
        {
            if (settingsPanel != null)
                settingsPanel.SetActive(true);
        }

        public void HideSettings()
        {
            if (settingsPanel != null)
                settingsPanel.SetActive(false);
        }

        private void HideAllPanels()
        {
            if (mainMenuPanel != null) mainMenuPanel.SetActive(false);
            if (navigationPanel != null) navigationPanel.SetActive(false);
            if (searchPanel != null) searchPanel.SetActive(false);
            if (buildingInfoPanel != null) buildingInfoPanel.SetActive(false);
            if (settingsPanel != null) settingsPanel.SetActive(false);
        }
        #endregion

        #region Notifications
        public void ShowNotification(string message, NotificationType type = NotificationType.Info)
        {
            if (notificationPanel == null || notificationText == null) return;

            // Set color based on type
            Color bgColor = type switch
            {
                NotificationType.Success => new Color(0.2f, 0.7f, 0.3f, 0.9f),
                NotificationType.Warning => new Color(0.9f, 0.7f, 0.2f, 0.9f),
                NotificationType.Error => new Color(0.8f, 0.2f, 0.2f, 0.9f),
                _ => new Color(0.2f, 0.5f, 0.8f, 0.9f)
            };

            var bg = notificationPanel.GetComponent<Image>();
            if (bg != null) bg.color = bgColor;

            notificationText.text = message;
            notificationPanel.SetActive(true);

            // Auto-hide
            if (_notificationCoroutine != null)
                StopCoroutine(_notificationCoroutine);
            
            _notificationCoroutine = StartCoroutine(HideNotificationAfterDelay());
        }

        private System.Collections.IEnumerator HideNotificationAfterDelay()
        {
            yield return new WaitForSeconds(notificationDuration);
            if (notificationPanel != null)
                notificationPanel.SetActive(false);
        }
        #endregion

        #region Dropdown & Building List
        public void PopulateBuildingDropdown(List<POIData> pois)
        {
            if (buildingDropdown == null) return;

            _poiList = pois;
            buildingDropdown.ClearOptions();

            var options = new List<TMP_Dropdown.OptionData>();
            options.Add(new TMP_Dropdown.OptionData("Select Destination"));

            foreach (var poi in pois)
            {
                options.Add(new TMP_Dropdown.OptionData(poi.BuildingName));
            }

            buildingDropdown.AddOptions(options);
        }

        private void OnBuildingSelected(int index)
        {
            if (index == 0 || index > _poiList.Count) return;

            _selectedDestination = _poiList[index - 1]; // -1 because of "Select Destination" option
            OnDestinationSelected?.Invoke(_selectedDestination);

            // Enable start button
            if (startNavigationButton != null)
                startNavigationButton.interactable = true;

            Debug.Log($"[UIManager] Selected destination: {_selectedDestination.BuildingName}");
        }
        #endregion

        #region Search
        private async void OnSearchSubmit(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return;

            ShowLoading("Searching...");
            ClearSearchResults();

            var results = await NetworkManager.Instance.SearchPOIsAsync(query);
            
            HideLoading();

            if (results != null && results.Count > 0)
            {
                DisplaySearchResults(results);
            }
            else
            {
                ShowNotification("No results found", NotificationType.Info);
            }
        }

        private void DisplaySearchResults(List<POIData> results)
        {
            if (searchResultsContainer == null || searchResultPrefab == null) return;

            ClearSearchResults();

            foreach (var poi in results)
            {
                var item = Instantiate(searchResultPrefab, searchResultsContainer);
                
                // Setup item
                var nameText = item.GetComponentInChildren<TextMeshProUGUI>();
                if (nameText != null)
                    nameText.text = poi.BuildingName;

                var button = item.GetComponent<Button>();
                if (button != null)
                {
                    var capturedPOI = poi; // Capture for closure
                    button.onClick.AddListener(() => OnSearchResultClicked(capturedPOI));
                }

                _searchResultItems.Add(item);
            }
        }

        private void ClearSearchResults()
        {
            foreach (var item in _searchResultItems)
            {
                Destroy(item);
            }
            _searchResultItems.Clear();
        }

        private void OnSearchResultClicked(POIData poi)
        {
            HideSearchPanel();
            ShowBuildingInfo(poi);
        }
        #endregion

        #region Button Handlers
        private void OnStartNavigationClicked()
        {
            if (_selectedDestination == null)
            {
                ShowNotification("Please select a destination", NotificationType.Warning);
                return;
            }

            OnNavigationStartRequested?.Invoke();
            ARNavigationManager.Instance?.StartNavigation(_selectedDestination);
        }

        private void OnStopNavigationClicked()
        {
            OnNavigationStopRequested?.Invoke();
            ARNavigationManager.Instance?.StopNavigation();
            ShowMainMenu();
        }

        private void OnNavigateToClicked()
        {
            if (_selectedDestination == null) return;
            
            HideBuildingInfo();
            ARNavigationManager.Instance?.StartNavigation(_selectedDestination);
        }

        private void OnRecenterClicked()
        {
            ARNavigationManager.Instance?.RecalculateRoute();
        }
        #endregion

        #region Event Handlers
        private void OnPOIsLoaded(List<POIData> pois)
        {
            PopulateBuildingDropdown(pois);
        }

        private void OnNavigationStateChanged(NavigationState state)
        {
            switch (state)
            {
                case NavigationState.Idle:
                    ShowMainMenu();
                    break;
                case NavigationState.CalculatingRoute:
                    ShowLoading("Calculating route...");
                    break;
                case NavigationState.Navigating:
                    HideLoading();
                    ShowNavigationHUD();
                    if (destinationNameText != null && _selectedDestination != null)
                        destinationNameText.text = _selectedDestination.BuildingName;
                    break;
                case NavigationState.Arrived:
                    ShowNotification("You have arrived!", NotificationType.Success);
                    ShowMainMenu();
                    break;
                case NavigationState.Error:
                    ShowNotification("Navigation error occurred", NotificationType.Error);
                    ShowMainMenu();
                    break;
            }
        }

        private void OnDistanceUpdated(float distance)
        {
            if (distanceText != null)
            {
                if (distance >= 1000)
                    distanceText.text = $"{distance / 1000f:F1} km";
                else
                    distanceText.text = $"{distance:F0} m";
            }
        }

        private void OnInstructionUpdated(string instruction)
        {
            if (instructionText != null)
                instructionText.text = instruction;
        }

        private void OnDestinationReached(POIData destination)
        {
            ShowNotification($"Arrived at {destination.BuildingName}!", NotificationType.Success);
        }

        private void OnGPSStatusChanged(GPSStatus status)
        {
            UpdateGPSStatusDisplay(status);
        }

        private void OnNetworkError(string error)
        {
            ShowNotification($"Network error: {error}", NotificationType.Error);
        }
        #endregion

        #region UI Updates
        private void UpdateCompass()
        {
            if (compassImage == null) return;

            float heading = CompassManager.Instance?.CurrentHeading ?? 0;
            compassImage.transform.rotation = Quaternion.Euler(0, 0, heading);
        }

        private void UpdateGPSStatus()
        {
            if (GPSManager.Instance == null) return;
            UpdateGPSStatusDisplay(GPSManager.Instance.Status);
        }

        private void UpdateGPSStatusDisplay(GPSStatus status)
        {
            if (gpsStatusIcon != null)
            {
                gpsStatusIcon.color = status == GPSStatus.Running ? gpsActiveColor : gpsInactiveColor;
            }

            if (gpsStatusText != null)
            {
                gpsStatusText.text = status switch
                {
                    GPSStatus.Running => "GPS Active",
                    GPSStatus.Initializing => "GPS Starting...",
                    GPSStatus.Failed => "GPS Failed",
                    GPSStatus.PermissionDenied => "GPS Permission Denied",
                    _ => "GPS Disabled"
                };
            }
        }
        #endregion
    }

    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }
}


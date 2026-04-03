using System;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

namespace SSCNavigation.AR
{
    /// <summary>
    /// AR Session Controller - Manages AR session lifecycle and state
    /// Attach to AR Session GameObject
    /// </summary>
    [RequireComponent(typeof(ARSession))]
    public class ARSessionController : MonoBehaviour
    {
        #region Events
        public event Action OnARSessionReady;
        public event Action<string> OnARSessionError;
        public event Action<ARSessionState> OnARSessionStateChanged;
        #endregion

        #region Properties
        public static ARSessionController Instance { get; private set; }
        public ARSession Session { get; private set; }
        public bool IsSessionReady { get; private set; }
        public ARSessionState CurrentState { get; private set; }
        #endregion

        #region Private Fields
        private ARSessionState _previousState;
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

            Session = GetComponent<ARSession>();
        }

        private void OnEnable()
        {
            ARSession.stateChanged += OnStateChanged;
        }

        private void OnDisable()
        {
            ARSession.stateChanged -= OnStateChanged;
        }

        private void Start()
        {
            CheckARAvailability();
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Reset AR Session
        /// </summary>
        public void ResetSession()
        {
            if (Session != null)
            {
                Session.Reset();
                Debug.Log("[ARSession] Session reset");
            }
        }

        /// <summary>
        /// Toggle AR Session enabled state
        /// </summary>
        public void SetSessionEnabled(bool enabled)
        {
            if (Session != null)
            {
                Session.enabled = enabled;
                Debug.Log($"[ARSession] Session enabled: {enabled}");
            }
        }

        /// <summary>
        /// Check if AR is supported on this device
        /// </summary>
        public async void CheckARAvailability()
        {
            if (ARSession.state == ARSessionState.None ||
                ARSession.state == ARSessionState.CheckingAvailability)
            {
                Debug.Log("[ARSession] Checking AR availability...");
            }

            // Wait for availability check
            var status = await ARSession.CheckAvailability();

            if (status == ARSessionState.Unsupported)
            {
                Debug.LogError("[ARSession] AR is not supported on this device");
                OnARSessionError?.Invoke("AR is not supported on this device");
            }
            else if (status == ARSessionState.NeedsInstall)
            {
                Debug.Log("[ARSession] AR software needs to be installed");
                // Try to install ARCore
                var installStatus = await ARSession.Install();
                if (installStatus != ARSessionState.Ready)
                {
                    OnARSessionError?.Invoke("Failed to install AR software");
                }
            }
        }
        #endregion

        #region Private Methods
        private void OnStateChanged(ARSessionStateChangedEventArgs args)
        {
            CurrentState = args.state;
            
            if (_previousState != CurrentState)
            {
                Debug.Log($"[ARSession] State changed: {_previousState} -> {CurrentState}");
                OnARSessionStateChanged?.Invoke(CurrentState);
                
                if (CurrentState == ARSessionState.SessionTracking && !IsSessionReady)
                {
                    IsSessionReady = true;
                    OnARSessionReady?.Invoke();
                    Debug.Log("[ARSession] Session is ready and tracking");
                }
            }

            _previousState = CurrentState;
        }
        #endregion

        #region Static Methods
        /// <summary>
        /// Get human-readable state description
        /// </summary>
        public static string GetStateDescription(ARSessionState state)
        {
            return state switch
            {
                ARSessionState.None => "Not initialized",
                ARSessionState.Unsupported => "AR not supported",
                ARSessionState.CheckingAvailability => "Checking availability...",
                ARSessionState.NeedsInstall => "AR software needs install",
                ARSessionState.Installing => "Installing AR software...",
                ARSessionState.Ready => "Ready",
                ARSessionState.SessionInitializing => "Initializing...",
                ARSessionState.SessionTracking => "Tracking",
                _ => "Unknown"
            };
        }
        #endregion
    }
}


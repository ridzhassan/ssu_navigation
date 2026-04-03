using UnityEngine;

namespace SSCNavigation.AR
{
    /// <summary>
    /// AR Arrow Controller - Manages individual navigation arrow behavior
    /// Attach this to your AR Arrow prefab
    /// </summary>
    public class ARArrowController : MonoBehaviour
    {
        #region Settings
        [Header("Animation Settings")]
        [SerializeField] private bool enableBobbing = true;
        [SerializeField] private float bobHeight = 0.1f;
        [SerializeField] private float bobSpeed = 2f;

        [SerializeField] private bool enablePulsing = true;
        [SerializeField] private float pulseMinScale = 0.9f;
        [SerializeField] private float pulseMaxScale = 1.1f;
        [SerializeField] private float pulseSpeed = 1.5f;

        [SerializeField] private bool enableRotation = false;
        [SerializeField] private float rotationSpeed = 30f;

        [Header("Fade Settings")]
        [SerializeField] private bool enableDistanceFade = true;
        [SerializeField] private float fadeStartDistance = 20f;
        [SerializeField] private float fadeEndDistance = 40f;

        [Header("Billboard Settings")]
        [Tooltip("Make arrow always face camera on Y axis")]
        [SerializeField] private bool billboardY = false;

        [Header("Glow Effect")]
        [SerializeField] private bool enableGlow = true;
        [SerializeField] private Color glowColor = new Color(0f, 1f, 0.5f, 1f);
        [SerializeField] private float glowIntensity = 2f;
        #endregion

        #region Private Fields
        private Vector3 _initialPosition;
        private Vector3 _initialScale;
        private float _bobOffset;
        private Renderer _renderer;
        private MaterialPropertyBlock _propBlock;
        private Camera _mainCamera;
        private static readonly int EmissionColorID = Shader.PropertyToID("_EmissionColor");
        private static readonly int BaseColorID = Shader.PropertyToID("_BaseColor");
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            _initialPosition = transform.localPosition;
            _initialScale = transform.localScale;
            _renderer = GetComponentInChildren<Renderer>();
            _propBlock = new MaterialPropertyBlock();
            _mainCamera = Camera.main;
            _bobOffset = Random.Range(0f, Mathf.PI * 2f); // Randomize phase

            if (enableGlow && _renderer != null)
            {
                SetupGlow();
            }
        }

        private void Update()
        {
            if (enableBobbing)
                ApplyBobbing();

            if (enablePulsing)
                ApplyPulsing();

            if (enableRotation)
                ApplyRotation();

            if (billboardY)
                ApplyBillboard();

            if (enableDistanceFade)
                ApplyDistanceFade();
        }
        #endregion

        #region Animation Methods
        private void ApplyBobbing()
        {
            float yOffset = Mathf.Sin((Time.time * bobSpeed) + _bobOffset) * bobHeight;
            Vector3 newPos = _initialPosition;
            newPos.y += yOffset;
            transform.localPosition = newPos;
        }

        private void ApplyPulsing()
        {
            float scale = Mathf.Lerp(pulseMinScale, pulseMaxScale, 
                (Mathf.Sin(Time.time * pulseSpeed) + 1f) * 0.5f);
            transform.localScale = _initialScale * scale;
        }

        private void ApplyRotation()
        {
            transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime, Space.World);
        }

        private void ApplyBillboard()
        {
            if (_mainCamera == null) return;

            Vector3 lookDir = _mainCamera.transform.position - transform.position;
            lookDir.y = 0; // Only rotate on Y axis
            
            if (lookDir.sqrMagnitude > 0.01f)
            {
                transform.rotation = Quaternion.LookRotation(-lookDir);
            }
        }

        private void ApplyDistanceFade()
        {
            if (_renderer == null || _mainCamera == null) return;

            float distance = Vector3.Distance(transform.position, _mainCamera.transform.position);
            float alpha = 1f;

            if (distance > fadeStartDistance)
            {
                alpha = 1f - Mathf.Clamp01((distance - fadeStartDistance) / (fadeEndDistance - fadeStartDistance));
            }

            _renderer.GetPropertyBlock(_propBlock);
            Color currentColor = _propBlock.GetColor(BaseColorID);
            currentColor.a = alpha;
            _propBlock.SetColor(BaseColorID, currentColor);
            _renderer.SetPropertyBlock(_propBlock);
        }

        private void SetupGlow()
        {
            if (_renderer == null) return;

            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetColor(EmissionColorID, glowColor * glowIntensity);
            _renderer.SetPropertyBlock(_propBlock);
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Set the arrow color
        /// </summary>
        public void SetColor(Color color)
        {
            if (_renderer == null) return;

            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetColor(BaseColorID, color);
            _renderer.SetPropertyBlock(_propBlock);
        }

        /// <summary>
        /// Set glow color and intensity
        /// </summary>
        public void SetGlow(Color color, float intensity)
        {
            glowColor = color;
            glowIntensity = intensity;
            SetupGlow();
        }

        /// <summary>
        /// Point the arrow in a specific direction
        /// </summary>
        public void SetDirection(Vector3 direction)
        {
            if (direction.sqrMagnitude > 0.01f)
            {
                transform.rotation = Quaternion.LookRotation(direction);
            }
        }

        /// <summary>
        /// Set visibility with smooth fade
        /// </summary>
        public void SetVisible(bool visible)
        {
            gameObject.SetActive(visible);
        }
        #endregion
    }
}


using UnityEngine;
using TMPro;

namespace SSCNavigation.AR
{
    /// <summary>
    /// AR Label Controller - Floating label for building/POI information
    /// Attach to a prefab with TextMeshPro component
    /// </summary>
    public class ARLabelController : MonoBehaviour
    {
        #region Settings
        [Header("Components")]
        [SerializeField] private TextMeshPro labelText;
        [SerializeField] private SpriteRenderer backgroundSprite;
        [SerializeField] private SpriteRenderer iconSprite;

        [Header("Display Settings")]
        [SerializeField] private float minScale = 0.5f;
        [SerializeField] private float maxScale = 2f;
        [SerializeField] private float scaleDistance = 50f;

        [Header("Billboard")]
        [SerializeField] private bool faceCamera = true;

        [Header("Distance Display")]
        [SerializeField] private bool showDistance = true;
        [SerializeField] private string distanceFormat = "{0}\n{1:F0}m away";

        [Header("Visibility")]
        [SerializeField] private float maxVisibleDistance = 100f;
        [SerializeField] private bool fadeWithDistance = true;
        #endregion

        #region Properties
        public string LabelName { get; private set; }
        public string Description { get; private set; }
        public float Distance { get; private set; }
        #endregion

        #region Private Fields
        private Camera _mainCamera;
        private Vector3 _initialScale;
        private CanvasGroup _canvasGroup;
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            _mainCamera = Camera.main;
            _initialScale = transform.localScale;

            if (labelText == null)
                labelText = GetComponentInChildren<TextMeshPro>();
        }

        private void Update()
        {
            if (_mainCamera == null) return;

            UpdateDistance();

            if (faceCamera)
                FaceCamera();

            UpdateScale();
            UpdateVisibility();
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Set the label text and info
        /// </summary>
        public void SetLabel(string name, string description = null)
        {
            LabelName = name;
            Description = description;
            UpdateLabelText();
        }

        /// <summary>
        /// Set the label icon
        /// </summary>
        public void SetIcon(Sprite icon)
        {
            if (iconSprite != null)
            {
                iconSprite.sprite = icon;
                iconSprite.gameObject.SetActive(icon != null);
            }
        }

        /// <summary>
        /// Set label colors
        /// </summary>
        public void SetColors(Color textColor, Color backgroundColor)
        {
            if (labelText != null)
                labelText.color = textColor;

            if (backgroundSprite != null)
                backgroundSprite.color = backgroundColor;
        }

        /// <summary>
        /// Set the world position
        /// </summary>
        public void SetPosition(Vector3 worldPosition)
        {
            transform.position = worldPosition;
        }
        #endregion

        #region Private Methods
        private void UpdateDistance()
        {
            if (_mainCamera == null) return;
            Distance = Vector3.Distance(transform.position, _mainCamera.transform.position);
            
            if (showDistance)
                UpdateLabelText();
        }

        private void UpdateLabelText()
        {
            if (labelText == null) return;

            if (showDistance && Distance > 0)
            {
                labelText.text = string.Format(distanceFormat, LabelName, Distance);
            }
            else
            {
                labelText.text = LabelName;
            }
        }

        private void FaceCamera()
        {
            if (_mainCamera == null) return;

            // Face camera but stay upright
            Vector3 lookDir = _mainCamera.transform.position - transform.position;
            lookDir.y = 0;
            
            if (lookDir.sqrMagnitude > 0.01f)
            {
                transform.rotation = Quaternion.LookRotation(-lookDir);
            }
        }

        private void UpdateScale()
        {
            // Scale based on distance so text remains readable
            float t = Mathf.Clamp01(Distance / scaleDistance);
            float scale = Mathf.Lerp(minScale, maxScale, t);
            transform.localScale = _initialScale * scale;
        }

        private void UpdateVisibility()
        {
            bool visible = Distance <= maxVisibleDistance;
            
            if (fadeWithDistance && visible)
            {
                float alpha = 1f - Mathf.Clamp01((Distance - maxVisibleDistance * 0.7f) / (maxVisibleDistance * 0.3f));
                
                if (labelText != null)
                {
                    var color = labelText.color;
                    color.a = alpha;
                    labelText.color = color;
                }

                if (backgroundSprite != null)
                {
                    var color = backgroundSprite.color;
                    color.a = alpha * 0.8f;
                    backgroundSprite.color = color;
                }
            }

            // Could also set gameObject.SetActive(visible) but fading is smoother
        }
        #endregion
    }
}


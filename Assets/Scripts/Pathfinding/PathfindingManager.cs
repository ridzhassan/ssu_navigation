using System;
using System.Collections.Generic;
using UnityEngine;

namespace SSCNavigation.Pathfinding
{
    /// <summary>
    /// Pathfinding Manager - A* algorithm implementation for campus navigation
    /// Manages navigation graph and calculates optimal routes
    /// </summary>
    public class PathfindingManager : MonoBehaviour
    {
        #region Singleton
        public static PathfindingManager Instance { get; private set; }
        #endregion

        #region Settings
        [Header("Pathfinding Settings")]
        [Tooltip("Grid cell size for node generation (meters)")]
        [SerializeField] private float gridCellSize = 5f;
        
        [Tooltip("Maximum path calculation iterations")]
        [SerializeField] private int maxIterations = 1000;
        
        [Tooltip("Diagonal movement cost multiplier")]
        [SerializeField] private float diagonalCost = 1.414f;

        [Header("Path Smoothing")]
        [SerializeField] private bool smoothPath = true;
        [SerializeField] private int smoothingIterations = 2;

        [Header("Debug")]
        [SerializeField] private bool showDebugGizmos = false;
        [SerializeField] private Color pathColor = Color.green;
        #endregion

        #region Properties
        /// <summary>Navigation nodes in the campus</summary>
        public List<PathNode> NavigationNodes { get; private set; } = new List<PathNode>();
        
        /// <summary>Last calculated path</summary>
        public List<PathNode> LastPath { get; private set; }
        #endregion

        #region Private Fields
        private Dictionary<Vector2Int, PathNode> _nodeGrid = new Dictionary<Vector2Int, PathNode>();
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

        private void OnDrawGizmos()
        {
            if (!showDebugGizmos) return;

            // Draw nodes
            Gizmos.color = Color.cyan;
            foreach (var node in NavigationNodes)
            {
                Gizmos.DrawWireSphere(node.Position, 0.5f);
            }

            // Draw last path
            if (LastPath != null && LastPath.Count > 1)
            {
                Gizmos.color = pathColor;
                for (int i = 0; i < LastPath.Count - 1; i++)
                {
                    Gizmos.DrawLine(LastPath[i].Position, LastPath[i + 1].Position);
                }
            }
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Find path from start to end position using A* algorithm
        /// </summary>
        public List<PathNode> FindPath(Vector3 startPos, Vector3 endPos)
        {
            // Create start and end nodes
            PathNode startNode = new PathNode
            {
                Position = startPos,
                NodeType = PathNodeType.Waypoint
            };

            PathNode endNode = new PathNode
            {
                Position = endPos,
                NodeType = PathNodeType.Destination
            };

            // If no navigation nodes, create direct path with intermediate points
            if (NavigationNodes.Count == 0)
            {
                LastPath = CreateDirectPath(startPos, endPos);
                return LastPath;
            }

            // Find nearest nodes to start and end
            PathNode nearestToStart = FindNearestNode(startPos);
            PathNode nearestToEnd = FindNearestNode(endPos);

            if (nearestToStart == null || nearestToEnd == null)
            {
                LastPath = CreateDirectPath(startPos, endPos);
                return LastPath;
            }

            // Run A* algorithm
            var path = AStar(nearestToStart, nearestToEnd);

            if (path == null || path.Count == 0)
            {
                LastPath = CreateDirectPath(startPos, endPos);
                return LastPath;
            }

            // Add actual start and end positions
            path.Insert(0, startNode);
            path.Add(endNode);

            // Smooth path if enabled
            if (smoothPath)
            {
                path = SmoothPath(path);
            }

            LastPath = path;
            Debug.Log($"[Pathfinding] Found path with {path.Count} nodes");
            return path;
        }

        /// <summary>
        /// Add a navigation node to the graph
        /// </summary>
        public void AddNode(PathNode node)
        {
            if (!NavigationNodes.Contains(node))
            {
                NavigationNodes.Add(node);
                UpdateNodeConnections(node);
            }
        }

        /// <summary>
        /// Add multiple nodes from POI data
        /// </summary>
        public void AddNodesFromPOIs(List<Network.POIData> pois, Location.GPSManager gpsManager)
        {
            foreach (var poi in pois)
            {
                var position = gpsManager.GPSToUnityPosition(poi.Latitude, poi.Longitude);
                var node = new PathNode
                {
                    Position = position,
                    NodeType = PathNodeType.POI,
                    POIData = poi
                };
                AddNode(node);
            }
        }

        /// <summary>
        /// Generate a grid of walkable nodes between two points
        /// </summary>
        public void GenerateGrid(Vector3 minBounds, Vector3 maxBounds, float cellSize = -1)
        {
            if (cellSize <= 0) cellSize = gridCellSize;

            _nodeGrid.Clear();

            for (float x = minBounds.x; x <= maxBounds.x; x += cellSize)
            {
                for (float z = minBounds.z; z <= maxBounds.z; z += cellSize)
                {
                    Vector3 pos = new Vector3(x, 0, z);
                    
                    // Check if position is walkable (not inside obstacle)
                    if (IsWalkable(pos))
                    {
                        var node = new PathNode
                        {
                            Position = pos,
                            NodeType = PathNodeType.Waypoint
                        };
                        
                        Vector2Int gridPos = WorldToGrid(pos);
                        _nodeGrid[gridPos] = node;
                        NavigationNodes.Add(node);
                    }
                }
            }

            // Connect adjacent nodes
            foreach (var kvp in _nodeGrid)
            {
                ConnectToNeighbors(kvp.Key, kvp.Value);
            }

            Debug.Log($"[Pathfinding] Generated grid with {NavigationNodes.Count} nodes");
        }

        /// <summary>
        /// Clear all navigation nodes
        /// </summary>
        public void ClearNodes()
        {
            NavigationNodes.Clear();
            _nodeGrid.Clear();
            LastPath = null;
        }

        /// <summary>
        /// Find the nearest node to a position
        /// </summary>
        public PathNode FindNearestNode(Vector3 position)
        {
            PathNode nearest = null;
            float minDistance = float.MaxValue;

            foreach (var node in NavigationNodes)
            {
                float dist = Vector3.Distance(position, node.Position);
                if (dist < minDistance)
                {
                    minDistance = dist;
                    nearest = node;
                }
            }

            return nearest;
        }
        #endregion

        #region A* Algorithm
        private List<PathNode> AStar(PathNode start, PathNode end)
        {
            var openSet = new List<PathNode> { start };
            var closedSet = new HashSet<PathNode>();
            var cameFrom = new Dictionary<PathNode, PathNode>();
            var gScore = new Dictionary<PathNode, float>();
            var fScore = new Dictionary<PathNode, float>();

            gScore[start] = 0;
            fScore[start] = Heuristic(start, end);

            int iterations = 0;

            while (openSet.Count > 0 && iterations < maxIterations)
            {
                iterations++;

                // Get node with lowest fScore
                PathNode current = GetLowestFScore(openSet, fScore);

                // Check if we reached the goal
                if (current == end || Vector3.Distance(current.Position, end.Position) < gridCellSize)
                {
                    return ReconstructPath(cameFrom, current);
                }

                openSet.Remove(current);
                closedSet.Add(current);

                // Check neighbors
                foreach (var neighbor in GetNeighbors(current))
                {
                    if (closedSet.Contains(neighbor)) continue;

                    float tentativeG = gScore.GetValueOrDefault(current, float.MaxValue) +
                                       Vector3.Distance(current.Position, neighbor.Position);

                    if (!openSet.Contains(neighbor))
                    {
                        openSet.Add(neighbor);
                    }
                    else if (tentativeG >= gScore.GetValueOrDefault(neighbor, float.MaxValue))
                    {
                        continue;
                    }

                    cameFrom[neighbor] = current;
                    gScore[neighbor] = tentativeG;
                    fScore[neighbor] = tentativeG + Heuristic(neighbor, end);
                }
            }

            Debug.LogWarning($"[Pathfinding] A* reached max iterations ({iterations})");
            return null;
        }

        private float Heuristic(PathNode a, PathNode b)
        {
            // Use Euclidean distance as heuristic
            return Vector3.Distance(a.Position, b.Position);
        }

        private PathNode GetLowestFScore(List<PathNode> openSet, Dictionary<PathNode, float> fScore)
        {
            PathNode lowest = openSet[0];
            float lowestScore = fScore.GetValueOrDefault(lowest, float.MaxValue);

            foreach (var node in openSet)
            {
                float score = fScore.GetValueOrDefault(node, float.MaxValue);
                if (score < lowestScore)
                {
                    lowest = node;
                    lowestScore = score;
                }
            }

            return lowest;
        }

        private List<PathNode> ReconstructPath(Dictionary<PathNode, PathNode> cameFrom, PathNode current)
        {
            var path = new List<PathNode> { current };

            while (cameFrom.ContainsKey(current))
            {
                current = cameFrom[current];
                path.Insert(0, current);
            }

            return path;
        }

        private List<PathNode> GetNeighbors(PathNode node)
        {
            var neighbors = new List<PathNode>();

            // If node has explicit connections, use those
            if (node.Connections != null && node.Connections.Count > 0)
            {
                return node.Connections;
            }

            // Otherwise, find nearby nodes
            foreach (var other in NavigationNodes)
            {
                if (other == node) continue;

                float dist = Vector3.Distance(node.Position, other.Position);
                if (dist <= gridCellSize * diagonalCost * 1.1f) // Allow diagonal
                {
                    // Check if path is clear
                    if (IsPathClear(node.Position, other.Position))
                    {
                        neighbors.Add(other);
                    }
                }
            }

            return neighbors;
        }
        #endregion

        #region Path Utilities
        private List<PathNode> CreateDirectPath(Vector3 start, Vector3 end)
        {
            var path = new List<PathNode>();
            float distance = Vector3.Distance(start, end);
            int segments = Mathf.Max(2, Mathf.CeilToInt(distance / gridCellSize));

            for (int i = 0; i <= segments; i++)
            {
                float t = (float)i / segments;
                Vector3 pos = Vector3.Lerp(start, end, t);
                
                path.Add(new PathNode
                {
                    Position = pos,
                    NodeType = i == segments ? PathNodeType.Destination : PathNodeType.Waypoint
                });
            }

            return path;
        }

        private List<PathNode> SmoothPath(List<PathNode> path)
        {
            if (path.Count < 3) return path;

            for (int iter = 0; iter < smoothingIterations; iter++)
            {
                var smoothed = new List<PathNode> { path[0] };

                for (int i = 1; i < path.Count - 1; i++)
                {
                    // Check if we can skip this node
                    if (IsPathClear(smoothed[smoothed.Count - 1].Position, path[i + 1].Position))
                    {
                        continue; // Skip this node
                    }
                    smoothed.Add(path[i]);
                }

                smoothed.Add(path[path.Count - 1]);
                path = smoothed;
            }

            return path;
        }

        private bool IsWalkable(Vector3 position)
        {
            // Check for obstacles using spherecast
            return !Physics.CheckSphere(position, gridCellSize * 0.4f, LayerMask.GetMask("Obstacle"));
        }

        private bool IsPathClear(Vector3 start, Vector3 end)
        {
            Vector3 direction = end - start;
            float distance = direction.magnitude;
            
            return !Physics.Raycast(start, direction.normalized, distance, LayerMask.GetMask("Obstacle"));
        }

        private Vector2Int WorldToGrid(Vector3 worldPos)
        {
            return new Vector2Int(
                Mathf.RoundToInt(worldPos.x / gridCellSize),
                Mathf.RoundToInt(worldPos.z / gridCellSize)
            );
        }

        private void ConnectToNeighbors(Vector2Int gridPos, PathNode node)
        {
            // 8-directional connections
            int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
            int[] dz = { -1, -1, -1, 0, 0, 1, 1, 1 };

            node.Connections = new List<PathNode>();

            for (int i = 0; i < 8; i++)
            {
                Vector2Int neighborPos = new Vector2Int(gridPos.x + dx[i], gridPos.y + dz[i]);
                
                if (_nodeGrid.TryGetValue(neighborPos, out PathNode neighbor))
                {
                    node.Connections.Add(neighbor);
                }
            }
        }

        private void UpdateNodeConnections(PathNode node)
        {
            // Connect to nearby nodes
            node.Connections = new List<PathNode>();

            foreach (var other in NavigationNodes)
            {
                if (other == node) continue;

                float dist = Vector3.Distance(node.Position, other.Position);
                if (dist <= gridCellSize * 3f && IsPathClear(node.Position, other.Position))
                {
                    node.Connections.Add(other);
                    
                    // Bidirectional connection
                    if (other.Connections == null)
                        other.Connections = new List<PathNode>();
                    
                    if (!other.Connections.Contains(node))
                        other.Connections.Add(node);
                }
            }
        }
        #endregion
    }

    /// <summary>
    /// Path node data structure
    /// </summary>
    [Serializable]
    public class PathNode
    {
        public Vector3 Position;
        public PathNodeType NodeType;
        public List<PathNode> Connections;
        public Network.POIData POIData;

        // A* temp values
        [NonSerialized] public float GCost;
        [NonSerialized] public float HCost;
        [NonSerialized] public PathNode Parent;

        public float FCost => GCost + HCost;
    }

    /// <summary>
    /// Types of path nodes
    /// </summary>
    public enum PathNodeType
    {
        Waypoint,
        Intersection,
        POI,
        Destination,
        Entrance
    }
}


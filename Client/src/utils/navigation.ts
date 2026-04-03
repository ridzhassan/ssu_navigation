import { GraphNode } from '../constants/mapMatrix'

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate bearing between two coordinates
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  let bearing = Math.atan2(y, x)
  bearing = toDeg(bearing)
  return (bearing + 360) % 360
}

/**
 * Get human-readable direction text
 */
export function getDirectionText(heading: number, bearing: number): string {
  const diff = ((bearing - heading + 360) % 360)
  
  if (diff < 20 || diff > 340) {
    return 'Continue straight ahead'
  } else if (diff >= 20 && diff < 70) {
    return 'Bear slightly right'
  } else if (diff >= 70 && diff < 110) {
    return 'Turn right'
  } else if (diff >= 110 && diff < 160) {
    return 'Turn sharp right'
  } else if (diff >= 160 && diff < 200) {
    return 'Turn around'
  } else if (diff >= 200 && diff < 250) {
    return 'Turn sharp left'
  } else if (diff >= 250 && diff < 290) {
    return 'Turn left'
  } else {
    return 'Bear slightly left'
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  } else {
    return `${(meters / 1000).toFixed(1)} km`
  }
}

/**
 * Estimate walking time in minutes
 * Assumes walking speed of 5 km/h (83.3 m/min)
 */
export function estimateWalkingTime(meters: number): number {
  return Math.ceil(meters / 83.3)
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

// Helper functions
function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function toDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

// ---------------------------------------------------------------------------
// Map-matrix pathfinding
// ---------------------------------------------------------------------------

/**
 * Find the graph node closest to the given coordinate.
 */
export function findNearestNode(nodes: GraphNode[], lat: number, lng: number): GraphNode {
  let nearest = nodes[0]
  let minDist = Infinity
  for (const node of nodes) {
    const d = calculateDistance(lat, lng, node.lat, node.lng)
    if (d < minDist) {
      minDist = d
      nearest = node
    }
  }
  return nearest
}

/**
 * Dijkstra's shortest-path algorithm on the campus graph.
 * @returns Ordered array of node IDs forming the shortest path,
 *          or an empty array if no path exists.
 */
export function dijkstra(
  nodes: GraphNode[],
  edges: [number, number][],
  startId: number,
  endId: number
): number[] {
  // Build adjacency list
  const adj = new Map<number, number[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const [a, b] of edges) {
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }

  const nodeById = new Map<number, GraphNode>()
  for (const node of nodes) nodeById.set(node.id, node)

  const dist = new Map<number, number>()
  const prev = new Map<number, number | null>()
  const unvisited = new Set<number>()

  for (const node of nodes) {
    dist.set(node.id, node.id === startId ? 0 : Infinity)
    prev.set(node.id, null)
    unvisited.add(node.id)
  }

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest tentative distance
    let current: number | null = null
    let minD = Infinity
    for (const id of unvisited) {
      const d = dist.get(id)!
      if (d < minD) { minD = d; current = id }
    }

    if (current === null || minD === Infinity) break
    if (current === endId) break

    unvisited.delete(current)

    const curNode = nodeById.get(current)!
    for (const neighborId of adj.get(current) ?? []) {
      if (!unvisited.has(neighborId)) continue
      const nbNode = nodeById.get(neighborId)!
      const edgeCost = calculateDistance(curNode.lat, curNode.lng, nbNode.lat, nbNode.lng)
      const alt = dist.get(current)! + edgeCost
      if (alt < dist.get(neighborId)!) {
        dist.set(neighborId, alt)
        prev.set(neighborId, current)
      }
    }
  }

  // Reconstruct path
  const path: number[] = []
  let cur: number | null = endId
  while (cur !== null) {
    path.unshift(cur)
    cur = prev.get(cur) ?? null
  }

  // Return empty if path didn't reach start (disconnected graph)
  if (path[0] !== startId) return []
  return path
}

/**
 * Convert a node-ID path from dijkstra() into [lat, lng] waypoints.
 */
export function pathToWaypoints(
  nodes: GraphNode[],
  nodeIds: number[]
): [number, number][] {
  const nodeById = new Map<number, GraphNode>()
  for (const node of nodes) nodeById.set(node.id, node)
  return nodeIds
    .map(id => nodeById.get(id))
    .filter((n): n is GraphNode => n !== undefined)
    .map(n => [n.lat, n.lng])
}


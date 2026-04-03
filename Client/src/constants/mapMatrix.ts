/**
 * SSC Campus Navigation Graph (Map Matrix)
 *
 * Represents the walkable path network of Sulu State College as a graph:
 *  - GraphNode: a point on the campus (intersection, POI, or entrance)
 *  - CAMPUS_GRAPH_EDGES: undirected connections between nodes
 *
 * Coordinates are centred on the SSC campus in Jolo, Sulu.
 * Campus centre reference: [6.051051865873037, 121.01298063248167]
 * Admin Building reference: [6.051607934623702, 121.01233231292177]
 */

export interface GraphNode {
  id: number
  name: string
  lat: number
  lng: number
  type: 'poi' | 'intersection' | 'entrance'
}

// ---------------------------------------------------------------------------
// Campus navigation nodes
// ---------------------------------------------------------------------------
export const CAMPUS_GRAPH_NODES: GraphNode[] = [
  // ── Entrances ───────────────────────────────────────────────────────────
  { id: 0,  name: 'Main Gate',                lat: 6.05400, lng: 121.01205, type: 'entrance' },
  { id: 1,  name: 'Guard House Junction',     lat: 6.05378, lng: 121.01218, type: 'intersection' },

  // ── Admin / North Zone ──────────────────────────────────────────────────
  { id: 2,  name: 'Administration Building',  lat: 6.05161, lng: 121.01233, type: 'poi' },
  { id: 3,  name: 'Registrar Office',         lat: 6.05175, lng: 121.01222, type: 'poi' },
  { id: 4,  name: 'Cashier Office',           lat: 6.05170, lng: 121.01245, type: 'poi' },
  { id: 5,  name: 'Clinic',                   lat: 6.05155, lng: 121.01215, type: 'poi' },

  // ── Core Intersections ──────────────────────────────────────────────────
  { id: 6,  name: 'North Junction',           lat: 6.05340, lng: 121.01240, type: 'intersection' },
  { id: 7,  name: 'Central Junction',         lat: 6.05240, lng: 121.01260, type: 'intersection' },
  { id: 8,  name: 'Mid-East Junction',        lat: 6.05200, lng: 121.01310, type: 'intersection' },
  { id: 9,  name: 'Campus Core',              lat: 6.05105, lng: 121.01298, type: 'intersection' },
  { id: 10, name: 'South Junction',           lat: 6.05020, lng: 121.01280, type: 'intersection' },
  { id: 11, name: 'West Junction',            lat: 6.05080, lng: 121.01200, type: 'intersection' },

  // ── Academic Buildings ───────────────────────────────────────────────────
  { id: 12, name: 'College of Computer Studies', lat: 6.05220, lng: 121.01355, type: 'poi' },
  { id: 13, name: 'Computer Laboratory 1',       lat: 6.05230, lng: 121.01370, type: 'poi' },
  { id: 14, name: 'Computer Laboratory 2',       lat: 6.05215, lng: 121.01380, type: 'poi' },
  { id: 15, name: 'Faculty Office – CCS',        lat: 6.05208, lng: 121.01360, type: 'poi' },
  { id: 16, name: 'College of Education',        lat: 6.05190, lng: 121.01350, type: 'poi' },
  { id: 17, name: 'College of Arts & Sciences',  lat: 6.05170, lng: 121.01330, type: 'poi' },
  { id: 18, name: 'Science Laboratory',          lat: 6.05160, lng: 121.01345, type: 'poi' },
  { id: 19, name: 'East Academic Junction',      lat: 6.05200, lng: 121.01330, type: 'intersection' },

  // ── Library & Support ────────────────────────────────────────────────────
  { id: 20, name: 'Main Library',            lat: 6.05095, lng: 121.01330, type: 'poi' },
  { id: 21, name: 'Library Junction',        lat: 6.05090, lng: 121.01310, type: 'intersection' },

  // ── Student Services ─────────────────────────────────────────────────────
  { id: 22, name: 'Student Center',          lat: 6.05100, lng: 121.01230, type: 'poi' },
  { id: 23, name: 'Main Canteen',            lat: 6.05070, lng: 121.01220, type: 'poi' },

  // ── Sports Zone ──────────────────────────────────────────────────────────
  { id: 24, name: 'Gymnasium',               lat: 6.05030, lng: 121.01310, type: 'poi' },
  { id: 25, name: 'Sports Ground Junction',  lat: 6.05010, lng: 121.01295, type: 'intersection' },
]

// ---------------------------------------------------------------------------
// Undirected edges — each [a, b] means a path exists between nodes a and b
// ---------------------------------------------------------------------------
export const CAMPUS_GRAPH_EDGES: [number, number][] = [
  // Entry corridor
  [0, 1],
  [1, 6],

  // North zone to admin
  [6, 3],   // North Jct → Registrar
  [6, 7],   // North Jct → Central Jct
  [3, 2],   // Registrar → Admin Building
  [3, 4],   // Registrar → Cashier
  [2, 5],   // Admin → Clinic
  [2, 7],   // Admin → Central Jct

  // Central to academic east
  [7, 8],   // Central → Mid-East Jct
  [7, 9],   // Central → Campus Core
  [8, 19],  // Mid-East → East Academic Jct
  [8, 12],  // Mid-East → CCS (short-cut)

  // Academic cluster
  [19, 12], // East Academic Jct → CCS
  [19, 16], // East Academic Jct → Education
  [19, 17], // East Academic Jct → Arts & Sciences
  [12, 13], // CCS → Lab 1
  [12, 15], // CCS → Faculty Office
  [13, 14], // Lab 1 → Lab 2
  [16, 17], // Education → Arts
  [17, 18], // Arts → Science Lab

  // Campus core to south
  [9, 21],  // Campus Core → Library Jct
  [9, 11],  // Campus Core → West Jct
  [21, 20], // Library Jct → Library
  [21, 10], // Library Jct → South Jct

  // South / sports
  [10, 24], // South Jct → Gymnasium
  [10, 25], // South Jct → Sports Ground
  [24, 25], // Gymnasium → Sports Ground

  // West / student services
  [11, 22], // West Jct → Student Center
  [11, 23], // West Jct → Canteen
  [22, 23], // Student Center → Canteen
  [23, 10], // Canteen → South Jct

  // Connect east academic back to campus core
  [17, 9],  // Arts → Campus Core
]

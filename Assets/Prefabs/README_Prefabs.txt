AR NAVIGATION PREFABS
=====================

This folder should contain prefabs for the AR navigation system.

Required Prefabs:
-----------------

1. ARArrow.prefab
   - 3D arrow model (cone + cylinder, or custom mesh)
   - ARArrowController.cs attached
   - Collider (optional, for interaction)
   - Configured material with glow
   
   Hierarchy:
   ARArrow (Empty GameObject)
   └── ArrowMesh (3D model)
       └── Material: ArrowMaterial

2. DestinationMarker.prefab
   - Visible marker for destination
   - ARLabelController.cs attached
   - TextMeshPro 3D text for label
   
   Hierarchy:
   DestinationMarker (Empty)
   ├── MarkerMesh (Cylinder or Pin model)
   ├── Glow (Particle system, optional)
   └── Label (TextMeshPro 3D)

3. WaypointMarker.prefab (Optional)
   - Smaller marker for intermediate points
   - Simple sphere or ring

4. POIMarker.prefab
   - Map marker for POI locations
   - Used in 2D map view
   - Button component for interaction

Creating Arrow Prefab:
---------------------

1. Create Empty GameObject "ARArrow"
2. Add child: 3D Object > Cone (rotate to point forward)
3. Or import custom arrow 3D model
4. Apply ArrowMaterial
5. Add ARArrowController.cs to root
6. Configure settings:
   - Enable Bobbing: true
   - Bob Height: 0.1
   - Enable Pulsing: true
   - Enable Glow: true
   - Glow Color: Green
7. Drag to Prefabs folder

Creating Marker Prefab:
----------------------

1. Create Empty GameObject "DestinationMarker"
2. Add child: 3D Object > Cylinder (scaled down)
3. Add child: 3D Object > Sphere on top (optional)
4. Add ARLabelController.cs to root
5. Add TextMeshPro 3D text as child
6. Configure label settings
7. Drag to Prefabs folder

Scale Guidelines:
-----------------
- Arrows: 0.5m - 1m in size
- Destination Marker: 1m - 2m tall
- Adjust based on testing in AR

Performance Tips:
-----------------
- Keep polygon count low
- Use mobile-optimized shaders
- Limit particle effects
- Pool and reuse arrows when possible


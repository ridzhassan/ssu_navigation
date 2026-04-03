UNITY SCENES
============

This folder should contain the main Unity scenes for the application.

Required Scenes:
----------------

1. MainMenu.unity
   - Entry point of the application
   - Contains: UI Canvas, GameManager, NetworkManager
   - Features: Building selection, map view, search
   
2. ARNavigation.unity
   - AR navigation scene
   - Contains: AR Session, AR Camera, Navigation system
   - Features: AR arrows, compass, distance display

Scene Setup Instructions:
-------------------------

MAIN MENU SCENE:
1. Create new scene: File > New Scene
2. Save as: MainMenu.unity
3. Add GameObjects:
   - GameManager (attach GameManager.cs)
   - GPSManager (attach GPSManager.cs)
   - CompassManager (attach CompassManager.cs)
   - NetworkManager (attach NetworkManager.cs)
   - PathfindingManager (attach PathfindingManager.cs)
4. Create UI Canvas:
   - Canvas Scaler: Scale With Screen Size (1080x1920)
   - Add UI elements (see UIManager.cs references)
5. Add EventSystem

AR NAVIGATION SCENE:
1. Create new scene: File > New Scene
2. Save as: ARNavigation.unity
3. Delete default camera
4. Add AR Foundation objects:
   - Right-click > XR > AR Session
   - Right-click > XR > AR Session Origin
5. Configure AR Session Origin:
   - Add AR Raycast Manager component
   - Add AR Plane Manager component (optional)
6. Add NavigationManager GameObject:
   - Attach ARNavigationManager.cs
   - Assign prefab references
7. Create Navigation UI Canvas
8. Add EventSystem

Build Settings:
---------------
1. File > Build Settings
2. Add both scenes
3. MainMenu should be index 0
4. ARNavigation should be index 1

Scene Transitions:
------------------
GameManager handles scene loading:
- LoadMainMenu() - loads MainMenu scene
- LoadARNavigation() - loads AR scene


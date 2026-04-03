AR NAVIGATION MATERIALS
=======================

This folder should contain Unity materials for the AR navigation system.

Required Materials:
------------------

1. ArrowMaterial.mat
   - Shader: URP/Lit or URP/Unlit
   - Color: Bright green (#00FF7F) or custom
   - Emission: Enabled for glow effect
   - Rendering: Transparent if using fade

2. MarkerMaterial.mat
   - Shader: URP/Lit
   - Color: Orange/Yellow for visibility
   - Emission: Optional glow

3. LabelBackgroundMaterial.mat
   - Shader: URP/Unlit
   - Color: Dark with transparency (0.8 alpha)
   - For floating label backgrounds

Creating Materials in Unity:
---------------------------

1. Right-click in Project window
2. Create > Material
3. Name appropriately
4. Select shader (URP/Lit recommended)
5. Configure properties
6. Assign to prefabs

Recommended Shader Settings:
---------------------------

For Arrow (glowing effect):
- Surface Type: Opaque or Transparent
- Base Color: #00FF7F (green)
- Emission: Enabled
- Emission Color: #00FF7F
- Emission Intensity: 2-3

For Labels:
- Surface Type: Transparent
- Base Color: #1E293B with 0.9 alpha
- No emission

Tips:
----
- Use URP shaders for better mobile performance
- Keep materials simple for AR rendering
- Test visibility in various lighting conditions
- Consider adding emission for better visibility


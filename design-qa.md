# Design QA — 收發室牆面修正

- Source visual truth: `/Users/stanley/Desktop/截圖 2026-07-22 上午10.46.05.png`
- Implementation screenshot: `/Users/stanley/Documents/Codex/2026-07-22/new-chat/outputs/three-floor-plan/qa-implementation.png`
- Side-by-side comparison: `http://127.0.0.1:5173/qa-comparison.html`
- State: 3D perspective, focused around Main Entrance / 收發室
- Browser viewport: 1280 × 720 CSS px
- Source pixels: 515 × 333 px
- Implementation pixels: 1280 × 720 px
- Device pixel ratio: 1
- Density normalization: both images displayed with `object-fit: contain` in equal-height comparison panels; judgment focused on the annotated room structure rather than browser chrome.

**Full-view comparison evidence**

- The surrounding floor-plan geometry, lighting, labels, devices, and controls remain unchanged.
- The repaired reception-room boundary is now represented by continuous 3D wall geometry.

**Focused region comparison evidence**

- The source screenshot shows a door leaf, swing arc, hatched frame, and two parallel wall outlines at 收發室.
- The implementation screenshot and live top/3D views show no swing arc or door leaf. The duplicated outline segments were replaced by single top and side wall segments.

**Required fidelity surfaces**

- Fonts and typography: unchanged; existing SVG labels retain their positions, sizes, and `#767676` treatment.
- Spacing and layout rhythm: unchanged outside the repaired SVG coordinate region.
- Colors and visual tokens: existing floor, wall, lighting, device-state, and label colors are unchanged.
- Image quality and asset fidelity: original SVG remains the visual source; only the requested reception-room door symbol region is masked and repaired as geometry.
- Copy and content: unchanged.

**Comparison history**

1. Earlier finding — P1: 收發室 still showed a segmented door swing and frame in the supplied screenshot.
   - Fix: removed all door fragments inside the exact reception-door SVG bounds and added a continuous top wall.
   - Post-fix evidence: live top view showed the swing arc and leaf removed.
2. Earlier finding — P2: the right edge still appeared excessively dark because two source outline segments were converted into overlapping walls.
   - Fix: masked the narrow frame texture and replaced the two parallel side outlines with one centered side wall.
   - Post-fix evidence: `qa-implementation.png` and the side-by-side comparison show continuous wall geometry without the door symbol.

**Findings**

- No remaining P0, P1, or P2 mismatch for the requested reception-room correction.

**Interactions and runtime checks**

- Tested 3D view, Top view, and Reset view.
- Checked browser console errors: none.
- Production build: passed.

**Follow-up Polish**

- None required for this scoped change.

final result: passed

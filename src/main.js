import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const SVG_URL = new URL('../floor-plan.svg', import.meta.url).href;
const SVG_WIDTH = 1443;
const SVG_HEIGHT = 812;
const SCALE = 0.1;
const PLAN_WIDTH = SVG_WIDTH * SCALE;
const PLAN_DEPTH = SVG_HEIGHT * SCALE;
const WALL_HEIGHT = 4.8;
const WALL_THICKNESS = 0.22;
const ROOM_GRID_SIZE = 4;
const ROOM_HIGHLIGHT_COLOR = [255, 228, 143, 92];
const ROOM_HOVER_OVERRIDES = [
  { id: '404', environmentId: 404, x1: 629, y1: 152.6, x2: 704.2, y2: 270.3 },
  { id: '406', environmentId: 406, x1: 629, y1: 39.2, x2: 707.7, y2: 152.6 }
];
const MEETING_ROOM_STORAGE_KEY = 'three-floor-plan-meeting-room-statuses';
const MEETING_ROOM_COLORS = {
  reserved: 0xf39a32,
  occupied: 0x4caf50
};
const MEETING_ROOM_LABELS = {
  reserved: '預約中',
  occupied: '使用中'
};
const MEETING_ROOMS = [
  { id: '401', name: '401-Autumn Room', x1: 704.2, y1: 152.6, x2: 849.6, y2: 270.3 },
  { id: '402', name: '402-Autumn Room', x1: 707.7, y1: 39.2, x2: 834.1, y2: 152.6 },
  { id: '403', name: '403-Autumn Room', x1: 438.4, y1: 168.2, x2: 529.9, y2: 279.2 },
  { id: '404', name: '404-Autumn Room', x1: 629, y1: 152.6, x2: 704.2, y2: 270.3 },
  { id: '405', name: '405-Sky Room', x1: 852.9, y1: 268, x2: 1055.8, y2: 344.5 },
  { id: '406', name: '406-Autumn Room', x1: 629, y1: 39.2, x2: 707.7, y2: 152.6 }
];
const LIGHTING_STORAGE_KEY = 'three-floor-plan-lighting-states';
const CCTV_STORAGE_KEY = 'three-floor-plan-cctv-states';
const CCTV_POSITION_STORAGE_KEY = 'three-floor-plan-cctv-positions';
const LIGHT_TIME_MODE_KEY = 'three-floor-plan-light-time-mode';
const CCTV_DIRECTIONS = {
  n: { label: '北', degrees: 0 },
  ne: { label: '東北', degrees: 45 },
  e: { label: '東', degrees: 90 },
  se: { label: '東南', degrees: 135 },
  s: { label: '南', degrees: 180 },
  sw: { label: '西南', degrees: 225 },
  w: { label: '西', degrees: 270 },
  nw: { label: '西北', degrees: 315 }
};
const LIGHTING_FIXTURES = [
  [286, 143], [470, 112], [660, 112], [790, 112], [930, 170], [1120, 305],
  [1240, 405], [1120, 475], [930, 550], [1030, 665], [820, 660], [610, 620],
  [390, 650], [270, 560], [330, 390], [520, 340], [720, 335], [920, 395]
].map(([svgX, svgY], index) => ({ id: `light-${String(index + 1).padStart(2, '0')}`, label: `照明 ${String(index + 1).padStart(2, '0')}`, svgX, svgY }));
const CCTV_FIXTURES = [
  [560, 130, 'e'], [850, 120, 's'], [1040, 275, 'w'], [1180, 500, 'nw'],
  [900, 610, 'n'], [520, 520, 'se'], [300, 320, 'ne']
].map(([svgX, svgY, direction], index) => ({ id: `cctv-${String(index + 1).padStart(2, '0')}`, label: `CCTV ${String(index + 1).padStart(2, '0')}`, svgX, svgY, direction }));

// Structural diagonal walls that are represented in the source SVG by two
// parallel outline polylines. They need a single solid wall on the centerline.
const STRUCTURAL_DIAGONAL_WALLS = [
  { x1: 529.85, y1: 152.6, x2: 502.5, y2: 279.15, thickness: 0.3 }
];

// The reception room doorway in the source drawing is built from dozens of
// small frame, hatch and swing segments. Replace that symbol with one clean,
// continuous wall instead of trying to classify every fragment as a door.
const RECEPTION_WALL_REPAIR = {
  cleanup: { x: 514.2, y: 387.6, width: 59.2, height: 17.0 },
  frameCleanup: { x: 567.7, y: 403.7, width: 4.7, height: 28.2 },
  wall: { x1: 516.9, y1: 389.95, x2: 571.1, y2: 389.95, thickness: 0.3 },
  sideWall: { x1: 570.0, y1: 404.5, x2: 570.0, y2: 431.1, thickness: 0.3 }
};

const DEVICE_STORAGE_KEY = 'three-floor-plan-device-positions';
const ADDED_DEVICE_STORAGE_KEY = 'three-floor-plan-added-devices';
const DEVICE_COLORS = {
  green: 0x4caf50,
  red: 0xe34c4c,
  gray: 0x8a8d86
};
const DEVICE_CONFIGS = [
  {
    id: 'air-conditioner', svgX: 292, svgY: 154, y: 7.2, type: 'ac', color: 'green', label: '冷氣', location: '總經理室上方',
    data: { name: '總經理室冷氣', energy: '12.6 kWh', runtime: '6 小時 42 分鐘', gateway: '14F-GW-01' }
  },
  {
    id: 'temperature-sensor', svgX: 1040, svgY: 374, y: 3.4, type: 'sensor', color: 'green', label: '溫濕度感應器', location: '擴編主管室左側',
    data: { name: '擴編主管室溫濕度感應器', energy: '0.08 kWh', runtime: '18 天 7 小時', gateway: '14F-GW-02' }
  },
  {
    id: 'sos-emergency', x: 0, z: 0, y: 0.18, type: 'sos', color: 'green', label: 'SOS 緊急設備', location: '畫面中央',
    data: { name: 'SOS 緊急設備', energy: '0.02 kWh', runtime: '待命中', gateway: '14F-GW-SOS' }
  }
];

const REGIONAL_DEVICE_AREAS = [
  { id: 'general-manager', name: '總經理室', svgX: 310, svgY: 137, existing: ['ac'] },
  { id: 'meeting-403', name: '403 會議室', svgX: 480, svgY: 220 },
  { id: 'meeting-402', name: '402 會議室', svgX: 770, svgY: 100 },
  { id: 'meeting-406', name: '406 會議室', svgX: 670, svgY: 72 },
  { id: 'staff-break', name: '員工休息區', svgX: 560, svgY: 205 },
  { id: 'meeting-404', name: '404 會議室', svgX: 665, svgY: 220 },
  { id: 'meeting-401', name: '401 會議室', svgX: 770, svgY: 235 },
  { id: 'meeting-405', name: '405 會議室', svgX: 925, svgY: 315 },
  { id: 'lobby-display', name: '大廳展示區', svgX: 650, svgY: 350 },
  { id: 'expanded-manager', name: '擴編主管室', svgX: 1135, svgY: 320, existing: ['sensor'] },
  { id: 'heat-pipe-north', name: '熱管事業北區', svgX: 330, svgY: 400 },
  { id: 'heat-pipe-south', name: '熱管事業南區', svgX: 330, svgY: 570 },
  { id: 'smart-living', name: '智慧生活事業', svgX: 1080, svgY: 480 },
  { id: 'lab-heat', name: '實驗室熱管理', svgX: 530, svgY: 700 },
  { id: 'lab-smart', name: '實驗室智慧生活', svgX: 900, svgY: 700 },
  { id: 'reception', name: '收發室', svgX: 540, svgY: 415 }
];

const REGIONAL_DEVICE_CONFIGS = REGIONAL_DEVICE_AREAS.flatMap((area, areaIndex) => {
  const gateway = `14F-GW-${String((areaIndex % 4) + 1).padStart(2, '0')}`;
  const configs = [];
  if (!area.existing?.includes('ac')) {
    configs.push({
      id: `regional-${area.id}-ac`,
      svgX: area.svgX - 12,
      svgY: area.svgY - 7,
      y: 5.25,
      type: 'ac',
      compact: true,
      showCard: false,
      color: 'green',
      label: `${area.name}冷氣`,
      location: `${area.name}・區域設備`,
      data: {
        name: `${area.name}冷氣`,
        energy: `${(6.2 + (areaIndex % 5) * 0.8).toFixed(1)} kWh`,
        runtime: `${4 + (areaIndex % 6)} 小時 ${12 + (areaIndex * 7) % 47} 分鐘`,
        gateway
      }
    });
  }
  if (!area.existing?.includes('sensor')) {
    configs.push({
      id: `regional-${area.id}-sensor`,
      svgX: area.svgX + 12,
      svgY: area.svgY + 7,
      y: 2.35,
      type: 'sensor',
      compact: true,
      showCard: false,
      color: 'green',
      label: `${area.name}溫濕度感應器`,
      location: `${area.name}・區域設備`,
      data: {
        name: `${area.name}溫濕度感應器`,
        energy: '0.03 kWh',
        runtime: `${12 + areaIndex} 天 ${areaIndex % 9} 小時`,
        gateway
      }
    });
  }
  return configs;
});

const ADDED_DEVICE_PRESETS = {
  'ac-02': {
    type: 'ac', y: 7.2, color: 'green', label: '冷氣02', location: '畫面中央',
    data: { name: '冷氣02', energy: '0.0 kWh', runtime: '尚未運轉', gateway: '尚未設定' }
  },
  'sensor-02': {
    type: 'sensor', y: 3.4, color: 'green', label: '溫濕度感應器02', location: '畫面中央',
    data: { name: '溫濕度感應器02', energy: '0.0 kWh', runtime: '尚未運轉', gateway: '尚未設定' }
  }
};

const container = document.querySelector('#scene');
const loading = document.querySelector('#loading');

function readLocalSetting(key, fallback = null) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalSetting(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }
}

function readMeetingRoomStates() {
  const defaults = Object.fromEntries(MEETING_ROOMS.map((room) => [room.id, {
    enabled: room.id === '404' || room.id === '406',
    status: room.id === '406' ? 'reserved' : 'occupied'
  }]));
  try {
    const saved = JSON.parse(readLocalSetting(MEETING_ROOM_STORAGE_KEY, '{}'));
    MEETING_ROOMS.forEach((room) => {
      const entry = saved?.[room.id];
      if (!entry || typeof entry.enabled !== 'boolean' || !MEETING_ROOM_COLORS[entry.status]) return;
      defaults[room.id] = { enabled: entry.enabled, status: entry.status };
    });
  } catch {
    // Keep defaults when saved meeting-room settings are unavailable.
  }
  return defaults;
}

function saveMeetingRoomStates() {
  writeLocalSetting(MEETING_ROOM_STORAGE_KEY, JSON.stringify(meetingRoomStates));
}

const meetingRoomStates = readMeetingRoomStates();

function readLightingStates() {
  const defaults = Object.fromEntries(LIGHTING_FIXTURES.map((fixture, index) => [fixture.id, { on: index < 14 }]));
  try {
    const saved = JSON.parse(readLocalSetting(LIGHTING_STORAGE_KEY, '{}'));
    LIGHTING_FIXTURES.forEach((fixture) => {
      if (typeof saved?.[fixture.id]?.on === 'boolean') defaults[fixture.id] = { on: saved[fixture.id].on };
    });
  } catch {
    // Keep lighting defaults when saved settings are unavailable.
  }
  return defaults;
}

function readCctvStates() {
  const defaults = Object.fromEntries(CCTV_FIXTURES.map((fixture, index) => [fixture.id, {
    online: index < 6,
    direction: fixture.direction
  }]));
  try {
    const saved = JSON.parse(readLocalSetting(CCTV_STORAGE_KEY, '{}'));
    CCTV_FIXTURES.forEach((fixture) => {
      const entry = saved?.[fixture.id];
      if (!entry || typeof entry.online !== 'boolean' || !CCTV_DIRECTIONS[entry.direction]) return;
      defaults[fixture.id] = { online: entry.online, direction: entry.direction };
    });
  } catch {
    // Keep CCTV defaults when saved settings are unavailable.
  }
  return defaults;
}

const lightingStates = readLightingStates();
const cctvStates = readCctvStates();

function saveLightingStates() {
  writeLocalSetting(LIGHTING_STORAGE_KEY, JSON.stringify(lightingStates));
}

function saveCctvStates() {
  writeLocalSetting(CCTV_STORAGE_KEY, JSON.stringify(cctvStates));
}

function readSavedCctvPositions() {
  try {
    return JSON.parse(readLocalSetting(CCTV_POSITION_STORAGE_KEY, '{}'));
  } catch {
    return {};
  }
}

const savedCctvPositions = readSavedCctvPositions();

function saveCctvPositions() {
  const positions = {};
  cctvObjects.forEach((object, id) => {
    positions[id] = { x: object.position.x, y: object.position.y, z: object.position.z };
  });
  writeLocalSetting(CCTV_POSITION_STORAGE_KEY, JSON.stringify(positions));
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e8e3);
scene.fog = new THREE.FogExp2(0xe8e8e3, 0.0042);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 800);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const MAX_PIXEL_RATIO = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 1.25 : 1.5;
const RENDER_FPS = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 30 : 45;
renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.tabIndex = 0;
container.appendChild(renderer.domElement);

function invalidateShadows() {
  renderer.shadowMap.needsUpdate = true;
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;
controls.minDistance = 35;
controls.maxDistance = 280;
controls.maxPolarAngle = Math.PI * 0.485;
controls.target.set(0, 0, 0);

let activeViewName = 'perspective';
let pointerOverScene = renderer.domElement.matches(':hover');
let autoRotateActive = false;
let powerSaveActive = false;
let buildingAutoRotateEnabled = true;
let orbitInteractionActive = false;
let buildingAutoZoomBaseDistance = 120;
const BUILDING_AUTO_ZOOM_SPEED = 0.00052;
const BUILDING_AUTO_ZOOM_AMOUNT = 0.14;

function getBuildingAutoZoomPulse(now = performance.now()) {
  return 1 + Math.sin(now * BUILDING_AUTO_ZOOM_SPEED) * BUILDING_AUTO_ZOOM_AMOUNT;
}

function syncBuildingAutoZoomBase(distance = camera.position.distanceTo(controls.target), now = performance.now()) {
  buildingAutoZoomBaseDistance = distance / getBuildingAutoZoomPulse(now);
}

function updateAutoRotate() {
  const rotateBuilding = sceneMode === 'building' && buildingAutoRotateEnabled && !orbitInteractionActive;
  const rotateFloor = activeViewName === 'perspective' && !pointerOverScene;
  autoRotateActive = !powerSaveActive && !animation && (rotateBuilding || rotateFloor);
}

controls.addEventListener('start', () => {
  orbitInteractionActive = true;
  updateAutoRotate();
});

controls.addEventListener('end', () => {
  orbitInteractionActive = false;
  updateAutoRotate();
});

window.addEventListener('pointerover', () => {
  pointerOverScene = true;
  updateAutoRotate();
});

window.addEventListener('pointerout', (event) => {
  if (event.relatedTarget !== null) return;
  pointerOverScene = false;
  updateAutoRotate();
});

document.documentElement.addEventListener('mouseenter', () => {
  pointerOverScene = true;
  updateAutoRotate();
});

document.documentElement.addEventListener('mouseleave', () => {
  pointerOverScene = false;
  updateAutoRotate();
});

const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8f918a, 2.5);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xfffdf5, 3.1);
sun.position.set(-48, 90, 45);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 210;
sun.shadow.bias = -0.00012;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xc8d6ff, 1.2);
fill.position.set(75, 42, -55);
scene.add(fill);

const officeAmbient = new THREE.AmbientLight(0xffe4b5, 0);
scene.add(officeAmbient);

const SCENE_THEMES = {
  building: {
    background: 0xe8e8e3,
    exposure: 1.1,
    hemisphere: 2.5,
    sun: 3.1,
    fill: 1.2
  },
  floor: {
    background: 0xc9cbc6,
    exposure: 0.75,
    hemisphere: 1.05,
    sun: 2.45,
    fill: 0.28
  }
};

function applySceneTheme(mode) {
  const theme = SCENE_THEMES[mode];
  if (!theme) return;
  scene.background.setHex(theme.background);
  scene.fog.color.setHex(theme.background);
  renderer.toneMappingExposure = theme.exposure;
  hemisphere.intensity = theme.hemisphere;
  sun.intensity = theme.sun;
  fill.intensity = theme.fill;
  if (mode === 'building') {
    officeAmbient.intensity = 0;
    sun.color.setHex(0xfffdf5);
    sun.position.set(-48, 90, 45);
    hemisphere.color.setHex(0xffffff);
    hemisphere.groundColor.setHex(0x8f918a);
    fill.color.setHex(0xc8d6ff);
  } else {
    applyTimeLighting();
  }
}

const model = new THREE.Group();
scene.add(model);

const buildingGroup = new THREE.Group();
scene.add(buildingGroup);
let floor14Object = null;
let floor14Targets = [];
let buildingFloorMeshes = [];
let sceneMode = 'building';
let floorWallMaterial = null;

const deviceObjects = new Map();
const meetingRoomVisuals = new Map();
const lightingObjects = new Map();
const cctvObjects = new Map();
const devicePickTargets = [];
const cctvPickTargets = [];
const alertDevices = new Set();
const deviceTooltip = document.querySelector('#device-tooltip');
const roomTooltip = document.querySelector('#room-tooltip');
const cctvModal = document.querySelector('#cctv-modal');
const cctvModalTitle = document.querySelector('#cctv-modal-title');
const cctvModalStatus = document.querySelector('#cctv-modal-status');
const cctvDirectionLabel = document.querySelector('#cctv-direction-label');
const cctvFeedTime = document.querySelector('#cctv-feed-time');
const activeDragDevice = document.querySelector('#active-drag-device');
const activeDragDeviceName = document.querySelector('#active-drag-device-name');
const activeDragDeviceDetail = document.querySelector('#active-drag-device-detail');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const roomHoverPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.04);
const dragPoint = new THREE.Vector3();
let hoveredDevice = null;
let draggingDevice = null;
let deviceDragEnabled = false;
let roomHoverState = null;

function svgPointToWorld(x, y) {
  return new THREE.Vector3(x * SCALE - PLAN_WIDTH / 2, 0, y * SCALE - PLAN_DEPTH / 2);
}

function parsePoints(value) {
  const numbers = value.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const points = [];
  for (let i = 0; i < numbers.length - 1; i += 2) points.push([numbers[i], numbers[i + 1]]);
  return points;
}

function removeDoorSymbols(svg) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none;';
  host.appendChild(svg);
  document.body.appendChild(host);

  const doorArcs = [...svg.querySelectorAll('path.st5')].flatMap((path) => {
    try {
      const box = path.getBBox();
      const length = path.getTotalLength();
      const longestSide = Math.max(box.width, box.height);
      const shortestSide = Math.min(box.width, box.height);
      if (longestSide < 7 || longestSide > 70 || shortestSide < 3) return [];
      return [{
        box,
        endpoints: [path.getPointAtLength(0), path.getPointAtLength(length)]
      }];
    } catch {
      return [];
    }
  });

  const isDoorLeaf = (points) => {
    if (points.length < 2 || points.length > 4) return false;
    const first = points[0];
    const last = points.at(-1);
    const length = Math.hypot(last[0] - first[0], last[1] - first[1]);
    if (length < 7 || length > 65) return false;

    return doorArcs.some(({ box, endpoints }) => {
      const padding = 3;
      const insideRegion = points.every(([x, y]) =>
        x >= box.x - padding && x <= box.x + box.width + padding &&
        y >= box.y - padding && y <= box.y + box.height + padding
      );
      if (!insideRegion) return false;

      return points.some(([x, y]) => endpoints.some((point) => Math.hypot(x - point.x, y - point.y) < 2.2));
    });
  };

  svg.querySelectorAll('line').forEach((line) => {
    const points = [[
      +line.getAttribute('x1'), +line.getAttribute('y1')
    ], [
      +line.getAttribute('x2'), +line.getAttribute('y2')
    ]];
    const length = Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]);
    const isShortDoorPanel = line.classList.contains('st5') && length >= 7 && length <= 30;
    if (isDoorLeaf(points) || isShortDoorPanel) line.remove();
  });

  svg.querySelectorAll('polyline').forEach((polyline) => {
    const points = parsePoints(polyline.getAttribute('points') || '');
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const longestSide = Math.max(width, height);
    const shortestSide = Math.min(width, height);
    const isThinDoorPanel = polyline.classList.contains('st5') && longestSide >= 7 && longestSide <= 32 && shortestSide <= 3;
    if (isDoorLeaf(points) || isThinDoorPanel) polyline.remove();
  });

  svg.querySelectorAll('path.st5').forEach((path) => path.remove());

  const { cleanup, frameCleanup, wall } = RECEPTION_WALL_REPAIR;
  const cleanupRegions = [cleanup, frameCleanup];
  svg.querySelectorAll('line, polyline, polygon, path, rect, circle, ellipse').forEach((node) => {
    if (!node.isConnected) return;
    try {
      const box = node.getBBox();
      const insideReceptionDoor = cleanupRegions.some((region) =>
        box.x >= region.x && box.y >= region.y &&
        box.x + box.width <= region.x + region.width &&
        box.y + box.height <= region.y + region.height
      );
      if (insideReceptionDoor) node.remove();
    } catch {
      // Ignore non-renderable SVG nodes.
    }
  });

  const namespace = 'http://www.w3.org/2000/svg';
  cleanupRegions.forEach((region) => {
    const cover = document.createElementNS(namespace, 'rect');
    cover.setAttribute('x', String(region.x));
    cover.setAttribute('y', String(region.y));
    cover.setAttribute('width', String(region.width));
    cover.setAttribute('height', String(region.height));
    cover.setAttribute('fill', '#d1cec6');
    svg.appendChild(cover);
  });

  const repairedWall = document.createElementNS(namespace, 'line');
  repairedWall.setAttribute('x1', String(wall.x1));
  repairedWall.setAttribute('y1', String(wall.y1));
  repairedWall.setAttribute('x2', String(wall.x2));
  repairedWall.setAttribute('y2', String(wall.y2));
  repairedWall.setAttribute('stroke', '#c9c9c3');
  repairedWall.setAttribute('stroke-width', '2.3');
  repairedWall.setAttribute('stroke-linecap', 'square');
  repairedWall.dataset.wallRepair = 'reception';
  svg.appendChild(repairedWall);
  host.remove();
}

function segmentKey(x1, y1, x2, y2) {
  const a = `${Math.round(x1 * 2)}:${Math.round(y1 * 2)}`;
  const b = `${Math.round(x2 * 2)}:${Math.round(y2 * 2)}`;
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function collectWallSegments(svg) {
  const segments = [];
  const seen = new Set();

  const add = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const axisAligned = Math.min(Math.abs(dx), Math.abs(dy)) < 0.65;
    if (length < 11 || !axisAligned) return;

    const isOldReceptionTopWall =
      Math.abs(dy) < 0.65 && Math.abs((y1 + y2) / 2 - RECEPTION_WALL_REPAIR.wall.y1) < 2 &&
      Math.max(x1, x2) > RECEPTION_WALL_REPAIR.wall.x1 &&
      Math.min(x1, x2) < RECEPTION_WALL_REPAIR.wall.x2;
    const isOldReceptionSideWall =
      Math.abs(dx) < 0.65 && Math.abs((x1 + x2) / 2 - RECEPTION_WALL_REPAIR.sideWall.x1) < 2 &&
      Math.max(y1, y2) > RECEPTION_WALL_REPAIR.sideWall.y1 &&
      Math.min(y1, y2) < RECEPTION_WALL_REPAIR.sideWall.y2;
    if (isOldReceptionTopWall || isOldReceptionSideWall) return;

    const key = segmentKey(x1, y1, x2, y2);
    if (seen.has(key)) return;
    seen.add(key);
    segments.push({ x1, y1, x2, y2, length });
  };

  svg.querySelectorAll('line').forEach((line) => {
    add(+line.getAttribute('x1'), +line.getAttribute('y1'), +line.getAttribute('x2'), +line.getAttribute('y2'));
  });

  svg.querySelectorAll('polyline, polygon').forEach((node) => {
    const points = parsePoints(node.getAttribute('points') || '');
    for (let i = 1; i < points.length; i += 1) add(...points[i - 1], ...points[i]);
    if (node.tagName.toLowerCase() === 'polygon' && points.length > 2) add(...points.at(-1), ...points[0]);
  });

  STRUCTURAL_DIAGONAL_WALLS.forEach((wall) => {
    segments.push({
      ...wall,
      length: Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
    });
  });

  segments.push({
    ...RECEPTION_WALL_REPAIR.wall,
    length: Math.hypot(
      RECEPTION_WALL_REPAIR.wall.x2 - RECEPTION_WALL_REPAIR.wall.x1,
      RECEPTION_WALL_REPAIR.wall.y2 - RECEPTION_WALL_REPAIR.wall.y1
    )
  });
  segments.push({
    ...RECEPTION_WALL_REPAIR.sideWall,
    length: Math.hypot(
      RECEPTION_WALL_REPAIR.sideWall.x2 - RECEPTION_WALL_REPAIR.sideWall.x1,
      RECEPTION_WALL_REPAIR.sideWall.y2 - RECEPTION_WALL_REPAIR.sideWall.y1
    )
  });

  return segments;
}

function createRoomHoverMap(segments) {
  const columns = Math.ceil(SVG_WIDTH / ROOM_GRID_SIZE);
  const rows = Math.ceil(SVG_HEIGHT / ROOM_GRID_SIZE);
  const cellCount = columns * rows;
  const blocked = new Uint8Array(cellCount);
  const markCell = (column, row) => {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return;
    blocked[row * columns + column] = 1;
  };

  segments.forEach((segment) => {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (ROOM_GRID_SIZE * 0.45)));
    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const column = Math.round((segment.x1 + dx * progress) / ROOM_GRID_SIZE);
      const row = Math.round((segment.y1 + dy * progress) / ROOM_GRID_SIZE);
      markCell(column, row);
    }
  });

  // Door openings are short gaps in otherwise continuous wall lines. Closing
  // only small horizontal/vertical gaps keeps each room independently hoverable.
  const closeShortGaps = (lineLength, lineCount, getIndex) => {
    for (let line = 0; line < lineCount; line += 1) {
      let previous = -1;
      for (let position = 0; position < lineLength; position += 1) {
        if (!blocked[getIndex(line, position)]) continue;
        const gap = position - previous - 1;
        if (previous >= 0 && gap > 0 && gap <= 16) {
          for (let fill = previous + 1; fill < position; fill += 1) blocked[getIndex(line, fill)] = 1;
        }
        previous = position;
      }
    }
  };
  closeShortGaps(columns, rows, (row, column) => row * columns + column);
  closeShortGaps(rows, columns, (column, row) => row * columns + column);

  const expanded = blocked.slice();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!blocked[row * columns + column]) continue;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) markExpanded(column + offsetX, row + offsetY);
      }
    }
  }

  function markExpanded(column, row) {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return;
    expanded[row * columns + column] = 1;
  }

  const labels = new Int32Array(cellCount);
  labels.fill(-1);
  const regions = [];
  const queue = new Int32Array(cellCount);
  let regionId = 0;

  for (let start = 0; start < cellCount; start += 1) {
    if (expanded[start] || labels[start] !== -1) continue;
    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    labels[start] = regionId;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const column = index % columns;
      const row = Math.floor(index / columns);
      if (column === 0 || row === 0 || column === columns - 1 || row === rows - 1) touchesEdge = true;
      const neighbors = [index - 1, index + 1, index - columns, index + columns];
      neighbors.forEach((neighbor, direction) => {
        if (direction === 0 && column === 0) return;
        if (direction === 1 && column === columns - 1) return;
        if (neighbor < 0 || neighbor >= cellCount || expanded[neighbor] || labels[neighbor] !== -1) return;
        labels[neighbor] = regionId;
        queue[tail++] = neighbor;
      });
    }

    regions.push({ count: tail, hoverable: !touchesEdge && tail >= 8 });
    regionId += 1;
  }

  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(columns, rows);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(PLAN_WIDTH, PLAN_DEPTH),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    })
  );
  highlight.rotation.x = -Math.PI / 2;
  // Keep the overlay above the floor/label planes so it stays legible from
  // oblique 3D camera angles while walls and devices still occlude it.
  highlight.position.y = 0.08;
  highlight.renderOrder = 2;
  model.add(highlight);

  roomHoverState = { columns, rows, expanded, labels, regions, context, imageData, texture, currentKey: 'none' };
}

function setRoomHighlight(regionId) {
  if (!roomHoverState) return;
  const key = regionId >= 0 ? `region:${regionId}` : 'none';
  if (roomHoverState.currentKey === key) return;
  const { labels, regions, context, imageData, texture } = roomHoverState;
  roomHoverState.currentKey = key;
  imageData.data.fill(0);

  if (regionId >= 0 && regions[regionId]?.hoverable) {
    for (let index = 0; index < labels.length; index += 1) {
      if (labels[index] !== regionId) continue;
      const offset = index * 4;
      imageData.data[offset] = ROOM_HIGHLIGHT_COLOR[0];
      imageData.data[offset + 1] = ROOM_HIGHLIGHT_COLOR[1];
      imageData.data[offset + 2] = ROOM_HIGHLIGHT_COLOR[2];
      imageData.data[offset + 3] = ROOM_HIGHLIGHT_COLOR[3];
    }
  }

  context.putImageData(imageData, 0, 0);
  texture.needsUpdate = true;
}

function setRoomFallback(column, row, regionId) {
  if (!roomHoverState || regionId < 0) {
    setRoomHighlight(-1);
    return;
  }
  const { columns, rows, expanded, labels, context, imageData, texture } = roomHoverState;
  const findBoundary = (stepX, stepY) => {
    for (let distance = 1; distance <= 42; distance += 1) {
      const x = column + stepX * distance;
      const y = row + stepY * distance;
      if (x < 0 || y < 0 || x >= columns || y >= rows) return null;
      if (expanded[y * columns + x]) return { x, y };
    }
    return null;
  };
  const left = findBoundary(-1, 0) || { x: Math.max(0, column - 20), y: row };
  const right = findBoundary(1, 0) || { x: Math.min(columns - 1, column + 20), y: row };
  const top = findBoundary(0, -1) || { x: column, y: Math.max(0, row - 16) };
  const bottom = findBoundary(0, 1) || { x: column, y: Math.min(rows - 1, row + 16) };

  const key = `fallback:${left.x}:${right.x}:${top.y}:${bottom.y}:${regionId}`;
  if (roomHoverState.currentKey === key) return;
  roomHoverState.currentKey = key;
  imageData.data.fill(0);
  for (let y = top.y + 1; y < bottom.y; y += 1) {
    for (let x = left.x + 1; x < right.x; x += 1) {
      const index = y * columns + x;
      if (expanded[index]) continue;
      const offset = index * 4;
      imageData.data[offset] = ROOM_HIGHLIGHT_COLOR[0];
      imageData.data[offset + 1] = ROOM_HIGHLIGHT_COLOR[1];
      imageData.data[offset + 2] = ROOM_HIGHLIGHT_COLOR[2];
      imageData.data[offset + 3] = ROOM_HIGHLIGHT_COLOR[3];
    }
  }
  context.putImageData(imageData, 0, 0);
  texture.needsUpdate = true;
}

function setRoomOverride(room) {
  if (!roomHoverState) return;
  const key = `override:${room.id}`;
  if (roomHoverState.currentKey === key) return;
  const { columns, rows, context, imageData, texture } = roomHoverState;
  roomHoverState.currentKey = key;
  imageData.data.fill(0);

  for (let row = 0; row < rows; row += 1) {
    const svgY = (row + 0.5) * ROOM_GRID_SIZE;
    if (svgY <= room.y1 || svgY >= room.y2) continue;
    for (let column = 0; column < columns; column += 1) {
      const svgX = (column + 0.5) * ROOM_GRID_SIZE;
      if (svgX <= room.x1 || svgX >= room.x2) continue;
      const offset = (row * columns + column) * 4;
      imageData.data[offset] = ROOM_HIGHLIGHT_COLOR[0];
      imageData.data[offset + 1] = ROOM_HIGHLIGHT_COLOR[1];
      imageData.data[offset + 2] = ROOM_HIGHLIGHT_COLOR[2];
      imageData.data[offset + 3] = ROOM_HIGHLIGHT_COLOR[3];
    }
  }

  context.putImageData(imageData, 0, 0);
  texture.needsUpdate = true;
}

function updateRoomHighlight() {
  if (!roomHoverState) return -1;
  if (!raycaster.ray.intersectPlane(roomHoverPlane, dragPoint)) {
    setRoomHighlight(-1);
    return -1;
  }
  const svgX = (dragPoint.x + PLAN_WIDTH / 2) / SCALE;
  const svgY = (dragPoint.z + PLAN_DEPTH / 2) / SCALE;
  const override = ROOM_HOVER_OVERRIDES.find((room) =>
    svgX > room.x1 && svgX < room.x2 && svgY > room.y1 && svgY < room.y2
  );
  if (override) {
    setRoomOverride(override);
    return override.environmentId;
  }
  const column = Math.floor(svgX / ROOM_GRID_SIZE);
  const row = Math.floor(svgY / ROOM_GRID_SIZE);
  if (column < 0 || row < 0 || column >= roomHoverState.columns || row >= roomHoverState.rows) {
    setRoomHighlight(-1);
    return -1;
  }
  let regionId = roomHoverState.labels[row * roomHoverState.columns + column];
  let roomColumn = column;
  let roomRow = row;

  // Thin rooms and wall edges can land on a rasterized wall cell. Resolve to
  // the nearest free room cell so the hover feedback remains continuous.
  if (regionId < 0) {
    let nearestDistance = Infinity;
    for (let offsetY = -6; offsetY <= 6; offsetY += 1) {
      for (let offsetX = -6; offsetX <= 6; offsetX += 1) {
        const candidateColumn = column + offsetX;
        const candidateRow = row + offsetY;
        if (
          candidateColumn < 0 || candidateRow < 0 ||
          candidateColumn >= roomHoverState.columns || candidateRow >= roomHoverState.rows
        ) continue;
        const candidateRegion = roomHoverState.labels[candidateRow * roomHoverState.columns + candidateColumn];
        if (candidateRegion < 0) continue;
        const distance = offsetX * offsetX + offsetY * offsetY;
        if (distance >= nearestDistance) continue;
        nearestDistance = distance;
        regionId = candidateRegion;
        roomColumn = candidateColumn;
        roomRow = candidateRow;
      }
    }
  }
  if (roomHoverState.regions[regionId]?.hoverable) setRoomHighlight(regionId);
  else setRoomFallback(roomColumn, roomRow, regionId);
  return regionId;
}

function createWallInstances(segments) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xbfc1bc, roughness: 0.78, metalness: 0.015 });
  floorWallMaterial = material;
  const walls = new THREE.InstancedMesh(geometry, material, segments.length);
  walls.castShadow = true;
  walls.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  segments.forEach((segment, index) => {
    const a = svgPointToWorld(segment.x1, segment.y1);
    const b = svgPointToWorld(segment.x2, segment.y2);
    const angle = -Math.atan2(b.z - a.z, b.x - a.x);
    position.set((a.x + b.x) / 2, WALL_HEIGHT / 2 + 0.18, (a.z + b.z) / 2);
    quaternion.setFromAxisAngle(yAxis, angle);
    scale.set(a.distanceTo(b) + 0.12, WALL_HEIGHT, segment.thickness ?? WALL_THICKNESS);
    matrix.compose(position, quaternion, scale);
    walls.setMatrixAt(index, matrix);
  });

  walls.instanceMatrix.needsUpdate = true;
  model.add(walls);
}

function createColumns(svg) {
  const material = new THREE.MeshStandardMaterial({ color: 0x343532, roughness: 0.58 });
  svg.querySelectorAll('rect.st6').forEach((rect) => {
    const x = +rect.getAttribute('x');
    const y = +rect.getAttribute('y');
    const width = +rect.getAttribute('width');
    const height = +rect.getAttribute('height');
    const center = svgPointToWorld(x + width / 2, y + height / 2);
    const column = new THREE.Mesh(new THREE.BoxGeometry(width * SCALE, 5.8, height * SCALE), material);
    column.position.set(center.x, 2.9 + 0.18, center.z);
    column.castShadow = true;
    column.receiveShadow = true;
    model.add(column);
  });
}

function createDeviceBeacon(color, radius = 1.5) {
  const beacon = new THREE.Group();
  const glowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: 0.34 },
      uPulse: { value: 0 },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uPulse;
      uniform float uTime;
      void main() {
        float distanceFromCenter = length(vUv - 0.5) * 2.0;
        float gradient = 1.0 - smoothstep(0.08, 1.0, distanceFromCenter);
        float halo = smoothstep(0.98, 0.48, distanceFromCenter);
        float pulse = mix(1.0, 0.78 + sin(uTime * 3.4) * 0.22, uPulse);
        float alpha = (gradient * 0.56 + halo * 0.44) * uStrength * pulse;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.5, radius * 2.5), glowMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.renderOrder = 2;
  beacon.add(ring);

  const line = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28 })
  );
  beacon.add(line);
  beacon.userData.verticalLine = line;
  beacon.userData.floorRing = ring;
  beacon.userData.glowMaterial = glowMaterial;
  return beacon;
}

function collectDeviceColorMaterials(group) {
  const materials = [];
  group.traverse((object) => {
    if (!object.isMesh || !object.material?.color) return;
    materials.push(object.material);
  });
  return [...new Set(materials)];
}

let alertAuraTexture = null;

function getAlertAuraTexture() {
  if (alertAuraTexture) return alertAuraTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.96)');
  gradient.addColorStop(.26, 'rgba(255,255,255,.62)');
  gradient.addColorStop(.62, 'rgba(255,255,255,.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  alertAuraTexture = new THREE.CanvasTexture(canvas);
  return alertAuraTexture;
}

function createAlertAura(width, height) {
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getAlertAuraTexture(),
    color: 0xff2018,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    blending: THREE.NormalBlending
  }));
  aura.scale.set(width, height, 1);
  aura.userData.baseScale = new THREE.Vector2(width, height);
  aura.visible = false;
  aura.renderOrder = 4;
  return aura;
}

function createAlertLight() {
  const light = new THREE.PointLight(0xff2418, 0, 20, 2);
  light.position.y = 1.1;
  light.castShadow = false;
  light.visible = false;
  return light;
}

function createAirConditioner() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 1.65, 1.45),
    new THREE.MeshStandardMaterial({ color: 0xf4f6f4, roughness: 0.32, metalness: 0.05 })
  );
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(5.55, 0.12, 1.08),
    new THREE.MeshStandardMaterial({ color: 0xc8dfe3, roughness: 0.45 })
  );
  panel.position.set(0, -0.57, 0.25);
  group.add(panel);

  for (let index = -2; index <= 2; index += 1) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.17, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x6f7d7c, roughness: 0.55 })
    );
    vent.position.set(index * 0.85, -0.7, 0.28);
    group.add(vent);
  }

  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x45d8d0 })
  );
  indicator.position.set(2.55, 0.25, 0.74);
  group.add(indicator);
  const beacon = createDeviceBeacon(0x47a6b8, 1.8);
  group.userData.beacon = beacon;
  group.add(beacon);
  const aura = createAlertAura(10.5, 6.5);
  aura.position.z = -0.35;
  group.userData.alertAura = aura;
  group.add(aura);
  const alertLight = createAlertLight();
  group.userData.alertLight = alertLight;
  group.add(alertLight);
  group.userData.colorMaterials = collectDeviceColorMaterials(group);
  return group;
}

function createTemperatureSensor() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 2.1, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xf3f0e9, roughness: 0.4, metalness: 0.02 })
  );
  body.castShadow = true;
  group.add(body);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 32),
    new THREE.MeshStandardMaterial({ color: 0x283331, roughness: 0.3 })
  );
  face.position.z = 0.321;
  group.add(face);

  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff9b4b })
  );
  indicator.position.set(0, 0, 0.38);
  group.add(indicator);
  const beacon = createDeviceBeacon(0xee8a3b, 1.25);
  group.userData.beacon = beacon;
  group.add(beacon);
  const aura = createAlertAura(5.2, 5.2);
  aura.position.z = -0.32;
  group.userData.alertAura = aura;
  group.add(aura);
  const alertLight = createAlertLight();
  group.userData.alertLight = alertLight;
  group.add(alertLight);
  group.userData.colorMaterials = collectDeviceColorMaterials(group);
  return group;
}

function createSosEmergencyDevice() {
  const group = new THREE.Group();
  const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x30332f, roughness: 0.46, metalness: 0.14 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.38 });
  const statusMaterial = new THREE.MeshBasicMaterial({ color: DEVICE_COLORS.green });

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.58, 1.35, 18), housingMaterial);
  pedestal.position.y = 0.68;
  pedestal.castShadow = true;
  group.add(pedestal);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.62, 0.72), housingMaterial);
  housing.position.y = 1.72;
  housing.castShadow = true;
  group.add(housing);

  const face = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.18, 0.12), panelMaterial);
  face.position.set(0, 1.72, 0.42);
  group.add(face);

  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.22, 24), statusMaterial);
  button.rotation.x = Math.PI / 2;
  button.position.set(0, 1.57, 0.56);
  group.add(button);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), statusMaterial);
  lamp.position.set(0.7, 2.13, 0.5);
  group.add(lamp);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 96;
  const labelContext = labelCanvas.getContext('2d');
  labelContext.fillStyle = 'rgba(25,27,24,.94)';
  labelContext.beginPath();
  labelContext.roundRect(4, 4, 248, 88, 22);
  labelContext.fill();
  labelContext.fillStyle = '#ffffff';
  labelContext.font = '800 54px Inter, system-ui, sans-serif';
  labelContext.textAlign = 'center';
  labelContext.textBaseline = 'middle';
  labelContext.fillText('SOS', 128, 50);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  }));
  label.position.set(0, 3.05, 0);
  label.scale.set(2.8, 1.05, 1);
  label.renderOrder = 6;
  group.add(label);

  const beacon = createDeviceBeacon(DEVICE_COLORS.green, 1.45);
  group.userData.beacon = beacon;
  group.add(beacon);
  const aura = createAlertAura(7.2, 7.2);
  aura.position.set(0, 1.65, -0.34);
  group.userData.alertAura = aura;
  group.add(aura);
  const alertLight = createAlertLight();
  alertLight.position.y = 2.1;
  alertLight.distance = 16;
  group.userData.alertLight = alertLight;
  group.add(alertLight);
  group.userData.colorMaterials = [statusMaterial];
  return group;
}

function createCompactRegionalDevice(type) {
  const group = new THREE.Group();
  if (type === 'ac') {
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.82, 0.68),
      new THREE.MeshStandardMaterial({ color: 0xf4f6f4, roughness: 0.34, metalness: 0.04 })
    );
    shell.castShadow = true;
    group.add(shell);
    const outlet = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.12, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x9eb7b9, roughness: 0.48 })
    );
    outlet.position.set(0, -0.29, 0.18);
    group.add(outlet);
  } else {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 1.04, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xf3f0e9, roughness: 0.42, metalness: 0.02 })
    );
    body.castShadow = true;
    group.add(body);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 18),
      new THREE.MeshStandardMaterial({ color: 0x39504c, roughness: 0.34 })
    );
    face.position.z = 0.19;
    group.add(face);
  }

  const beacon = createDeviceBeacon(type === 'ac' ? 0x47a6b8 : 0xee8a3b, type === 'ac' ? 0.78 : 0.56);
  group.userData.beacon = beacon;
  group.add(beacon);
  const aura = createAlertAura(type === 'ac' ? 4.2 : 2.8, type === 'ac' ? 3.2 : 2.8);
  aura.position.z = -0.22;
  group.userData.alertAura = aura;
  group.add(aura);
  const alertLight = createAlertLight();
  alertLight.distance = type === 'ac' ? 9 : 6;
  group.userData.alertLight = alertLight;
  group.add(alertLight);
  group.userData.colorMaterials = collectDeviceColorMaterials(group);
  return group;
}

function createLightBulb() {
  const group = new THREE.Group();
  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 0.52, 16),
    new THREE.MeshStandardMaterial({ color: 0x73766f, roughness: 0.5, metalness: 0.28 })
  );
  socket.position.y = 0.38;
  group.add(socket);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.26, 0.28, 16),
    new THREE.MeshStandardMaterial({ color: 0xb4b6ae, roughness: 0.42, metalness: 0.18 })
  );
  neck.position.y = 0.02;
  group.add(neck);

  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdc5d,
    emissive: 0xffc52e,
    emissiveIntensity: 2.1,
    roughness: 0.22,
    transparent: true,
    opacity: 0.96
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 18), bulbMaterial);
  bulb.scale.y = 1.08;
  bulb.position.y = -0.43;
  bulb.castShadow = false;
  group.add(bulb);

  const glowMaterial = new THREE.SpriteMaterial({
    map: getAlertAuraTexture(),
    color: 0xffcf3f,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.y = -0.4;
  glow.scale.set(3.7, 3.7, 1);
  glow.renderOrder = 3;
  group.add(glow);
  group.userData = { bulbMaterial, glow, glowMaterial };
  return group;
}

function updateLightingObject(lightId) {
  const object = lightingObjects.get(lightId);
  const state = lightingStates[lightId];
  if (!object || !state) return;
  object.userData.bulbMaterial.color.setHex(state.on ? 0xffdc5d : 0x92958e);
  object.userData.bulbMaterial.emissive.setHex(state.on ? 0xffc52e : 0x000000);
  object.userData.bulbMaterial.emissiveIntensity = state.on ? 2.1 : 0;
  object.userData.glow.visible = state.on;
}

function updateOfficeLightingLevel() {
  const activeCount = LIGHTING_FIXTURES.reduce(
    (count, fixture) => count + (lightingStates[fixture.id]?.on ? 1 : 0),
    0
  );
  const activeRatio = activeCount / LIGHTING_FIXTURES.length;
  officeAmbient.intensity = sceneMode === 'floor' ? 0.04 + activeRatio * 0.68 : 0;
}

function createLightingFixtures() {
  LIGHTING_FIXTURES.forEach((fixture) => {
    const object = createLightBulb();
    const position = svgPointToWorld(fixture.svgX, fixture.svgY);
    object.position.set(position.x, 5.65, position.z);
    object.scale.setScalar(0.92);
    object.userData.lightId = fixture.id;
    object.userData.label = fixture.label;
    lightingObjects.set(fixture.id, object);
    model.add(object);
    updateLightingObject(fixture.id);
  });
  updateOfficeLightingLevel();
}

function createCctvCamera() {
  const group = new THREE.Group();
  const mountMaterial = new THREE.MeshStandardMaterial({ color: 0xb9bbb5, roughness: 0.5, metalness: 0.18 });
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x367fb2,
    emissive: 0x092a42,
    emissiveIntensity: 0.2,
    roughness: 0.36,
    metalness: 0.16
  });
  const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x080908, roughness: 0.16, metalness: 0.55 });

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.62, 14), mountMaterial);
  mount.position.y = 0.55;
  group.add(mount);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.82), mountMaterial);
  arm.position.set(0, 0.22, 0.34);
  arm.rotation.x = -0.18;
  group.add(arm);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 1.7), bodyMaterial);
  body.position.set(0, -0.08, 1.05);
  body.rotation.x = -0.12;
  body.castShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.82), bodyMaterial.clone());
  hood.position.set(0, 0.35, 1.02);
  hood.rotation.x = -0.12;
  group.add(hood);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.28, 22), lensMaterial);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.13, 1.94);
  group.add(lens);

  const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0x45dd63 });
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), indicatorMaterial);
  indicator.position.set(0.42, 0.02, 1.92);
  group.add(indicator);
  group.userData = { bodyMaterials: [bodyMaterial, hood.material], indicatorMaterial };
  return group;
}

function updateCctvObject(cctvId) {
  const object = cctvObjects.get(cctvId);
  const state = cctvStates[cctvId];
  if (!object || !state) return;
  const color = state.online ? 0x367fb2 : 0x8b9aa3;
  object.userData.bodyMaterials.forEach((material) => {
    material.color.setHex(color);
    material.emissive.setHex(state.online ? 0x092a42 : 0x000000);
    material.emissiveIntensity = state.online ? 0.2 : 0;
  });
  object.userData.indicatorMaterial.color.setHex(state.online ? 0x45dd63 : 0x9a9d96);
  object.rotation.y = -THREE.MathUtils.degToRad(CCTV_DIRECTIONS[state.direction].degrees);
}

function createCctvFixtures() {
  CCTV_FIXTURES.forEach((fixture) => {
    const object = createCctvCamera();
    const defaultPosition = svgPointToWorld(fixture.svgX, fixture.svgY);
    const savedPosition = savedCctvPositions[fixture.id];
    const position = savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.z)
      ? savedPosition
      : { x: defaultPosition.x, y: 5.15, z: defaultPosition.z };
    object.position.set(position.x, Number.isFinite(position.y) ? position.y : 5.15, position.z);
    object.scale.setScalar(0.88);
    object.userData.cctvId = fixture.id;
    object.userData.label = fixture.label;
    cctvObjects.set(fixture.id, object);
    cctvPickTargets.push(object);
    model.add(object);
    updateCctvObject(fixture.id);
  });
}

function readSavedDevicePositions() {
  try {
    return JSON.parse(readLocalSetting(DEVICE_STORAGE_KEY, '{}'));
  } catch {
    return {};
  }
}

function readAddedDeviceConfigs() {
  try {
    const configs = JSON.parse(readLocalSetting(ADDED_DEVICE_STORAGE_KEY, '[]'));
    return Array.isArray(configs) ? configs.filter((config) => config?.id && config?.type && config?.data) : [];
  } catch {
    return [];
  }
}

function saveAddedDeviceConfigs(configs) {
  writeLocalSetting(ADDED_DEVICE_STORAGE_KEY, JSON.stringify(configs));
}

function saveDevicePositions() {
  const positions = {};
  deviceObjects.forEach((object, id) => {
    positions[id] = { x: object.position.x, y: object.position.y, z: object.position.z, color: object.userData.color };
  });
  writeLocalSetting(DEVICE_STORAGE_KEY, JSON.stringify(positions));
}

function applyDeviceColor(device, colorName) {
  const color = DEVICE_COLORS[colorName] ?? DEVICE_COLORS.green;
  device.userData.color = colorName in DEVICE_COLORS ? colorName : 'green';
  device.userData.colorMaterials.forEach((material) => material.color.setHex(color));
  const glow = device.userData.beacon?.userData.glowMaterial;
  if (glow) {
    glow.uniforms.uColor.value.setHex(color);
    glow.uniforms.uStrength.value = device.userData.color === 'red' ? 0.82 : device.userData.color === 'gray' ? 0.22 : 0.38;
    glow.uniforms.uPulse.value = device.userData.color === 'red' ? 1 : 0;
  }
  if (device.userData.alertAura) device.userData.alertAura.visible = device.userData.color === 'red';
  if (device.userData.alertLight) {
    const alertActive = device.userData.color === 'red';
    device.userData.alertLight.visible = alertActive;
    device.userData.alertLight.intensity = alertActive ? 26 : 0;
    if (alertActive) alertDevices.add(device);
    else alertDevices.delete(device);
  }
}

function colorToCss(colorName) {
  return `#${(DEVICE_COLORS[colorName] ?? DEVICE_COLORS.green).toString(16).padStart(6, '0')}`;
}

function getDeviceStatus(colorName, type) {
  if (type === 'sos') return colorName === 'red' ? 'SOS 已啟動' : '正常待命';
  return colorName === 'red' ? '異常' : colorName === 'gray' ? '離線' : '正常';
}

function getDeviceRoot(object) {
  let current = object;
  while (current && !current.userData.deviceId) current = current.parent;
  return current?.userData.deviceId ? current : null;
}

function getCctvRoot(object) {
  let current = object;
  while (current && !current.userData.cctvId) current = current.parent;
  return current?.userData.cctvId ? current : null;
}

function updateCctvFeedClock() {
  cctvFeedTime.textContent = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

function openCctvConnection(cctvId) {
  const fixture = CCTV_FIXTURES.find((entry) => entry.id === cctvId);
  const state = cctvStates[cctvId];
  if (!fixture || !state) return;
  const direction = CCTV_DIRECTIONS[state.direction];
  cctvModalTitle.textContent = fixture.label;
  cctvModalStatus.textContent = state.online ? 'LIVE・連線成功' : 'OFFLINE・無法連線';
  cctvDirectionLabel.textContent = `方向：${direction.label}・${direction.degrees}°`;
  cctvModal.classList.toggle('offline', !state.online);
  cctvModal.classList.add('open');
  cctvModal.setAttribute('aria-hidden', 'false');
  updateCctvFeedClock();
  document.querySelector('#close-cctv-modal').focus();
}

function closeCctvConnection() {
  cctvModal.classList.remove('open');
  cctvModal.setAttribute('aria-hidden', 'true');
}

function setPointerFromEvent(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function finishDeviceDrag(event) {
  if (!draggingDevice) return;
  const adjustedObject = draggingDevice;
  const draggedCctv = Boolean(draggingDevice.userData.cctvId);
  if (event?.pointerId != null && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
  draggingDevice = null;
  controls.enabled = true;
  renderer.domElement.style.cursor = '';
  if (draggedCctv) saveCctvPositions();
  else saveDevicePositions();
  invalidateShadows();
  selectObjectForAdjustment(adjustedObject);
}

function beginObjectDrag(object, event) {
  selectObjectForAdjustment(object);
  draggingDevice = object;
  setRoomHighlight(-1);
  dragPlane.set(new THREE.Vector3(0, 1, 0), -object.position.y);
  controls.enabled = false;
  clearDeviceHover();
  clearRoomTooltip();
  renderer.domElement.style.cursor = 'grabbing';
  renderer.domElement.setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopImmediatePropagation();
}

function updateDeviceTooltip(device, clientX, clientY) {
  const data = device.userData.data;
  const colorName = device.userData.color || 'green';
  deviceTooltip.querySelector('[data-field="name"]').textContent = data.name;
  deviceTooltip.querySelector('[data-field="energy"]').textContent = data.energy;
  deviceTooltip.querySelector('[data-field="runtime"]').textContent = data.runtime;
  deviceTooltip.querySelector('[data-field="status"]').textContent = getDeviceStatus(colorName, device.userData.config?.type);
  deviceTooltip.querySelector('[data-field="gateway"]').textContent = data.gateway;
  const dot = deviceTooltip.querySelector('.tooltip-status-dot');
  dot.style.background = colorToCss(colorName);
  dot.style.boxShadow = `0 0 0 4px ${colorToCss(colorName)}24`;
  deviceTooltip.style.left = `${Math.max(8, Math.min(clientX, innerWidth - 274))}px`;
  deviceTooltip.style.top = `${Math.max(8, Math.min(clientY, innerHeight - 205))}px`;
  deviceTooltip.classList.add('visible');
}

function updateRoomTooltip(regionId, clientX, clientY) {
  if (regionId < 0) {
    roomTooltip.classList.remove('visible');
    return;
  }
  const temperature = 23.1 + ((regionId * 7) % 19) / 10;
  const humidity = 48 + ((regionId * 11) % 14);
  const co2 = 480 + ((regionId * 47) % 360);
  roomTooltip.querySelector('[data-field="temperature"]').textContent = `${temperature.toFixed(1)} °C`;
  roomTooltip.querySelector('[data-field="humidity"]').textContent = `${humidity} %RH`;
  roomTooltip.querySelector('[data-field="co2"]').textContent = `${co2} ppm`;
  roomTooltip.style.left = `${Math.max(8, Math.min(clientX, innerWidth - 230))}px`;
  roomTooltip.style.top = `${Math.max(8, Math.min(clientY, innerHeight - 160))}px`;
  roomTooltip.classList.add('visible');
}

function clearRoomTooltip() {
  roomTooltip.classList.remove('visible');
}

function clearDeviceHover() {
  if (hoveredDevice) hoveredDevice.scale.setScalar(hoveredDevice.userData.baseScale || 1);
  hoveredDevice = null;
  renderer.domElement.style.cursor = '';
  deviceTooltip.classList.remove('visible');
}

function updateDeviceBeacon(device) {
  const beacon = device.userData.beacon;
  if (!beacon) return;
  const height = Math.max(device.position.y, 0.1);
  beacon.userData.verticalLine.scale.y = height;
  beacon.userData.verticalLine.position.y = -height / 2;
  beacon.userData.floorRing.position.y = -height + 0.06;
}

function createDynamicDeviceCard(config) {
  const card = document.createElement('section');
  card.className = 'device-card';
  card.dataset.device = config.id;
  const statusControls = config.type === 'sos'
    ? `
      <div class="asset-state-picker sos-state-picker" role="group" aria-label="SOS 開關狀態">
        <button data-color="green" type="button" aria-label="關閉 SOS・綠燈" aria-pressed="true"><i></i>關閉・綠燈</button>
        <button data-color="red" type="button" aria-label="啟動 SOS・紅燈" aria-pressed="false"><i></i>啟動・紅燈</button>
      </div>
    `
    : `
      <div class="color-picker">
        <span>狀態</span>
        <button class="color-swatch green" data-color="green" type="button" aria-label="綠色" aria-pressed="true"></button>
        <button class="color-swatch red" data-color="red" type="button" aria-label="紅色" aria-pressed="false"></button>
        <button class="color-swatch gray" data-color="gray" type="button" aria-label="灰色" aria-pressed="false"></button>
      </div>
    `;
  card.innerHTML = `
    <div class="device-card-title">
      <span class="device-dot"></span>
      <div><strong></strong><small></small></div>
    </div>
    <div class="axis-grid">
      <label><span>X</span><input data-axis="x" type="number" step="0.1" inputmode="decimal"></label>
      <label><span>Y</span><input data-axis="y" type="number" step="0.1" inputmode="decimal"></label>
      <label><span>Z</span><input data-axis="z" type="number" step="0.1" inputmode="decimal"></label>
    </div>
    ${statusControls}
  `;
  card.querySelector('strong').textContent = config.label;
  card.querySelector('small').textContent = config.location;
  card.querySelector('.color-picker')?.setAttribute('aria-label', `${config.label}設備顏色`);
  document.querySelector('.axis-note').before(card);
  return card;
}

function findDeviceCard(deviceId) {
  return [...document.querySelectorAll('.device-card')].find((card) => card.dataset.device === deviceId) || null;
}

function getDeviceAdjustmentLabel(device) {
  const type = device.userData.config?.type;
  const matchingDevices = [...deviceObjects.values()].filter((entry) => entry.userData.config?.type === type);
  const number = Math.max(1, matchingDevices.indexOf(device) + 1);
  const typeLabel = type === 'ac' ? '冷氣' : type === 'sos' ? 'SOS 緊急設備' : '溫濕度感應器';
  return `${typeLabel} ${String(number).padStart(2, '0')}`;
}

function clearAdjustmentHighlights() {
  document.querySelectorAll('.active-adjustment').forEach((element) => element.classList.remove('active-adjustment'));
}

function selectObjectForAdjustment(object) {
  if (!object) return;
  clearAdjustmentHighlights();
  activeDragDevice.classList.add('selected');

  if (object.userData.cctvId) {
    const fixture = CCTV_FIXTURES.find((entry) => entry.id === object.userData.cctvId);
    cctvSelect.value = object.userData.cctvId;
    syncCctvControls();
    document.querySelector('.cctv-control')?.classList.add('active-adjustment');
    activeDragDeviceName.textContent = fixture?.label || object.userData.cctvId;
    activeDragDeviceDetail.textContent = 'CCTV・目前調整';
    return;
  }

  const card = findDeviceCard(object.userData.deviceId);
  card?.classList.add('active-adjustment');
  activeDragDeviceName.textContent = getDeviceAdjustmentLabel(object);
  activeDragDeviceDetail.textContent = `${object.userData.config?.location || '自訂位置'}・目前調整`;
}

function syncDeviceCard(device) {
  const card = findDeviceCard(device.userData.deviceId);
  if (!card) return;
  card.querySelectorAll('input[data-axis]').forEach((input) => {
    input.value = device.position[input.dataset.axis].toFixed(1);
  });
}

function bindDeviceCard(card, device) {
  if (!card || card.dataset.bound === 'true') return;
  card.dataset.bound = 'true';
  card.addEventListener('pointerdown', () => selectObjectForAdjustment(device));
  card.querySelector('.device-dot').style.background = colorToCss(device.userData.color);
  card.querySelectorAll('input[data-axis]').forEach((input) => {
    const axis = input.dataset.axis;
    input.value = device.position[axis].toFixed(1);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      device.position[axis] = value;
      updateDeviceBeacon(device);
      invalidateShadows();
      saveDevicePositions();
    });
  });

  card.querySelectorAll('button[data-color]').forEach((button) => {
    const selected = button.dataset.color === device.userData.color;
    button.setAttribute('aria-pressed', String(selected));
    button.addEventListener('click', () => {
      applyDeviceColor(device, button.dataset.color);
      if (device.userData.config?.type === 'sos') {
        device.userData.data.runtime = device.userData.color === 'red' ? '警報已啟動' : '待命中';
      }
      card.querySelector('.device-dot').style.background = colorToCss(device.userData.color);
      card.querySelectorAll('button[data-color]').forEach((swatch) => {
        swatch.setAttribute('aria-pressed', String(swatch === button));
      });
      saveDevicePositions();
    });
  });
}

function createDeviceObject(config, savedPositions) {
  const device = config.compact
    ? createCompactRegionalDevice(config.type)
    : config.type === 'ac'
      ? createAirConditioner()
      : config.type === 'sos'
        ? createSosEmergencyDevice()
        : createTemperatureSensor();
  const planPosition = Number.isFinite(config.svgX) && Number.isFinite(config.svgY)
    ? svgPointToWorld(config.svgX, config.svgY)
    : new THREE.Vector3(config.x ?? 0, 0, config.z ?? 0);
  const initial = savedPositions[config.id] || { x: planPosition.x, y: config.y, z: planPosition.z };
  device.position.set(initial.x, initial.y, initial.z);
  device.userData.baseScale = config.scale || 1;
  device.scale.setScalar(device.userData.baseScale);
  device.userData.deviceId = config.id;
  device.userData.data = config.data;
  device.userData.config = config;
  applyDeviceColor(device, initial.color || config.color);
  updateDeviceBeacon(device);
  deviceObjects.set(config.id, device);
  devicePickTargets.push(device);
  model.add(device);
  return device;
}

function createDevices() {
  const savedPositions = readSavedDevicePositions();
  const addedConfigs = readAddedDeviceConfigs();
  [...DEVICE_CONFIGS, ...REGIONAL_DEVICE_CONFIGS, ...addedConfigs].forEach((config) => {
    const device = createDeviceObject(config, savedPositions);
    if (config.showCard !== false) {
      const card = findDeviceCard(config.id) || createDynamicDeviceCard(config);
      bindDeviceCard(card, device);
    }
  });
}

function drawMeetingRoomBadge(visual, room, status) {
  const { canvas, context, texture } = visual.userData;
  const color = new THREE.Color(MEETING_ROOM_COLORS[status]).getStyle();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.shadowColor = 'rgba(20, 24, 19, .22)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 6;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(10, 10, canvas.width - 20, canvas.height - 26, 28);
  context.fill();
  context.restore();
  context.fillStyle = '#ffffff';
  context.font = '700 31px Inter, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`${room.id}  ${MEETING_ROOM_LABELS[status]}`, canvas.width / 2, canvas.height / 2 - 3);
  texture.needsUpdate = true;
}

function updateMeetingRoomVisual(roomId) {
  const visual = meetingRoomVisuals.get(roomId);
  const state = meetingRoomStates[roomId];
  const room = MEETING_ROOMS.find((entry) => entry.id === roomId);
  if (!visual || !state || !room) return;
  visual.visible = state.enabled;
  visual.userData.floor.material.color.setHex(MEETING_ROOM_COLORS[state.status]);
  visual.userData.floor.material.opacity = state.status === 'reserved' ? 0.24 : 0.21;
  drawMeetingRoomBadge(visual, room, state.status);
}

function createMeetingRoomStatusVisuals() {
  MEETING_ROOMS.forEach((room) => {
    const width = (room.x2 - room.x1) * SCALE;
    const depth = (room.y2 - room.y1) * SCALE;
    const center = svgPointToWorld((room.x1 + room.x2) / 2, (room.y1 + room.y2) / 2);
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        color: MEETING_ROOM_COLORS.occupied,
        transparent: true,
        opacity: 0.21,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.065;
    floor.renderOrder = 1;
    group.add(floor);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 112;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      toneMapped: false
    }));
    badge.position.y = 1.35;
    badge.scale.set(10.2, 3, 1);
    badge.renderOrder = 12;
    group.add(badge);

    group.userData = { floor, badge, canvas, context, texture };
    meetingRoomVisuals.set(room.id, group);
    model.add(group);
    updateMeetingRoomVisual(room.id);
  });
}

function addDevice(presetKey) {
  const preset = ADDED_DEVICE_PRESETS[presetKey];
  if (!preset) return;
  const config = {
    ...preset,
    id: `added-${preset.type}-${Date.now()}`,
    x: 0,
    z: 0,
    data: { ...preset.data }
  };
  const addedConfigs = readAddedDeviceConfigs();
  addedConfigs.push(config);
  saveAddedDeviceConfigs(addedConfigs);
  const device = createDeviceObject(config, readSavedDevicePositions());
  bindDeviceCard(createDynamicDeviceCard(config), device);
  selectObjectForAdjustment(device);
  saveDevicePositions();
}

async function makePlanTexture(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  svg.querySelectorAll('text, tspan').forEach((node) => {
    node.setAttribute('fill', '#767676');
    node.style.fill = '#767676';
    node.style.opacity = '0.94';
  });
  removeDoorSymbols(svg);
  svg.setAttribute('width', String(SVG_WIDTH));
  svg.setAttribute('height', String(SVG_HEIGHT));

  const labelSvg = svg.cloneNode(true);
  labelSvg.querySelectorAll('line, path, rect, polygon, polyline, circle, ellipse, image').forEach((node) => node.remove());
  svg.querySelectorAll('text, tspan').forEach((node) => node.remove());

  const renderSvg = async (sourceSvg, background = null) => {
    const serialized = new XMLSerializer().serializeToString(sourceSvg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = SVG_WIDTH * 2;
    canvas.height = SVG_HEIGHT * 2;
    const context = canvas.getContext('2d');
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  };

  const [texture, labelTexture] = await Promise.all([
    renderSvg(svg, '#d1cec6'),
    renderSvg(labelSvg)
  ]);
  return { texture, labelTexture, svg };
}

function createFoundation(texture, labelTexture) {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(PLAN_WIDTH + 2.4, 0.36, PLAN_DEPTH + 2.4),
    new THREE.MeshStandardMaterial({ color: 0x979991, roughness: 0.86 })
  );
  slab.position.y = -0.18;
  slab.receiveShadow = true;
  model.add(slab);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(PLAN_WIDTH, PLAN_DEPTH),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.025;
  floor.receiveShadow = true;
  model.add(floor);

  const labels = new THREE.Mesh(
    new THREE.PlaneGeometry(PLAN_WIDTH, PLAN_DEPTH),
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false, toneMapped: false })
  );
  labels.rotation.x = -Math.PI / 2;
  labels.position.y = 0.055;
  labels.renderOrder = 3;
  model.add(labels);
}

function createBuildingOverview() {
  const floorHeight = 2.2;
  const towerX = 24;
  const totalHeight = 22 * floorHeight;
  const towerWidth = 42;
  const towerDepth = 28;
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6f8795,
    roughness: 0.18,
    metalness: 0.42,
    transparent: true,
    opacity: 0.74,
    transmission: 0.08
  });
  const podiumGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x526b77,
    roughness: 0.2,
    metalness: 0.38,
    transparent: true,
    opacity: 0.84
  });
  const concreteMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e5e0, roughness: 0.58, metalness: 0.04 });
  const concreteShadeMaterial = new THREE.MeshStandardMaterial({ color: 0xc7cac7, roughness: 0.68, metalness: 0.03 });
  const mullionMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c1c2, roughness: 0.38, metalness: 0.48 });
  const recessMaterial = new THREE.MeshStandardMaterial({ color: 0x20282d, roughness: 0.74, metalness: 0.12 });
  const balconyGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x91aab5,
    roughness: 0.12,
    metalness: 0.28,
    transparent: true,
    opacity: 0.62
  });
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcf3d,
    emissive: 0x8c6500,
    emissiveIntensity: 0.45,
    roughness: 0.38,
    metalness: 0.03
  });
  const roadMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xf2eee0, roughness: 0.9 });
  const yellowRoadMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xe6bd45, roughness: 0.86 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x67513c, roughness: 0.96 });
  const foliageMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x55765b, roughness: 0.94, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x688867, roughness: 0.94, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x476b52, roughness: 0.94, flatShading: true })
  ];
  const planterMaterial = new THREE.MeshStandardMaterial({ color: 0xb7b8b1, roughness: 0.9 });
  const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x665444, roughness: 1 });
  const flowerMaterials = [0xd78480, 0xe2bc55, 0xe8e3d6].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
  );

  const addBox = (size, position, material, { castShadow = true, receiveShadow = false } = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    buildingGroup.add(mesh);
    return mesh;
  };

  const addTree = (x, z, scale = 1, foliageIndex = 0) => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 3.2 * scale, 9),
      trunkMaterial
    );
    trunk.position.set(x, 1.6 * scale, z);
    trunk.castShadow = true;
    buildingGroup.add(trunk);

    const canopyGeometry = new THREE.DodecahedronGeometry(1.45 * scale, 0);
    [[0, 4.05, 0], [-0.82, 3.72, 0.08], [0.78, 3.78, -0.04]].forEach(([offsetX, y, offsetZ], index) => {
      const canopy = new THREE.Mesh(canopyGeometry, foliageMaterials[(foliageIndex + index) % foliageMaterials.length]);
      canopy.position.set(x + offsetX * scale, y * scale, z + offsetZ * scale);
      canopy.scale.set(1, 1.08, 0.9);
      canopy.castShadow = true;
      buildingGroup.add(canopy);
    });
  };

  const addFlowerBed = (x, z, width, depth, rows = 2) => {
    addBox([width, 0.46, depth], [x, 0.15, z], planterMaterial, { receiveShadow: true });
    addBox([width - 0.32, 0.1, depth - 0.32], [x, 0.42, z], soilMaterial, { castShadow: false });
    const columns = Math.max(3, Math.floor(width / 1.15));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const shrub = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.38 + ((row + column) % 2) * 0.08, 0),
          foliageMaterials[(row + column) % foliageMaterials.length]
        );
        shrub.position.set(
          x - width / 2 + 0.65 + column * ((width - 1.3) / Math.max(columns - 1, 1)),
          0.78,
          z - depth / 2 + 0.62 + row * Math.max(depth - 1.24, 0)
        );
        shrub.scale.y = 0.82;
        shrub.castShadow = true;
        buildingGroup.add(shrub);

        if ((row + column) % 2 === 0) {
          const flower = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), flowerMaterials[(row + column) % flowerMaterials.length]);
          flower.position.set(shrub.position.x, 1.13, shrub.position.z);
          buildingGroup.add(flower);
        }
      }
    }
  };

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(86, 0.65, 62),
    new THREE.MeshStandardMaterial({ color: 0xd7d8d3, roughness: 0.92 })
  );
  ground.position.set(towerX, -0.42, 0);
  ground.receiveShadow = true;
  buildingGroup.add(ground);

  addBox([86, 0.08, 13], [towerX, -0.04, 24.2], new THREE.MeshStandardMaterial({
    color: 0x747b7c,
    roughness: 0.96
  }), { castShadow: false, receiveShadow: true });
  addBox([74, 0.1, 5.5], [towerX, 0.03, 16.2], new THREE.MeshStandardMaterial({
    color: 0xa8aaa5,
    roughness: 0.9
  }), { castShadow: false, receiveShadow: true });

  for (let floor = 1; floor <= 22; floor += 1) {
    const isPodium = floor <= 3;
    const width = isPodium ? 47 : 40;
    const depth = isPodium ? 31 : 26;
    const baseY = (floor - 1) * floorHeight;
    const slabY = baseY + 0.18;
    const geometry = new THREE.BoxGeometry(width, floor === 14 ? 0.42 : 0.26, depth);
    const material = floor === 14 ? highlightMaterial : concreteMaterial;
    const floorMesh = new THREE.Mesh(geometry, material);
    floorMesh.position.set(towerX, slabY, 0);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    floorMesh.userData.floor = floor;
    buildingFloorMeshes.push(floorMesh);
    buildingGroup.add(floorMesh);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.8, 1.84, depth - 0.8),
      isPodium ? podiumGlassMaterial : glassMaterial
    );
    glass.position.set(towerX, baseY + 1.22, 0);
    glass.castShadow = false;
    glass.receiveShadow = true;
    buildingGroup.add(glass);

    if (floor === 14) {
      floor14Object = floorMesh;
      floor14Targets.push(floorMesh);
    }
  }

  // Glass curtain-wall grid on the broad front facade.
  for (let x = -19.5; x <= 19.5; x += 2.6) {
    addBox([0.12, totalHeight - 0.8, 0.16], [towerX + x, totalHeight / 2, towerDepth / 2 - 0.25], mullionMaterial, {
      castShadow: false
    });
  }
  // Narrower grid on both side elevations.
  for (let z = -12; z <= 12; z += 2.4) {
    addBox([0.16, totalHeight - 0.8, 0.12], [towerX - towerWidth / 2 + 0.25, totalHeight / 2, z], mullionMaterial, {
      castShadow: false
    });
    addBox([0.16, totalHeight - 0.8, 0.12], [towerX + towerWidth / 2 - 0.25, totalHeight / 2, z], mullionMaterial, {
      castShadow: false
    });
  }

  // The photo's deep horizontal openings on the right side.
  for (let floor = 4; floor <= 21; floor += 1) {
    const y = (floor - 1) * floorHeight + 1.18;
    addBox([0.28, 1.24, 16.4], [towerX + towerWidth / 2 + 0.04, y, -2.5], recessMaterial, {
      castShadow: false
    });
    addBox([0.46, 0.22, 17.2], [towerX + towerWidth / 2 + 0.24, y - 0.78, -2.5], concreteMaterial);
  }

  // Central stack of projecting balconies with glass rails and dark recesses.
  for (let floor = 4; floor <= 21; floor += 1) {
    const baseY = (floor - 1) * floorHeight;
    const balconyZ = towerDepth / 2 + 1.45;
    addBox([10.8, 0.26, 3.55], [towerX + 7.2, baseY + 0.35, balconyZ], concreteShadeMaterial);
    addBox([10.15, 1.42, 0.22], [towerX + 7.2, baseY + 1.15, towerDepth / 2 + 0.13], recessMaterial, {
      castShadow: false
    });
    addBox([10.2, 0.64, 0.16], [towerX + 7.2, baseY + 0.82, towerDepth / 2 + 3.18], balconyGlassMaterial, {
      castShadow: false
    });
    [-5.05, 5.05].forEach((offsetX) => {
      addBox([0.1, 0.72, 3.05], [towerX + 7.2 + offsetX, baseY + 0.83, balconyZ + 0.12], mullionMaterial, {
        castShadow: false
      });
    });
  }

  // White concrete fins create the strong vertical frame seen in the reference.
  [-20.8, -1.1, 12.9, 20.8].forEach((x) => {
    addBox([0.78, totalHeight + 1.4, 0.82], [towerX + x, totalHeight / 2, towerDepth / 2 + 0.15], concreteMaterial);
  });
  [[-20.8, -13.5], [-20.8, 13.5], [20.8, -13.5], [20.8, 13.5]].forEach(([x, z]) => {
    addBox([0.72, totalHeight + 1.2, 0.72], [towerX + x, totalHeight / 2, z], concreteMaterial);
  });

  // Oversized portal frame on the front glass facade.
  const portalX = towerX - 9.2;
  const portalCenterY = 20.2;
  const portalHeight = 14.5;
  const portalWidth = 12.8;
  addBox([0.82, portalHeight, 1.05], [portalX - portalWidth / 2, portalCenterY, towerDepth / 2 + 0.62], concreteMaterial);
  addBox([0.82, portalHeight, 1.05], [portalX + portalWidth / 2, portalCenterY, towerDepth / 2 + 0.62], concreteMaterial);
  addBox([portalWidth + 0.82, 0.82, 1.05], [portalX, portalCenterY + portalHeight / 2, towerDepth / 2 + 0.62], concreteMaterial);
  addBox([portalWidth + 0.82, 0.82, 1.05], [portalX, portalCenterY - portalHeight / 2, towerDepth / 2 + 0.62], concreteMaterial);

  // Three-level podium, entrance canopy, roof plant and parapets.
  addBox([49, 0.42, 33], [towerX, 6.65, 0], concreteMaterial);
  addBox([14, 0.42, 5], [towerX - 7, 3.3, 17.2], concreteMaterial);
  addBox([18, 3.8, 11], [towerX - 3, totalHeight + 1.9, -2.5], concreteShadeMaterial);
  addBox([10, 2.3, 8], [towerX + 10, totalHeight + 1.15, 3], recessMaterial);
  addBox([43.5, 0.48, 29.5], [towerX, totalHeight + 0.45, 0], concreteMaterial);
  [-19.8, 19.8].forEach((x) => {
    addBox([0.22, 1.2, 27.4], [towerX + x, totalHeight + 1.1, 0], mullionMaterial, { castShadow: false });
  });

  // Scaled streetscape: road markings, crossing, planters and medium-height
  // trees keep the tower dominant while giving the entrance a lived-in context.
  [-12, -3, 6, 15, 24, 33, 42, 51, 60].forEach((x) => {
    addBox([4.6, 0.035, 0.2], [x, 0, 24.2], yellowRoadMarkMaterial, { castShadow: false });
  });
  [19.2, 29.2].forEach((z) => {
    addBox([82, 0.035, 0.14], [towerX, 0, z], roadMarkMaterial, { castShadow: false });
  });
  for (let x = 53; x <= 59; x += 1.35) {
    addBox([0.62, 0.045, 7.2], [x, 0.025, 24.2], roadMarkMaterial, { castShadow: false });
  }

  addFlowerBed(towerX - 14.2, 15.25, 11.5, 2.2);
  addFlowerBed(towerX + 14.7, 15.25, 10.5, 2.2);
  addFlowerBed(towerX - 31.5, 11.2, 6.8, 2.5);
  addFlowerBed(towerX + 31.5, 10.8, 7.4, 2.5);

  [
    [towerX - 32, 6.8, 0.98, 0],
    [towerX - 27, 15.3, 0.82, 1],
    [towerX - 19.5, 15.2, 0.78, 2],
    [towerX + 20.5, 15.3, 0.8, 1],
    [towerX + 27.5, 14.6, 0.88, 2],
    [towerX + 34, 6.5, 1.02, 0]
  ].forEach((tree) => addTree(...tree));

  const signBlueMaterial = new THREE.MeshStandardMaterial({ color: 0x315f7e, roughness: 0.5, metalness: 0.12 });
  const signWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f0e9, roughness: 0.72 });
  const signPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x747b7c, roughness: 0.48, metalness: 0.55 });
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.1, 10), signPoleMaterial);
  signPole.position.set(towerX + 33.2, 1.55, 17.1);
  signPole.castShadow = true;
  buildingGroup.add(signPole);
  addBox([2.25, 1.2, 0.16], [towerX + 33.2, 3.15, 17.1], signBlueMaterial);
  addBox([1.35, 0.12, 0.05], [towerX + 33.2, 3.22, 17.0], signWhiteMaterial, { castShadow: false });
  addBox([0.12, 0.46, 0.05], [towerX + 33.72, 3.22, 17.0], signWhiteMaterial, { castShadow: false });
}

const cameraStates = {
  building: {
    position: new THREE.Vector3(92, 55, 92),
    target: new THREE.Vector3(24, 23, 0)
  },
  perspective: {
    position: new THREE.Vector3(105, 102, 118),
    target: new THREE.Vector3(0, 0, 0)
  },
  top: {
    position: new THREE.Vector3(0, 178, 0.01),
    target: new THREE.Vector3(0, 0, 0)
  }
};

let animation = null;

function moveCamera(state, duration = 850) {
  animation = {
    start: performance.now(),
    duration,
    fromPosition: camera.position.clone(),
    toPosition: state.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: state.target.clone()
  };
  updateAutoRotate();
}

function updateCameraAnimation(now) {
  if (!animation) return;
  const progress = Math.min((now - animation.start) / animation.duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  camera.position.lerpVectors(animation.fromPosition, animation.toPosition, eased);
  controls.target.lerpVectors(animation.fromTarget, animation.toTarget, eased);
  if (progress === 1) {
    animation = null;
    if (sceneMode === 'building') syncBuildingAutoZoomBase();
    updateAutoRotate();
  }
}

function setActiveView(name) {
  activeViewName = name;
  document.querySelector('#view-3d').classList.toggle('active', name === 'perspective');
  document.querySelector('#view-top').classList.toggle('active', name === 'top');
  updateAutoRotate();
}

function enterFloorPlan() {
  if (sceneMode === 'floor') return;
  sceneMode = 'floor';
  applySceneTheme('floor');
  document.querySelector('#app').classList.remove('building-mode');
  document.querySelector('#app').classList.add('floor-plan-mode');
  buildingGroup.visible = false;
  model.visible = true;
  setActiveView('perspective');
  moveCamera(cameraStates.perspective, 1050);
  controls.minDistance = 35;
  controls.maxDistance = 280;
  invalidateShadows();
  renderer.domElement.style.cursor = '';
  markPowerActivity();
}

function showBuildingOverview() {
  if (sceneMode === 'building') return;
  exitPowerSave(false);
  closeCctvConnection();
  sceneMode = 'building';
  applySceneTheme('building');
  document.querySelector('#app').classList.remove('floor-plan-mode');
  document.querySelector('#app').classList.add('building-mode');
  setDevicePanel(false);
  clearDeviceHover();
  clearRoomTooltip();
  setRoomHighlight(-1);
  model.visible = false;
  buildingGroup.visible = true;
  activeViewName = 'building';
  moveCamera(cameraStates.building, 1050);
  controls.minDistance = 48;
  controls.maxDistance = 210;
  invalidateShadows();
  renderer.domElement.style.cursor = '';
}

document.querySelector('#enter-14f').addEventListener('click', enterFloorPlan);
document.querySelector('#back-building').addEventListener('click', showBuildingOverview);

function zoomBuilding(factor) {
  if (sceneMode !== 'building') return;
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance));
  syncBuildingAutoZoomBase(distance);
  controls.update();
  markPowerActivity();
}

document.querySelector('#building-zoom-in').addEventListener('click', () => zoomBuilding(0.82));
document.querySelector('#building-zoom-out').addEventListener('click', () => zoomBuilding(1.22));
document.querySelector('#building-rotate').addEventListener('click', (event) => {
  buildingAutoRotateEnabled = !buildingAutoRotateEnabled;
  event.currentTarget.classList.toggle('active', buildingAutoRotateEnabled);
  event.currentTarget.setAttribute('aria-pressed', String(buildingAutoRotateEnabled));
  updateAutoRotate();
});

document.querySelector('#view-3d').addEventListener('click', () => {
  setActiveView('perspective');
  moveCamera(cameraStates.perspective);
});

document.querySelector('#view-top').addEventListener('click', () => {
  setActiveView('top');
  moveCamera(cameraStates.top);
});

document.querySelector('#reset-view').addEventListener('click', () => {
  setActiveView('perspective');
  moveCamera(cameraStates.perspective);
});

document.querySelector('#fullscreen').addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
});

updateAutoRotate();

const devicePanel = document.querySelector('#device-panel');
const deviceControlsButton = document.querySelector('#device-controls');
const meetingRoomSelect = document.querySelector('#meeting-room-select');
const meetingStatusToggle = document.querySelector('#meeting-status-toggle');
const meetingStatusButtons = [...document.querySelectorAll('[data-meeting-status]')];
const lightingSelect = document.querySelector('#lighting-select');
const lightingStateButtons = [...document.querySelectorAll('[data-lighting-state]')];
const lightingGroupButtons = [...document.querySelectorAll('[data-lighting-group]')];
const lightingGroupStatus = document.querySelector('#lighting-group-status');
const lightingTimeButtons = [...document.querySelectorAll('[data-lighting-time]')];
const daylightStatus = document.querySelector('#daylight-status');
const cctvSelect = document.querySelector('#cctv-select');
const cctvStateButtons = [...document.querySelectorAll('[data-cctv-state]')];
const cctvAngleSelect = document.querySelector('#cctv-angle-select');
const powerPanel = document.querySelector('#power-panel');
const powerControlsButton = document.querySelector('#power-controls');
const powerSaveToggle = document.querySelector('#power-save-toggle');
const powerSaveMinutesInput = document.querySelector('#power-save-minutes');
const powerStatusTitle = document.querySelector('#power-status-title');
const powerStatusDetail = document.querySelector('#power-status-detail');
const POWER_SAVE_ENABLED_KEY = 'three-floor-plan-power-save-enabled';
const POWER_SAVE_MINUTES_KEY = 'three-floor-plan-power-save-minutes';
let powerSaveEnabled = readLocalSetting(POWER_SAVE_ENABLED_KEY) !== 'false';
let powerSaveMinutes = THREE.MathUtils.clamp(Number(readLocalSetting(POWER_SAVE_MINUTES_KEY)) || 3, 1, 60);
let lightingTimeMode = ['auto', 'morning', 'evening'].includes(readLocalSetting(LIGHT_TIME_MODE_KEY))
  ? readLocalSetting(LIGHT_TIME_MODE_KEY)
  : 'auto';
let lastPowerActivity = Date.now();
let lastActivityUpdate = 0;

function getLightingTime() {
  if (lightingTimeMode === 'morning') return 8;
  if (lightingTimeMode === 'evening') return 17.25;
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function applyTimeLighting() {
  if (sceneMode !== 'floor') return;
  const hour = getLightingTime();
  const daylight = hour >= 6 && hour <= 18;
  const background = new THREE.Color();

  if (daylight) {
    const progress = THREE.MathUtils.clamp((hour - 6) / 12, 0, 1);
    const elevation = Math.sin(progress * Math.PI);
    const warmEdge = Math.abs(progress - 0.5) * 2;
    const morningColor = new THREE.Color(0xffd19a);
    const eveningColor = new THREE.Color(0xffa56a);
    const noonColor = new THREE.Color(0xfff8e8);
    const edgeColor = progress < 0.5 ? morningColor : eveningColor;
    const sunColor = noonColor.clone().lerp(edgeColor, warmEdge * 0.72);

    sun.position.set(
      Math.cos(progress * Math.PI) * 92,
      16 + elevation * 82,
      30 + Math.sin(progress * Math.PI) * 38
    );
    sun.color.copy(sunColor);
    // Keep the floor-plan shadows readable without letting walls, columns and
    // devices produce heavy dark patches across the plan.
    sun.intensity = 1.05 + elevation * 1.2;
    hemisphere.intensity = 0.9 + elevation * 0.5;
    fill.intensity = 0.28 + elevation * 0.28;
    renderer.toneMappingExposure = 0.65 + elevation * 0.12;

    const morningBackground = new THREE.Color(0xbfc8cd);
    const noonBackground = new THREE.Color(0xc9cbc6);
    const eveningBackground = new THREE.Color(0xc9b9ae);
    background.copy(progress < 0.5 ? morningBackground : eveningBackground).lerp(noonBackground, elevation);

    if (floorWallMaterial) {
      const morningWall = new THREE.Color(0xf0eee7);
      const noonWall = new THREE.Color(0xc4c6c0);
      const eveningWall = new THREE.Color(0xa8a7a1);
      const wallColor = progress < 0.5
        ? morningWall.lerp(noonWall, progress * 2)
        : noonWall.lerp(eveningWall, (progress - 0.5) * 2);
      floorWallMaterial.color.copy(wallColor);
    }
  } else {
    const beforeDawn = hour < 6;
    sun.position.set(beforeDawn ? 76 : -76, 30, -42);
    sun.color.setHex(0x9db7df);
    sun.intensity = 0.48;
    hemisphere.intensity = 0.58;
    fill.intensity = 0.24;
    renderer.toneMappingExposure = 0.58;
    background.setHex(0x8f969e);
    floorWallMaterial?.color.setHex(0x8a8e91);
  }

  hemisphere.color.setHex(daylight ? 0xeaf0ee : 0x9caccc);
  hemisphere.groundColor.setHex(daylight ? 0x747970 : 0x3f4650);
  fill.color.setHex(daylight ? 0xb7c9da : 0x7188ad);
  scene.background.copy(background);
  scene.fog.color.copy(background);
  updateOfficeLightingLevel();
  invalidateShadows();
}

function syncLightingTimeControls() {
  lightingTimeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lightingTime === lightingTimeMode));
  });
  const hour = getLightingTime();
  const hours = Math.floor(hour);
  const minutes = Math.floor((hour - hours) * 60);
  const labels = {
    auto: `跟隨系統時間・${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    morning: '早晨模式・08:00',
    evening: '傍晚模式・17:15'
  };
  daylightStatus.textContent = labels[lightingTimeMode];
}

lightingTimeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    lightingTimeMode = button.dataset.lightingTime;
    writeLocalSetting(LIGHT_TIME_MODE_KEY, lightingTimeMode);
    syncLightingTimeControls();
    applyTimeLighting();
    markPowerActivity();
  });
});
syncLightingTimeControls();
setInterval(() => {
  if (lightingTimeMode !== 'auto') return;
  syncLightingTimeControls();
  applyTimeLighting();
}, 60000);

function syncMeetingRoomControls() {
  const state = meetingRoomStates[meetingRoomSelect.value];
  if (!state) return;
  meetingStatusToggle.checked = state.enabled;
  meetingStatusButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.meetingStatus === state.status));
  });
}

meetingRoomSelect.addEventListener('change', syncMeetingRoomControls);
meetingStatusToggle.addEventListener('change', () => {
  const roomId = meetingRoomSelect.value;
  meetingRoomStates[roomId].enabled = meetingStatusToggle.checked;
  updateMeetingRoomVisual(roomId);
  saveMeetingRoomStates();
});
meetingStatusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const roomId = meetingRoomSelect.value;
    meetingRoomStates[roomId].status = button.dataset.meetingStatus;
    meetingRoomStates[roomId].enabled = true;
    syncMeetingRoomControls();
    updateMeetingRoomVisual(roomId);
    saveMeetingRoomStates();
  });
});
syncMeetingRoomControls();

function syncLightingControls() {
  const state = lightingStates[lightingSelect.value];
  if (!state) return;
  lightingStateButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String((button.dataset.lightingState === 'on') === state.on));
  });
  const activeCount = LIGHTING_FIXTURES.reduce(
    (count, fixture) => count + (lightingStates[fixture.id]?.on ? 1 : 0),
    0
  );
  lightingGroupStatus.textContent = activeCount === LIGHTING_FIXTURES.length
    ? '全部開啟'
    : activeCount === 0
      ? '全部關閉'
      : `${activeCount} / ${LIGHTING_FIXTURES.length} 已開啟`;
  lightingGroupButtons.forEach((button) => {
    const isAllOn = activeCount === LIGHTING_FIXTURES.length;
    const isAllOff = activeCount === 0;
    button.setAttribute('aria-pressed', String(
      button.dataset.lightingGroup === 'on' ? isAllOn : isAllOff
    ));
  });
}

lightingSelect.addEventListener('change', syncLightingControls);
lightingStateButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const lightId = lightingSelect.value;
    lightingStates[lightId].on = button.dataset.lightingState === 'on';
    updateLightingObject(lightId);
    saveLightingStates();
    updateOfficeLightingLevel();
    syncLightingControls();
  });
});
lightingGroupButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const turnOn = button.dataset.lightingGroup === 'on';
    LIGHTING_FIXTURES.forEach((fixture) => {
      lightingStates[fixture.id].on = turnOn;
      updateLightingObject(fixture.id);
    });
    saveLightingStates();
    updateOfficeLightingLevel();
    syncLightingControls();
    markPowerActivity();
  });
});
syncLightingControls();

function syncCctvControls() {
  const state = cctvStates[cctvSelect.value];
  if (!state) return;
  cctvStateButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String((button.dataset.cctvState === 'online') === state.online));
  });
  cctvAngleSelect.value = state.direction;
}

cctvSelect.addEventListener('change', () => {
  syncCctvControls();
  selectObjectForAdjustment(cctvObjects.get(cctvSelect.value));
});
cctvStateButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const cctvId = cctvSelect.value;
    cctvStates[cctvId].online = button.dataset.cctvState === 'online';
    updateCctvObject(cctvId);
    saveCctvStates();
    syncCctvControls();
  });
});
cctvAngleSelect.addEventListener('change', () => {
  const cctvId = cctvSelect.value;
  cctvStates[cctvId].direction = cctvAngleSelect.value;
  updateCctvObject(cctvId);
  saveCctvStates();
});
syncCctvControls();

document.querySelector('#close-cctv-modal').addEventListener('click', closeCctvConnection);
cctvModal.addEventListener('pointerdown', (event) => {
  if (event.target === cctvModal) closeCctvConnection();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cctvModal.classList.contains('open')) closeCctvConnection();
});

powerSaveToggle.checked = powerSaveEnabled;
powerSaveMinutesInput.value = String(powerSaveMinutes);

function setPowerPanel(open) {
  powerPanel.classList.toggle('open', open);
  powerControlsButton.classList.toggle('active', open);
  powerControlsButton.setAttribute('aria-expanded', String(open));
}

function formatPowerCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes > 0) return `${minutes} 分 ${String(remainder).padStart(2, '0')} 秒後進入省電模式`;
  return `${remainder} 秒後進入省電模式`;
}

function updatePowerStatus() {
  document.querySelector('#app').classList.toggle('power-save-active', powerSaveActive);
  powerControlsButton.classList.toggle('power-saving', powerSaveActive);
  if (powerSaveActive) {
    powerStatusTitle.textContent = '2D 省電中';
    powerStatusDetail.textContent = '移動滑鼠即可恢復 3D';
    return;
  }
  if (!powerSaveEnabled) {
    powerStatusTitle.textContent = '省電模式已關閉';
    powerStatusDetail.textContent = '開啟後可設定自動切換時間';
    return;
  }
  if (sceneMode !== 'floor') {
    powerStatusTitle.textContent = '等待進入 14F';
    powerStatusDetail.textContent = '進入平面圖後開始計時';
    return;
  }
  powerStatusTitle.textContent = '3D 運行中';
  powerStatusDetail.textContent = formatPowerCountdown(powerSaveMinutes * 60000 - (Date.now() - lastPowerActivity));
}

function enterPowerSave() {
  if (!powerSaveEnabled || powerSaveActive || sceneMode !== 'floor' || draggingDevice) return;
  powerSaveActive = true;
  closeCctvConnection();
  clearDeviceHover();
  clearRoomTooltip();
  setRoomHighlight(-1);
  controls.enabled = false;
  renderer.shadowMap.autoUpdate = false;
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  setActiveView('top');
  moveCamera(cameraStates.top, 700);
  updatePowerStatus();
}

function exitPowerSave(restore3D = true) {
  if (!powerSaveActive) return;
  powerSaveActive = false;
  controls.enabled = true;
  invalidateShadows();
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(innerWidth, innerHeight);
  lastPowerActivity = Date.now();
  if (restore3D && sceneMode === 'floor') {
    setActiveView('perspective');
    moveCamera(cameraStates.perspective, 700);
  }
  updatePowerStatus();
}

function markPowerActivity() {
  const now = Date.now();
  if (powerSaveActive) {
    exitPowerSave(true);
    return;
  }
  if (now - lastActivityUpdate < 500) return;
  lastActivityUpdate = now;
  lastPowerActivity = now;
  updatePowerStatus();
}

function setDevicePanel(open) {
  devicePanel.classList.toggle('open', open);
  deviceControlsButton.classList.toggle('active', open);
  deviceControlsButton.setAttribute('aria-expanded', String(open));
}

deviceControlsButton.addEventListener('click', () => {
  setPowerPanel(false);
  setDevicePanel(!devicePanel.classList.contains('open'));
});
document.querySelector('#close-device-panel').addEventListener('click', () => setDevicePanel(false));
powerControlsButton.addEventListener('click', () => {
  setDevicePanel(false);
  setPowerPanel(!powerPanel.classList.contains('open'));
});
document.querySelector('#close-power-panel').addEventListener('click', () => setPowerPanel(false));

powerSaveToggle.addEventListener('change', () => {
  powerSaveEnabled = powerSaveToggle.checked;
  writeLocalSetting(POWER_SAVE_ENABLED_KEY, String(powerSaveEnabled));
  lastPowerActivity = Date.now();
  if (!powerSaveEnabled) exitPowerSave(true);
  updatePowerStatus();
});

function applyPowerSaveMinutes(normalize = false) {
  const inputMinutes = Number(powerSaveMinutesInput.value);
  if (!Number.isFinite(inputMinutes) || inputMinutes < 1) {
    if (normalize) powerSaveMinutesInput.value = String(powerSaveMinutes);
    return;
  }
  powerSaveMinutes = THREE.MathUtils.clamp(Math.round(inputMinutes), 1, 60);
  if (normalize) powerSaveMinutesInput.value = String(powerSaveMinutes);
  writeLocalSetting(POWER_SAVE_MINUTES_KEY, String(powerSaveMinutes));
  lastPowerActivity = Date.now();
  updatePowerStatus();
}

powerSaveMinutesInput.addEventListener('input', () => applyPowerSaveMinutes(false));
powerSaveMinutesInput.addEventListener('change', () => applyPowerSaveMinutes(true));

['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((eventName) => {
  window.addEventListener(eventName, markPowerActivity, { passive: true });
});

setInterval(() => {
  if (powerSaveEnabled && !powerSaveActive && sceneMode === 'floor' && Date.now() - lastPowerActivity >= powerSaveMinutes * 60000) {
    enterPowerSave();
  }
  updatePowerStatus();
}, 1000);

updatePowerStatus();

document.querySelector('#add-device').addEventListener('click', () => {
  addDevice(document.querySelector('#new-device-type').value);
});

document.querySelector('#device-drag-toggle').addEventListener('change', (event) => {
  deviceDragEnabled = event.target.checked;
  if (!deviceDragEnabled) finishDeviceDrag();
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (sceneMode === 'floor') document.querySelector('.interaction-hint').classList.add('used');
  if (sceneMode === 'building' && event.button === 0) {
    setPointerFromEvent(event);
    const buildingTargets = [...buildingFloorMeshes, ...floor14Targets.filter((target) => target.isSprite)];
    const floorHit = raycaster.intersectObjects(buildingTargets, false)[0];
    if (floorHit?.object.userData.floor === 14) {
      enterFloorPlan();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    return;
  }
  if (sceneMode === 'floor' && event.button === 0) {
    setPointerFromEvent(event);
    const cctvHit = raycaster.intersectObjects(cctvPickTargets, true)[0];
    const cctv = cctvHit ? getCctvRoot(cctvHit.object) : null;
    if (cctv) {
      if (deviceDragEnabled) beginObjectDrag(cctv, event);
      else {
        openCctvConnection(cctv.userData.cctvId);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }
  }
  if (!deviceDragEnabled || event.button !== 0) return;
  setPointerFromEvent(event);
  const hit = raycaster.intersectObjects(devicePickTargets, true)[0];
  const device = hit ? getDeviceRoot(hit.object) : null;
  if (!device) return;
  beginObjectDrag(device, event);
}, { capture: true });

function handleScenePointerMove(event) {
  if (!pointerOverScene) {
    pointerOverScene = true;
    updateAutoRotate();
  }
  setPointerFromEvent(event);
  if (sceneMode === 'building') {
    const buildingTargets = [...buildingFloorMeshes, ...floor14Targets.filter((target) => target.isSprite)];
    const floorHit = raycaster.intersectObjects(buildingTargets, false)[0];
    const isFloor14 = floorHit?.object.userData.floor === 14;
    if (floor14Object) floor14Object.scale.set(isFloor14 ? 1.025 : 1, isFloor14 ? 1.12 : 1, isFloor14 ? 1.025 : 1);
    renderer.domElement.style.cursor = isFloor14 ? 'pointer' : '';
    clearDeviceHover();
    clearRoomTooltip();
    return;
  }
  if (!deviceObjects.size) return;
  if (draggingDevice) {
    setRoomHighlight(-1);
    clearRoomTooltip();
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      draggingDevice.position.x = THREE.MathUtils.clamp(dragPoint.x, -PLAN_WIDTH / 2, PLAN_WIDTH / 2);
      draggingDevice.position.z = THREE.MathUtils.clamp(dragPoint.z, -PLAN_DEPTH / 2, PLAN_DEPTH / 2);
      if (!draggingDevice.userData.cctvId) {
        updateDeviceBeacon(draggingDevice);
        syncDeviceCard(draggingDevice);
      }
    }
    renderer.domElement.style.cursor = 'grabbing';
    return;
  }
  const cctvHit = raycaster.intersectObjects(cctvPickTargets, true)[0];
  const cctv = cctvHit ? getCctvRoot(cctvHit.object) : null;
  if (cctv) {
    setRoomHighlight(-1);
    clearDeviceHover();
    clearRoomTooltip();
    renderer.domElement.style.cursor = deviceDragEnabled ? 'grab' : 'pointer';
    return;
  }
  const roomRegionId = updateRoomHighlight();
  const hit = raycaster.intersectObjects(devicePickTargets, true)[0];
  const device = hit ? getDeviceRoot(hit.object) : null;

  if (!device) {
    clearDeviceHover();
    updateRoomTooltip(roomRegionId, event.clientX, event.clientY);
    return;
  }

  clearRoomTooltip();

  if (hoveredDevice !== device) {
    if (hoveredDevice) hoveredDevice.scale.setScalar(hoveredDevice.userData.baseScale || 1);
    hoveredDevice = device;
    hoveredDevice.scale.setScalar((hoveredDevice.userData.baseScale || 1) * 1.07);
  }
  renderer.domElement.style.cursor = deviceDragEnabled ? 'grab' : 'help';
  updateDeviceTooltip(device, event.clientX, event.clientY);
}

let pendingPointerMove = null;
let pointerMoveFrame = 0;
renderer.domElement.addEventListener('pointermove', (event) => {
  pendingPointerMove = event;
  if (pointerMoveFrame) return;
  pointerMoveFrame = requestAnimationFrame(() => {
    pointerMoveFrame = 0;
    const nextEvent = pendingPointerMove;
    pendingPointerMove = null;
    if (nextEvent) handleScenePointerMove(nextEvent);
  });
}, { passive: true });

renderer.domElement.addEventListener('pointerup', finishDeviceDrag);
renderer.domElement.addEventListener('pointercancel', finishDeviceDrag);
renderer.domElement.addEventListener('pointerleave', () => {
  clearDeviceHover();
  clearRoomTooltip();
  setRoomHighlight(-1);
  if (floor14Object) floor14Object.scale.set(1, 1, 1);
  if (!draggingDevice) renderer.domElement.style.cursor = '';
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

async function init() {
  createBuildingOverview();
  document.querySelector('#app').classList.add('building-mode');
  model.visible = false;
  camera.position.copy(cameraStates.building.position);
  controls.target.copy(cameraStates.building.target);
  controls.minDistance = 48;
  controls.maxDistance = 210;
  controls.update();
  syncBuildingAutoZoomBase();
  try {
    const response = await fetch(SVG_URL);
    if (!response.ok) throw new Error(`SVG request failed: ${response.status}`);
    const svgText = await response.text();
    const { texture, labelTexture, svg } = await makePlanTexture(svgText);
    createFoundation(texture, labelTexture);
    const wallSegments = collectWallSegments(svg);
    createWallInstances(wallSegments);
    createRoomHoverMap(wallSegments);
    createColumns(svg);
    createMeetingRoomStatusVisuals();
    createLightingFixtures();
    createCctvFixtures();
    createDevices();
    requestAnimationFrame(() => loading.classList.add('hidden'));
  } catch (error) {
    console.error(error);
    loading.classList.add('hidden');
  }
}

const AUTO_ROTATE_AXIS = new THREE.Vector3(0, 1, 0);
const AUTO_ROTATE_SPEED = THREE.MathUtils.degToRad(3.6);
const autoRotateOffset = new THREE.Vector3();
let previousFrameTime = performance.now();
let lastRenderTime = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const frameInterval = powerSaveActive ? 1000 : 1000 / RENDER_FPS;
  if (!animation && now - lastRenderTime < frameInterval) return;
  lastRenderTime = now;
  const deltaSeconds = Math.min((now - previousFrameTime) / 1000, 0.05);
  previousFrameTime = now;
  updateCameraAnimation(now);
  if (autoRotateActive) {
    autoRotateOffset.copy(camera.position).sub(controls.target);
    autoRotateOffset.applyAxisAngle(AUTO_ROTATE_AXIS, AUTO_ROTATE_SPEED * deltaSeconds);
    if (sceneMode === 'building') {
      const autoZoomDistance = THREE.MathUtils.clamp(
        buildingAutoZoomBaseDistance * getBuildingAutoZoomPulse(now),
        controls.minDistance,
        controls.maxDistance
      );
      autoRotateOffset.setLength(autoZoomDistance);
    }
    camera.position.copy(controls.target).add(autoRotateOffset);
  }
  alertDevices.forEach((device) => {
    const glow = device.userData.beacon?.userData.glowMaterial;
    if (glow) glow.uniforms.uTime.value = now * 0.001;
    const aura = device.userData.alertAura;
    if (aura?.visible) {
      const pulse = 1 + Math.sin(now * 0.0032) * 0.07;
      aura.material.opacity = 0.7 + Math.sin(now * 0.0032) * 0.1;
      aura.scale.set(aura.userData.baseScale.x * pulse, aura.userData.baseScale.y * pulse, 1);
      device.userData.alertLight.intensity = 25 + Math.sin(now * 0.0032) * 7;
    }
  });
  controls.update();
  renderer.render(scene, camera);
}

init();
animate(performance.now());

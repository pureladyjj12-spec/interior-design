import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   ARCHI-CUT 3D | Isometric Cutaway Interior Studio
   - Scale: 1 Three.js Unit = 1,000 mm (1 meter)
   ========================================================================= */

const MM_TO_UNIT = 0.001;
const UNIT_TO_MM = 1000;

// 애플리케이션 전역 상태
const state = {
  viewMode: '3d', // '3d' | '2d' | 'ref'
  currentPreset: '84A',
  planWidthMm: 11200,
  planDepthMm: 9200,
  wallHeightMm: 1450,
  wallCapColor: '#141414',
  woodTone: 'bright-oak',
  sunAngleDeg: 42,
  showBathroom: true,
  showKitchen: true,
  showUtility: true,
  showOpenings: true,
  showArchFrame: true,
  showRoomLabels: false,
  showDims: true,

  // 첨부된 도면 이미지 상태
  uploadedFloorplanUrl: null,
  uploadedFloorplanImg: null,
  uploadedFloorplanTexture: null,
  floorplanOpacity: 0.85,

  // 현재 도면 공간 데이터 (방, 벽체, 창호, 빌트인)
  floorplanData: null,

  // 사용자가 배치한 가구/가전/소품 목록 ([공간 요소] 규칙에 따라 초기값은 빈 배열)
  placedItems: [],
  selectedItemId: null,

  // 가구 추가 폼의 임시 업로드 이미지
  pendingItemImgUrl: null,
  pendingItemCategory: 'furniture',

  // 2D 도면 편집기 상태
  tool2D: 'select',
  selected2DElement: null
};

// 실측 원클릭 카탈로그 데이터 (가로 W, 깊이 D, 높이 H, 바닥띄움 Y 단위: mm)
const QUICK_CATALOG = [
  { name: '3.5인 패브릭 소파', cat: 'furniture', shape: 'sofa', w: 2300, d: 960, h: 780, y: 0, color: '#EAE6DF' },
  { name: '퀸 침대 (Q)', cat: 'furniture', shape: 'bed', w: 1600, d: 2100, h: 920, y: 0, color: '#F2EFE9' },
  { name: '슈퍼싱글 침대 (SS)', cat: 'furniture', shape: 'bed', w: 1200, d: 2080, h: 880, y: 0, color: '#E8E6E1' },
  { name: '6인 원목 식탁', cat: 'furniture', shape: 'table', w: 1800, d: 850, h: 750, y: 0, color: '#D4B28C' },
  { name: '라운지 암체어', cat: 'furniture', shape: 'chair', w: 760, d: 780, h: 740, y: 0, color: '#DFD9CE' },
  { name: '슬라이딩 옷장', cat: 'furniture', shape: 'cabinet', w: 1800, d: 620, h: 2100, y: 0, color: '#F7F7F5' },
  { name: '거실 낮은 거실장', cat: 'furniture', shape: 'cabinet', w: 2000, d: 420, h: 450, y: 0, color: '#D9BC96' },
  { name: '서재 데스크', cat: 'furniture', shape: 'table', w: 1400, d: 700, h: 740, y: 0, color: '#E5CFAF' },
  { name: '4도어 비스포크 냉장고', cat: 'appliance', shape: 'appliance', w: 912, d: 930, h: 1853, y: 0, color: '#F4F4F2' },
  { name: '75인치 벽걸이 TV', cat: 'appliance', shape: 'tv', w: 1670, d: 55, h: 960, y: 850, color: '#1C1C1C' },
  { name: '타워형 스탠드 에어컨', cat: 'appliance', shape: 'appliance', w: 380, d: 360, h: 1880, y: 0, color: '#F8F8F6' },
  { name: '로봇청소기 스테이션', cat: 'appliance', shape: 'appliance', w: 420, d: 450, h: 560, y: 0, color: '#FFFFFF' },
  { name: '대형 몬스테라 화분', cat: 'prop', shape: 'plant', w: 480, d: 480, h: 1150, y: 0, color: '#4A7C59' },
  { name: '플로어 스탠드 조명', cat: 'prop', shape: 'lamp', w: 380, d: 380, h: 1580, y: 0, color: '#F5E8C7' },
  { name: '거실 우븐 러그', cat: 'prop', shape: 'rug', w: 2400, d: 1700, h: 15, y: 0, color: '#E4DFD5' },
  { name: '캔버스 아트 액자', cat: 'prop', shape: 'frame', w: 900, d: 40, h: 1100, y: 1050, color: '#D8C7B4' }
];

/* =========================================================================
   표준 한국형 평면도 템플릿 정의 (단위: mm, 좌상단 (0,0) ~ 우하단 (W, D))
   - 레퍼런스 이미지(reference-cutaway.jpg)의 공간 구성과 비율을 정밀 재현
   ========================================================================= */
function getPresetFloorplan(presetKey) {
  if (presetKey === '59A') {
    const W = 9600, D = 8200;
    return {
      title: '59㎡ COMPACT 3-BAY APARTMENT · SCALE 1:100 (UNIT: MM)',
      widthMm: W,
      depthMm: D,
      rooms: [
        { id: 'r_foyer', name: '현관', type: 'foyer', x: 0, z: 3600, w: 1500, d: 1800 },
        { id: 'r_balcony', name: '발코니', type: 'balcony', x: 1500, z: 0, w: 3800, d: 1350 },
        { id: 'r_living', name: '거실', type: 'wood', x: 1500, z: 1350, w: 4500, d: 6850 },
        { id: 'r_kitchen', name: '주방', type: 'wood', x: 3800, z: 0, w: 3200, d: 3600 },
        { id: 'r_utility', name: '실외실/다용도실', type: 'utility', x: 2400, z: 0, w: 1400, d: 2100 },
        { id: 'r_bed1', name: '안방(침실1)', type: 'wood', x: 6000, z: 1600, w: 3600, d: 3600 },
        { id: 'r_bed2', name: '침실2', type: 'wood', x: 6000, z: 5200, w: 3600, d: 3000 },
        { id: 'r_bath1', name: '욕실', type: 'bath', x: 7000, z: 0, w: 2600, d: 1600 }
      ],
      walls: [
        // 외벽
        { x1: 1500, z1: 0, x2: 9600, z2: 0, thick: 220, ext: true },
        { x1: 9600, z1: 0, x2: 9600, z2: 8200, thick: 220, ext: true },
        { x1: 1500, z1: 8200, x2: 9600, z2: 8200, thick: 220, ext: true },
        { x1: 1500, z1: 5400, x2: 1500, z2: 8200, thick: 220, ext: true },
        { x1: 0, z1: 3600, x2: 1500, z2: 3600, thick: 220, ext: true },
        { x1: 0, z1: 3600, x2: 0, z2: 5400, thick: 220, ext: true },
        { x1: 0, z1: 5400, x2: 1500, z2: 5400, thick: 220, ext: true },
        { x1: 1500, z1: 0, x2: 1500, z2: 3600, thick: 200, ext: true },
        // 내벽
        { x1: 2400, z1: 0, x2: 2400, z2: 2100, thick: 150 },
        { x1: 2400, z1: 2100, x2: 3800, z2: 2100, thick: 150 },
        { x1: 3800, z1: 0, x2: 3800, z2: 2100, thick: 150 },
        { x1: 7000, z1: 0, x2: 7000, z2: 1600, thick: 150 },
        { x1: 6000, z1: 1600, x2: 9600, z2: 1600, thick: 150 },
        { x1: 6000, z1: 1600, x2: 6000, z2: 8200, thick: 150 },
        { x1: 6000, z1: 5200, x2: 9600, z2: 5200, thick: 150 },
        { x1: 1500, z1: 4800, x2: 3300, z2: 4800, thick: 150 }
      ],
      openings: [
        // 베란다 통창 새시 & 외창 & 방문
        { type: 'sash', x1: 1500, z1: 1350, x2: 3800, z2: 1350 },
        { type: 'balcony-rail', x1: 1500, z1: 0, x2: 3800, z2: 0 },
        { type: 'window', x1: 1500, z1: 5800, x2: 1500, z2: 7800 },
        { type: 'window', x1: 6600, z1: 8200, x2: 8800, z2: 8200 },
        { type: 'window', x1: 9600, z1: 2300, x2: 9600, z2: 4300 },
        { type: 'door', x1: 6000, z1: 2400, x2: 6000, z2: 3300 },
        { type: 'door', x1: 6000, z1: 5600, x2: 6000, z2: 6500 },
        { type: 'door', x1: 7000, z1: 600, x2: 7000, z2: 1400 },
        { type: 'door', x1: 2700, z1: 2100, x2: 3500, z2: 2100 },
        { type: 'sash', x1: 1500, z1: 3800, x2: 1500, z2: 5200 }
      ],
      fixtures: {
        kitchen: { x: 5200, z: 950, rot: 0, islandX: 5000, islandZ: 2450 },
        utility: { x: 3100, z: 700, rot: 0 },
        baths: [
          { x: 8300, z: 800, w: 2400, d: 1400, hasTub: true, hasBooth: true }
        ],
        foyerShoe: { x: 750, z: 3850, w: 1200, d: 380 }
      }
    };
  }

  if (presetKey === '38S') {
    const W = 7400, D = 6400;
    return {
      title: '38㎡ MINIMAL STUDIO LOFT · SCALE 1:100 (UNIT: MM)',
      widthMm: W,
      depthMm: D,
      rooms: [
        { id: 'r_foyer', name: '현관', type: 'foyer', x: 0, z: 4400, w: 1600, d: 2000 },
        { id: 'r_utility', name: '실외실/세탁실', type: 'utility', x: 0, z: 2400, w: 1600, d: 2000 },
        { id: 'r_bath1', name: '욕실', type: 'bath', x: 0, z: 0, w: 2600, d: 2400 },
        { id: 'r_living', name: '거실/침실 통합', type: 'wood', x: 1600, z: 2400, w: 5800, d: 4000 },
        { id: 'r_kitchen', name: '주방', type: 'wood', x: 2600, z: 0, w: 4800, d: 2400 }
      ],
      walls: [
        { x1: 0, z1: 0, x2: 7400, z2: 0, thick: 220, ext: true },
        { x1: 7400, z1: 0, x2: 7400, z2: 6400, thick: 220, ext: true },
        { x1: 0, z1: 6400, x2: 7400, z2: 6400, thick: 220, ext: true },
        { x1: 0, z1: 0, x2: 0, z2: 6400, thick: 220, ext: true },
        { x1: 2600, z1: 0, x2: 2600, z2: 2400, thick: 150 },
        { x1: 0, z1: 2400, x2: 2600, z2: 2400, thick: 150 },
        { x1: 1600, z1: 2400, x2: 1600, z2: 6400, thick: 150 },
        { x1: 0, z1: 4400, x2: 1600, z2: 4400, thick: 150 }
      ],
      openings: [
        { type: 'sash', x1: 2400, z1: 6400, x2: 6600, z2: 6400 },
        { type: 'window', x1: 7400, z1: 1800, x2: 7400, z2: 4600 },
        { type: 'door', x1: 2600, z1: 1200, x2: 2600, z2: 2000 },
        { type: 'door', x1: 1600, z1: 3000, x2: 1600, z2: 3800 },
        { type: 'sash', x1: 1600, z1: 4800, x2: 1600, z2: 6000 }
      ],
      fixtures: {
        kitchen: { x: 5000, z: 750, rot: 0, islandX: 4800, islandZ: 2150 },
        utility: { x: 800, z: 3200, rot: Math.PI / 2 },
        baths: [
          { x: 1300, z: 1200, w: 2300, d: 2100, hasTub: true, hasBooth: true }
        ],
        foyerShoe: { x: 350, z: 5300, w: 360, d: 1300 }
      }
    };
  }

  // 기본 84A 표준 판상형 (레퍼런스 이미지 reference-cutaway.jpg와 완벽히 호환되는 레이아웃)
  const W = 11200, D = 9200;
  return {
    title: '84㎡ STANDARD APARTMENT · SCALE 1:100 (UNIT: MM)',
    widthMm: W,
    depthMm: D,
    rooms: [
      { id: 'r_foyer', name: '현관', type: 'foyer', x: 0, z: 3600, w: 1700, d: 2100 },
      { id: 'r_balcony', name: '전면 발코니', type: 'balcony', x: 1200, z: 750, w: 3100, d: 1450 },
      { id: 'r_living', name: '거실 (원목마루)', type: 'wood', x: 1700, z: 2200, w: 5100, d: 7000 },
      { id: 'r_kitchen', name: '주방 (화이트 빌트인)', type: 'wood', x: 4300, z: 900, w: 3500, d: 3600 },
      { id: 'r_utility', name: '실외실 (세탁/건조기)', type: 'utility', x: 3000, z: 0, w: 2200, d: 2200 },
      { id: 'r_bath_sub', name: '욕실 2 (샤워부스)', type: 'bath', x: 7800, z: 900, w: 1600, d: 2200 },
      { id: 'r_bed1', name: '침실 1 (원목마루)', type: 'wood', x: 7800, z: 3100, w: 3400, d: 3100 },
      { id: 'r_bath_main', name: '공용 욕실 (욕조/세면대/샤워부스)', type: 'bath', x: 6800, z: 6200, w: 2600, d: 3000 },
      { id: 'r_bed2', name: '침실 2 (원목마루)', type: 'wood', x: 4200, z: 6200, w: 2600, d: 3000 }
    ],
    walls: [
      // 외벽 라인
      { x1: 3000, z1: 0, x2: 5200, z2: 0, thick: 220, ext: true },
      { x1: 5200, z1: 0, x2: 5200, z2: 900, thick: 220, ext: true },
      { x1: 5200, z1: 900, x2: 9400, z2: 900, thick: 220, ext: true },
      { x1: 9400, z1: 900, x2: 9400, z2: 3100, thick: 220, ext: true },
      { x1: 9400, z1: 3100, x2: 11200, z2: 3100, thick: 220, ext: true },
      { x1: 11200, z1: 3100, x2: 11200, z2: 6200, thick: 220, ext: true },
      { x1: 9400, z1: 6200, x2: 11200, z2: 6200, thick: 220, ext: true },
      { x1: 9400, z1: 6200, x2: 9400, z2: 9200, thick: 220, ext: true },
      { x1: 1700, z1: 9200, x2: 9400, z2: 9200, thick: 220, ext: true },
      { x1: 1700, z1: 5700, x2: 1700, z2: 9200, thick: 220, ext: true },
      { x1: 0, z1: 5700, x2: 1700, z2: 5700, thick: 220, ext: true },
      { x1: 0, z1: 3600, x2: 0, z2: 5700, thick: 220, ext: true },
      { x1: 0, z1: 3600, x2: 1700, z2: 3600, thick: 220, ext: true },
      { x1: 1700, z1: 2200, x2: 1700, z2: 3600, thick: 200, ext: true },
      { x1: 1700, z1: 2200, x2: 3000, z2: 2200, thick: 200, ext: true },
      { x1: 3000, z1: 0, x2: 3000, z2: 2200, thick: 220, ext: true },

      // 내부 칸막이 벽체 (절단면)
      { x1: 1700, z1: 4900, x2: 3700, z2: 4900, thick: 160 },
      { x1: 4300, z1: 900, x2: 4300, z2: 2600, thick: 160 },
      { x1: 3000, z1: 2200, x2: 4300, z2: 2200, thick: 160 },
      { x1: 7800, z1: 900, x2: 7800, z2: 4600, thick: 160 },
      { x1: 6800, z1: 4600, x2: 7800, z2: 4600, thick: 160 },
      { x1: 7800, z1: 3100, x2: 9400, z2: 3100, thick: 160 },
      { x1: 4200, z1: 6200, x2: 4200, z2: 9200, thick: 160 },
      { x1: 4200, z1: 6200, x2: 5600, z2: 6200, thick: 160 },
      { x1: 6800, z1: 6200, x2: 6800, z2: 9200, thick: 160 },
      { x1: 6800, z1: 6200, x2: 9400, z2: 6200, thick: 160 }
    ],
    openings: [
      // 발코니 슬라이딩 통창 새시 & 유리 난간
      { type: 'sash', x1: 1700, z1: 2200, x2: 3000, z2: 2200 },
      { type: 'sash', x1: 1700, z1: 2200, x2: 1700, z2: 3600 },
      { type: 'balcony-rail', x1: 1200, z1: 750, x2: 3000, z2: 750 },
      { type: 'balcony-rail', x1: 1200, z1: 750, x2: 1200, z2: 2200 },
      // 현관 중문 새시
      { type: 'sash', x1: 1700, z1: 3800, x2: 1700, z2: 4800 },
      // 거실 및 각 방 창문
      { type: 'window', x1: 1700, z1: 6100, x2: 1700, z2: 8600 },
      { type: 'window', x1: 4600, z1: 9200, x2: 6100, z2: 9200 },
      { type: 'window', x1: 9400, z1: 3600, x2: 10900, z2: 3600 },
      { type: 'window', x1: 11200, z1: 3900, x2: 11200, z2: 5500 },
      { type: 'window', x1: 3000, z1: 400, x2: 3000, z2: 1600 },
      // 방문 (여닫이 도어)
      { type: 'door', x1: 3300, z1: 2200, x2: 4100, z2: 2200 },
      { type: 'door', x1: 6900, z1: 4600, x2: 7700, z2: 4600 },
      { type: 'door', x1: 5600, z1: 6200, x2: 6400, z2: 6200 },
      { type: 'door', x1: 7000, z1: 6200, x2: 7800, z2: 6200 }
    ],
    fixtures: {
      kitchen: { x: 6050, z: 1650, rot: 0, islandX: 5650, islandZ: 3050 },
      utility: { x: 4100, z: 850, rot: 0 },
      baths: [
        { x: 8100, z: 7700, w: 2400, d: 2700, hasTub: true, hasBooth: true },
        { x: 8600, z: 2000, w: 1400, d: 1900, hasTub: false, hasBooth: true }
      ],
      foyerShoe: { x: 850, z: 3900, w: 1400, d: 400 }
    }
  };
}

/* =========================================================================
   Three.js 씬, 정투영 아이소메트릭 카메라, 조명, 텍스처 초기화
   ========================================================================= */
let scene, orthoCamera, renderer, controls;
let worldRootGroup, architectureGroup, fixturesGroup, furnitureGroup, dimsGroup, labelsGroup;
let dirLight, shadowPlane;
let raycaster, pointerNDC, dragPlane;
let isDraggingItem = false;
let draggedItemId = null;
let dragOffset = new THREE.Vector3();

// 절차적 고해상도 캔버스 텍스처 캐시
const textureCache = {};

function createWoodTexture(tone = 'bright-oak') {
  const key = `wood_${tone}`;
  if (textureCache[key]) return textureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const palettes = {
    'bright-oak': { base: '#E5CAA4', plank1: '#DFC196', plank2: '#EAD2B0', plank3: '#D7B688', grain: 'rgba(145, 102, 55, 0.11)', joint: 'rgba(120, 85, 45, 0.22)' },
    'warm-oak':   { base: '#D8B182', plank1: '#CFA574', plank2: '#E0BD92', plank3: '#C69966', grain: 'rgba(120, 75, 32, 0.14)', joint: 'rgba(95, 60, 28, 0.25)' },
    'ash-light':  { base: '#ECE3D5', plank1: '#E5DAC9', plank2: '#F2ECE1', plank3: '#DDD1BE', grain: 'rgba(130, 115, 95, 0.09)', joint: 'rgba(110, 95, 80, 0.18)' }
  };
  const pal = palettes[tone] || palettes['bright-oak'];

  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, 1024, 1024);

  const rows = 16;
  const cols = 4;
  const rowH = 1024 / rows;
  const colW = 1024 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const colors = [pal.plank1, pal.plank2, pal.plank3, pal.base];
      ctx.fillStyle = colors[(r * 3 + c + 4) % colors.length];
      ctx.fillRect(x, y, colW, rowH);

      // 미세한 나무 결 라인
      ctx.strokeStyle = pal.grain;
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 6; g++) {
        ctx.beginPath();
        const gy = y + (g + 1) * (rowH / 7);
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + colW * 0.33, gy + 2, x + colW * 0.66, gy - 2, x + colW, gy);
        ctx.stroke();
      }

      // 쪽마루 테두리 줄눈
      ctx.strokeStyle = pal.joint;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, colW, rowH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.2, 3.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache[key] = tex;
  return tex;
}

function createTileTexture(bgHex = '#D9DCDE', lineHex = '#B8BDC2', gridCount = 8) {
  const key = `tile_${bgHex}_${gridCount}`;
  if (textureCache[key]) return textureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 512);

  const step = 512 / gridCount;
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;

  for (let i = 0; i <= gridCount; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache[key] = tex;
  return tex;
}

function initThreeScene() {
  const holder = document.getElementById('canvas3DHolder');
  const w = holder.clientWidth || 900;
  const h = holder.clientHeight || 650;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#FFFFFF');

  // 정투영(Orthographic) 아이소메트릭 카메라 설정
  const aspect = w / h;
  const frustumSize = 12.5;
  orthoCamera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    -50,
    100
  );

  // 남동(SE) 정통 아이소메트릭 각도 배치
  orthoCamera.position.set(11.5, 11.8, 11.5);
  orthoCamera.lookAt(0, 0, 0);
  orthoCamera.zoom = 1.02;
  orthoCamera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  holder.appendChild(renderer.domElement);

  // OrbitControls (마우스 및 안드로이드/아이폰 멀티터치 완벽 지원)
  controls = new OrbitControls(orthoCamera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minZoom = 0.45;
  controls.maxZoom = 3.8;
  controls.target.set(0, 0.4, 0);

  // [스타일] 부드러운 자연광과 은은한 그림자
  const ambientLight = new THREE.AmbientLight('#FFFFFF', 0.72);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#EBE5D8', 0.55);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight('#FFFDF8', 1.15);
  updateSunLightPosition(state.sunAngleDeg);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 45;
  const sc = 10.5;
  dirLight.shadow.camera.left = -sc;
  dirLight.shadow.camera.right = sc;
  dirLight.shadow.camera.top = sc;
  dirLight.shadow.camera.bottom = -sc;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  // 반대편 보조 필 라이트 (벽체 음영 부드럽게)
  const fillLight = new THREE.DirectionalLight('#F4F6FA', 0.35);
  fillLight.position.set(-10, 8, -10);
  scene.add(fillLight);

  // 화이트 배경 위 은은한 바닥 그림자 리시버 플레인
  const shadowGeo = new THREE.PlaneGeometry(40, 40);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.11 });
  shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.09;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // 씬 루트 그룹들
  worldRootGroup = new THREE.Group();
  architectureGroup = new THREE.Group();
  fixturesGroup = new THREE.Group();
  furnitureGroup = new THREE.Group();
  dimsGroup = new THREE.Group();
  labelsGroup = new THREE.Group();

  worldRootGroup.add(architectureGroup);
  worldRootGroup.add(fixturesGroup);
  worldRootGroup.add(furnitureGroup);
  worldRootGroup.add(dimsGroup);
  worldRootGroup.add(labelsGroup);
  scene.add(worldRootGroup);

  // 인터랙션 레이캐스터
  raycaster = new THREE.Raycaster();
  pointerNDC = new THREE.Vector2();
  dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  setupViewportInteractions(renderer.domElement);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function updateSunLightPosition(angleDeg) {
  if (!dirLight) return;
  const rad = THREE.MathUtils.degToRad(angleDeg);
  const dist = 16;
  dirLight.position.set(Math.cos(rad) * dist, 15, Math.sin(rad) * dist);
}

function onWindowResize() {
  const holder = document.getElementById('canvas3DHolder');
  if (!holder || !renderer || !orthoCamera) return;
  const w = holder.clientWidth;
  const h = holder.clientHeight;
  if (w === 0 || h === 0) return;

  const aspect = w / h;
  const frustumSize = 12.5;
  orthoCamera.left = (-frustumSize * aspect) / 2;
  orthoCamera.right = (frustumSize * aspect) / 2;
  orthoCamera.top = frustumSize / 2;
  orthoCamera.bottom = -frustumSize / 2;
  orthoCamera.updateProjectionMatrix();

  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  updateFloatingBadgePosition();
  if (renderer && scene && orthoCamera) {
    renderer.render(scene, orthoCamera);
  }
}

/* =========================================================================
   도면 좌표(mm) -> Three.js 월드 좌표(m, 중앙 원점 기준) 변환 헬퍼
   ========================================================================= */
function toWorldX(mmX) {
  return (mmX - state.planWidthMm / 2) * MM_TO_UNIT;
}

function toWorldZ(mmZ) {
  return (mmZ - state.planDepthMm / 2) * MM_TO_UNIT;
}

function toPlanMmX(worldX) {
  return Math.round(worldX * UNIT_TO_MM + state.planWidthMm / 2);
}

function toPlanMmZ(worldZ) {
  return Math.round(worldZ * UNIT_TO_MM + state.planDepthMm / 2);
}

/* =========================================================================
   3D 아이소메트릭 절단 뷰 빌더 ([규칙], [공간 요소], [스타일] 구현)
   ========================================================================= */
function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child.geometry) child.geometry.dispose();
  }
}

function rebuild3DArchitecture() {
  clearGroup(architectureGroup);
  clearGroup(fixturesGroup);
  clearGroup(labelsGroup);

  const plan = state.floorplanData;
  if (!plan) return;

  state.planWidthMm = plan.widthMm;
  state.planDepthMm = plan.depthMm;

  const wallH = state.wallHeightMm * MM_TO_UNIT;
  const woodTex = createWoodTexture(state.woodTone);
  const bathTileTex = createTileTexture('#D7DADC', '#B6BCC2', 8);
  const utilityTileTex = createTileTexture('#CFD3D6', '#AEB4BA', 10);
  const balconyTileTex = createTileTexture('#EAEAE8', '#CCCBC6', 6);
  const foyerTileTex = createTileTexture('#C6C7C4', '#A2A4A0', 6);

  // 1. 각 방의 바닥 슬래브 생성 (밝은 원목 마루 / 욕실 타일 / 다용도실 타일 / 발코니 / 현관)
  plan.rooms.forEach((room) => {
    const rw = room.w * MM_TO_UNIT;
    const rd = room.d * MM_TO_UNIT;
    const cx = toWorldX(room.x + room.w / 2);
    const cz = toWorldZ(room.z + room.d / 2);

    let mat;
    let slabY = -0.04;
    let slabH = 0.08;

    if (room.type === 'bath') {
      mat = new THREE.MeshStandardMaterial({
        map: bathTileTex,
        roughness: 0.35,
        metalness: 0.05
      });
      slabY = -0.048; // 욕실 단차 표현
    } else if (room.type === 'utility') {
      mat = new THREE.MeshStandardMaterial({
        map: utilityTileTex,
        roughness: 0.45,
        metalness: 0.05
      });
      slabY = -0.045;
    } else if (room.type === 'balcony') {
      mat = new THREE.MeshStandardMaterial({
        map: balconyTileTex,
        roughness: 0.4,
        metalness: 0.05
      });
      slabY = -0.044;
    } else if (room.type === 'foyer') {
      mat = new THREE.MeshStandardMaterial({
        map: foyerTileTex,
        roughness: 0.4,
        metalness: 0.05
      });
      slabY = -0.055; // 현관 디딤석 단차
    } else {
      // 기본 밝은 원목 마루 바닥
      mat = new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.42,
        metalness: 0.03
      });
    }

    const floorGeo = new THREE.BoxGeometry(rw, slabH, rd);
    // 옆면/하단면은 깨끗한 건축 화이트 슬래브 마감
    const sideMat = new THREE.MeshStandardMaterial({ color: '#F0EFEA', roughness: 0.7 });
    const materials = [sideMat, sideMat, mat, sideMat, sideMat, sideMat];

    const floorMesh = new THREE.Mesh(floorGeo, materials);
    floorMesh.position.set(cx, slabY, cz);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    architectureGroup.add(floorMesh);

    // 방 이름 라벨 (옵션 토글 시)
    if (state.showRoomLabels && room.name) {
      const labelSprite = createTextSprite(room.name, '#181818', 'rgba(255,255,255,0.88)');
      labelSprite.position.set(cx, 0.08, cz);
      labelsGroup.add(labelSprite);
    }
  });

  // 첨부된 평면도 이미지 오버레이 평면 (첨부 시)
  if (state.uploadedFloorplanTexture && state.floorplanOpacity > 0.01) {
    const pw = state.planWidthMm * MM_TO_UNIT;
    const pd = state.planDepthMm * MM_TO_UNIT;
    const overlayGeo = new THREE.PlaneGeometry(pw, pd);
    const overlayMat = new THREE.MeshBasicMaterial({
      map: state.uploadedFloorplanTexture,
      transparent: true,
      opacity: state.floorplanOpacity,
      depthWrite: false
    });
    const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
    overlayMesh.rotation.x = -Math.PI / 2;
    overlayMesh.position.y = 0.004;
    architectureGroup.add(overlayMesh);
  }

  // 2. 벽체 단면(Cutaway Section Walls) 및 상단 단면 캡(Wall Top Cap) 생성
  // 개구부(문, 창문, 새시) 위치와 겹치는 벽체를 자동으로 분할하여 정확한 창호 재현
  const wallBodyMat = new THREE.MeshStandardMaterial({
    color: '#F7F7F4',
    roughness: 0.65,
    metalness: 0.02
  });
  const wallCapMat = new THREE.MeshStandardMaterial({
    color: state.wallCapColor,
    roughness: 0.5,
    metalness: 0.05
  });

  plan.walls.forEach((wall) => {
    buildSegmentedWallWithOpenings(wall, plan.openings, wallH, wallBodyMat, wallCapMat);
  });

  // 3. 문 · 창문 · 베란다 새시 3D 모델링 ([규칙] 문·창문·베란다 새시 동일 재현)
  if (state.showOpenings) {
    plan.openings.forEach((op) => {
      buildOpening3D(op, wallH);
    });
  }

  // 4. [공간 요소] 빌트인 배치 (욕실 도기/부스, 화이트 주방 상하부장/아일랜드, 실외실 세탁기/건조기)
  if (plan.fixtures) {
    if (state.showKitchen && plan.fixtures.kitchen) {
      buildKitchenBuiltIn(plan.fixtures.kitchen, wallH);
    }
    if (state.showUtility && plan.fixtures.utility) {
      buildUtilityWasherDryer(plan.fixtures.utility, wallH);
    }
    if (state.showBathroom && plan.fixtures.baths) {
      plan.fixtures.baths.forEach((b) => buildBathroomFixtures(b, wallH));
    }
    if (plan.fixtures.foyerShoe) {
      buildFoyerShoeCabinet(plan.fixtures.foyerShoe, wallH);
    }
  }
}

/* 벽체를 개구부(문/창문/새시) 구간에 맞춰 자동으로 분할하여 절단 뷰 생성 */
function buildSegmentedWallWithOpenings(wall, openings, wallH, wallBodyMat, wallCapMat) {
  const dx = wall.x2 - wall.x1;
  const dz = wall.z2 - wall.z1;
  const totalLenMm = Math.hypot(dx, dz);
  if (totalLenMm < 10) return;

  const angle = Math.atan2(dz, dx);
  const thick = (wall.thick || 160) * MM_TO_UNIT;

  // 이 벽 선분 위에 놓인 개구부 찾기
  const ux = dx / totalLenMm;
  const uz = dz / totalLenMm;
  const matchedOps = [];

  if (state.showOpenings && openings) {
    openings.forEach((op) => {
      if (op.type === 'balcony-rail') return;
      // 개구부 양 끝점이 벽 선분 위에 있는지 거리 검사
      const d1 = pointToLineDist(op.x1, op.z1, wall.x1, wall.z1, wall.x2, wall.z2);
      const d2 = pointToLineDist(op.x2, op.z2, wall.x1, wall.z1, wall.x2, wall.z2);
      if (d1 < 120 && d2 < 120) {
        const t1 = (op.x1 - wall.x1) * ux + (op.z1 - wall.z1) * uz;
        const t2 = (op.x2 - wall.x1) * ux + (op.z2 - wall.z1) * uz;
        const startMm = Math.max(0, Math.min(t1, t2));
        const endMm = Math.min(totalLenMm, Math.max(t1, t2));
        if (endMm - startMm > 100) {
          matchedOps.push({ startMm, endMm, type: op.type });
        }
      }
    });
  }

  matchedOps.sort((a, b) => a.startMm - b.startMm);

  // 벽 세그먼트 생성
  let cursor = 0;
  matchedOps.forEach((op) => {
    if (op.startMm > cursor + 20) {
      createWallBoxSegment(wall.x1, wall.z1, ux, uz, angle, cursor, op.startMm, 0, wallH, thick, wallBodyMat, wallCapMat, true);
    }
    // 창문인 경우 하단 조적벽(Sill wall) 생성
    if (op.type === 'window') {
      const sillH = Math.min(wallH * 0.42, 0.58);
      createWallBoxSegment(wall.x1, wall.z1, ux, uz, angle, op.startMm, op.endMm, 0, sillH, thick, wallBodyMat, wallCapMat, false);
    }
    cursor = Math.max(cursor, op.endMm);
  });

  if (cursor < totalLenMm - 20) {
    createWallBoxSegment(wall.x1, wall.z1, ux, uz, angle, cursor, totalLenMm, 0, wallH, thick, wallBodyMat, wallCapMat, true);
  }
}

function pointToLineDist(px, pz, x1, z1, x2, z2) {
  const A = px - x1;
  const B = pz - z1;
  const C = x2 - x1;
  const D = z2 - z1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, zz;
  if (param < 0) { xx = x1; zz = z1; }
  else if (param > 1) { xx = x2; zz = z2; }
  else { xx = x1 + param * C; zz = z1 + param * D; }
  return Math.hypot(px - xx, pz - zz);
}

function createWallBoxSegment(x1, z1, ux, uz, angle, startMm, endMm, bottomY, topY, thick, bodyMat, capMat, hasBlackCap) {
  const segLenMm = endMm - startMm;
  const midMm = (startMm + endMm) / 2;
  const mx = x1 + ux * midMm;
  const mz = z1 + uz * midMm;

  const wUnit = segLenMm * MM_TO_UNIT + (hasBlackCap ? thick * 0.45 : 0);
  const hUnit = topY - bottomY;
  if (hUnit <= 0.01) return;

  const wx = toWorldX(mx);
  const wz = toWorldZ(mz);

  // 벽체 본체
  const geo = new THREE.BoxGeometry(wUnit, hUnit, thick);
  const mesh = new THREE.Mesh(geo, bodyMat);
  mesh.position.set(wx, bottomY + hUnit / 2, wz);
  mesh.rotation.y = -angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  architectureGroup.add(mesh);

  // 상단 절단면 캡 (레퍼런스의 선명한 블랙/차콜 건축 단면 표현)
  if (hasBlackCap) {
    const capH = 0.032;
    const capGeo = new THREE.BoxGeometry(wUnit + 0.004, capH, thick + 0.004);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(wx, topY + capH / 2, wz);
    capMesh.rotation.y = -angle;
    architectureGroup.add(capMesh);
  }
}

/* 문 · 창문 · 베란다 새시 3D 생성 */
function buildOpening3D(op, wallH) {
  const dx = op.x2 - op.x1;
  const dz = op.z2 - op.z1;
  const lenMm = Math.hypot(dx, dz);
  if (lenMm < 50) return;

  const lenU = lenMm * MM_TO_UNIT;
  const angle = Math.atan2(dz, dx);
  const mx = (op.x1 + op.x2) / 2;
  const mz = (op.z1 + op.z2) / 2;
  const wx = toWorldX(mx);
  const wz = toWorldZ(mz);

  const frameMat = new THREE.MeshStandardMaterial({ color: '#E8E8E5', roughness: 0.35, metalness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#D8E9F0',
    transparent: true,
    opacity: 0.42,
    roughness: 0.1,
    metalness: 0.05,
    transmission: 0.45
  });
  const woodDoorMat = new THREE.MeshStandardMaterial({ color: '#C69F73', roughness: 0.45 });

  const group = new THREE.Group();
  group.position.set(wx, 0, wz);
  group.rotation.y = -angle;

  if (op.type === 'window') {
    const sillH = Math.min(wallH * 0.42, 0.58);
    const winH = Math.max(0.25, wallH - sillH - 0.02);
    const cy = sillH + winH / 2;

    // 창틀 외곽 프레임 및 중앙 멀리언(Mullion)
    const outerBarTop = new THREE.Mesh(new THREE.BoxGeometry(lenU, 0.045, 0.14), frameMat);
    outerBarTop.position.y = sillH + winH - 0.022;
    const outerBarBot = new THREE.Mesh(new THREE.BoxGeometry(lenU, 0.045, 0.14), frameMat);
    outerBarBot.position.y = sillH + 0.022;
    const midPost = new THREE.Mesh(new THREE.BoxGeometry(0.045, winH, 0.13), frameMat);
    midPost.position.y = cy;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(lenU - 0.04, winH - 0.06, 0.025), glassMat);
    glassPane.position.y = cy;

    group.add(outerBarTop, outerBarBot, midPost, glassPane);
  } else if (op.type === 'sash') {
    // 베란다 통창 슬라이딩 새시 또는 현관 중문
    const sashH = wallH - 0.02;
    const cy = sashH / 2;
    const cols = lenU > 1.8 ? 3 : 2;
    const colW = lenU / cols;

    for (let i = 0; i <= cols; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, sashH, 0.13), frameMat);
      post.position.set(-lenU / 2 + i * colW, cy, 0);
      group.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(lenU, 0.05, 0.14), frameMat);
    topRail.position.y = sashH - 0.025;
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(lenU, 0.045, 0.14), frameMat);
    botRail.position.y = 0.022;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(lenU - 0.04, sashH - 0.06, 0.03), glassMat);
    glass.position.y = cy;
    group.add(topRail, botRail, glass);
  } else if (op.type === 'balcony-rail') {
    // 전면 발코니 유리 난간
    const railH = Math.min(wallH * 0.72, 1.05);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(lenU, railH, 0.03), glassMat);
    glass.position.y = railH / 2;
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(lenU, 0.04, 0.06), frameMat);
    topCap.position.y = railH;
    group.add(glass, topCap);

    const posts = Math.max(2, Math.round(lenU / 1.0));
    for (let i = 0; i <= posts; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, railH, 0.045), frameMat);
      post.position.set(-lenU / 2 + (i / posts) * lenU, railH / 2, 0);
      group.add(post);
    }
  } else if (op.type === 'door') {
    // 원목 문틀 및 반개방 도어 패널 (레퍼런스의 내추럴 우드 도어 재현)
    const doorH = Math.min(wallH - 0.02, 1.38);
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.17), woodDoorMat);
    jambL.position.set(-lenU / 2 + 0.025, doorH / 2, 0);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.17), woodDoorMat);
    jambR.position.set(lenU / 2 - 0.025, doorH / 2, 0);
    group.add(jambL, jambR);

    // 반쯤 열린 문짝
    const pivot = new THREE.Group();
    pivot.position.set(-lenU / 2 + 0.04, 0, 0);
    pivot.rotation.y = 0.65;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(lenU - 0.08, doorH, 0.042), woodDoorMat);
    leaf.position.set((lenU - 0.08) / 2, doorH / 2, 0);
    leaf.castShadow = true;
    pivot.add(leaf);
    group.add(pivot);
  }

  architectureGroup.add(group);
}

/* =========================================================================
   [공간 요소] 1. 주방: 화이트 톤 빌트인 상·하부장 + 아일랜드 식탁
   ========================================================================= */
function buildKitchenBuiltIn(kData, wallH) {
  const group = new THREE.Group();
  const wx = toWorldX(kData.x);
  const wz = toWorldZ(kData.z);
  group.position.set(wx, 0, wz);
  group.rotation.y = kData.rot || 0;

  const whiteMat = new THREE.MeshStandardMaterial({ color: '#F9F9F7', roughness: 0.28, metalness: 0.04 });
  const counterMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.18, metalness: 0.05 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.25, metalness: 0.7 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#CCCCCC', roughness: 0.2, metalness: 0.85 });
  const lineMat = new THREE.LineBasicMaterial({ color: '#D2D1CC' });

  // 하부장 (Lower Cabinets: 길이 2.8m, 깊이 0.65m, 높이 0.86m)
  const lowW = 2.7, lowD = 0.65, lowH = 0.86;
  const lowerBox = new THREE.Mesh(new THREE.BoxGeometry(lowW, lowH, lowD), whiteMat);
  lowerBox.position.set(0, lowH / 2, -0.35);
  lowerBox.castShadow = true;
  lowerBox.receiveShadow = true;
  group.add(lowerBox);

  // 상판 (Countertop)
  const topSlab = new THREE.Mesh(new THREE.BoxGeometry(lowW + 0.02, 0.035, lowD + 0.02), counterMat);
  topSlab.position.set(0, lowH + 0.017, -0.35);
  group.add(topSlab);

  // 싱크볼 & 수전 (우측)
  const sinkBowl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.02, 0.44), chromeMat);
  sinkBowl.position.set(0.65, lowH + 0.03, -0.35);
  group.add(sinkBowl);

  const faucetPost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 12), chromeMat);
  faucetPost.position.set(0.65, lowH + 0.15, -0.58);
  group.add(faucetPost);

  // 인덕션 쿡탑 (좌측)
  const induction = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.46), darkMetalMat);
  induction.position.set(-0.55, lowH + 0.032, -0.35);
  group.add(induction);

  // 상부장 (Upper Cabinets: 벽 높이에 맞춰 깔끔하게 배치)
  const upH = Math.max(0.35, Math.min(0.62, wallH - 0.95));
  if (wallH > 1.05) {
    const upperBox = new THREE.Mesh(new THREE.BoxGeometry(lowW, upH, 0.36), whiteMat);
    upperBox.position.set(0, wallH - upH / 2 - 0.04, -0.49);
    upperBox.castShadow = true;
    const upperEdges = new THREE.LineSegments(new THREE.EdgesGeometry(upperBox.geometry), lineMat);
    upperBox.add(upperEdges);
    group.add(upperBox);
  }

  // 우측 키큰장 (냉장고/오븐 빌트인 타워장)
  const tallH = Math.min(wallH - 0.03, 1.42);
  const tallTower = new THREE.Mesh(new THREE.BoxGeometry(0.68, tallH, 0.68), whiteMat);
  tallTower.position.set(lowW / 2 + 0.34, tallH / 2, -0.35);
  tallTower.castShadow = true;
  group.add(tallTower);

  // 화이트 아일랜드 식탁/조리대 (Kitchen Island)
  const islX = toWorldX(kData.islandX) - wx;
  const islZ = toWorldZ(kData.islandZ) - wz;
  const islW = 1.95, islD = 0.82, islH = 0.86;
  const islandGroup = new THREE.Group();
  islandGroup.position.set(islX, 0, islZ);

  const islandBase = new THREE.Mesh(new THREE.BoxGeometry(islW, islH, islD), whiteMat);
  islandBase.position.y = islH / 2;
  islandBase.castShadow = true;
  islandBase.receiveShadow = true;
  islandGroup.add(islandBase);

  const islandTop = new THREE.Mesh(new THREE.BoxGeometry(islW + 0.04, 0.04, islD + 0.06), counterMat);
  islandTop.position.y = islH + 0.02;
  islandTop.castShadow = true;
  const islEdges = new THREE.LineSegments(new THREE.EdgesGeometry(islandTop.geometry), lineMat);
  islandTop.add(islEdges);
  islandGroup.add(islandTop);

  group.add(islandGroup);
  fixturesGroup.add(group);
}

/* =========================================================================
   [공간 요소] 2. 실외실/다용도실: 세탁기 + 건조기 워시타워
   ========================================================================= */
function buildUtilityWasherDryer(uData, wallH) {
  const group = new THREE.Group();
  group.position.set(toWorldX(uData.x), 0, toWorldZ(uData.z));
  group.rotation.y = uData.rot || 0;

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#F3F3F1', roughness: 0.3, metalness: 0.1 });
  const drumRingMat = new THREE.MeshStandardMaterial({ color: '#2B2B2B', roughness: 0.25, metalness: 0.6 });
  const glassDrumMat = new THREE.MeshPhysicalMaterial({ color: '#1F2933', roughness: 0.15, transparent: true, opacity: 0.78 });

  const machineW = 0.68, machineD = 0.72, singleH = Math.min(0.68, (wallH - 0.06) / 2);

  // 하단 세탁기 (Washer) + 상단 건조기 (Dryer) 직렬 워시타워
  for (let i = 0; i < 2; i++) {
    const unitY = i * singleH + singleH / 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(machineW, singleH - 0.01, machineD), bodyMat);
    box.position.set(-0.35, unitY, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    // 전면 원형 드럼 도어
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 24), drumRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.35, unitY, machineD / 2 + 0.01);
    group.add(ring);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 24), glassDrumMat);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(-0.35, unitY, machineD / 2 + 0.012);
    group.add(glass);
  }

  // 보조 손빨래 싱크볼/수납장
  const utilSink = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.62), bodyMat);
  utilSink.position.set(0.35, 0.41, 0);
  utilSink.castShadow = true;
  group.add(utilSink);

  fixturesGroup.add(group);
}

/* =========================================================================
   [공간 요소] 3. 욕실: 타일 바닥 + 욕조 · 세면대 · 유리 샤워부스
   ========================================================================= */
function buildBathroomFixtures(bData, wallH) {
  const group = new THREE.Group();
  group.position.set(toWorldX(bData.x), 0, toWorldZ(bData.z));

  const ceramicMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.15, metalness: 0.05 });
  const waterInteriorMat = new THREE.MeshStandardMaterial({ color: '#EBF3F5', roughness: 0.2 });
  const vanityWoodMat = new THREE.MeshStandardMaterial({ color: '#F5F5F3', roughness: 0.35 });
  const glassBoothMat = new THREE.MeshPhysicalMaterial({
    color: '#DCF0F7',
    transparent: true,
    opacity: 0.38,
    roughness: 0.08,
    metalness: 0.1
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#C8CDD0', roughness: 0.2, metalness: 0.85 });

  const bw = bData.w * MM_TO_UNIT;
  const bd = bData.d * MM_TO_UNIT;

  // 1) 욕조 (Bathtub)
  if (bData.hasTub) {
    const tubW = Math.min(1.55, bw * 0.62);
    const tubD = 0.74;
    const tubH = 0.52;
    const tubOuter = new THREE.Mesh(new THREE.BoxGeometry(tubW, tubH, tubD), ceramicMat);
    tubOuter.position.set(-bw / 2 + tubW / 2 + 0.06, tubH / 2, bd / 2 - tubD / 2 - 0.06);
    tubOuter.castShadow = true;
    tubOuter.receiveShadow = true;

    const tubInner = new THREE.Mesh(new THREE.BoxGeometry(tubW - 0.16, 0.04, tubD - 0.16), waterInteriorMat);
    tubInner.position.y = tubH / 2 - 0.01;
    tubOuter.add(tubInner);
    group.add(tubOuter);
  }

  // 2) 세면대 (Vanity Sink + 거울)
  const vanW = 0.76, vanD = 0.48, vanH = 0.55;
  const vanity = new THREE.Mesh(new THREE.BoxGeometry(vanW, vanH, vanD), vanityWoodMat);
  vanity.position.set(bw / 2 - vanD / 2 - 0.08, 0.48, 0.15);
  vanity.rotation.y = Math.PI / 2;
  vanity.castShadow = true;
  const basin = new THREE.Mesh(new THREE.BoxGeometry(vanW + 0.02, 0.08, vanD + 0.02), ceramicMat);
  basin.position.y = vanH / 2 + 0.04;
  vanity.add(basin);
  group.add(vanity);

  // 3) 유리 샤워부스 (Glass Shower Booth + 레인샤워 수전)
  if (bData.hasBooth) {
    const boothH = Math.min(wallH - 0.08, 1.32);
    const boothW = 0.92, boothD = 0.92;
    const bx = -bw / 2 + boothW / 2 + 0.08;
    const bz = -bd / 2 + boothD / 2 + 0.08;

    const glassFront = new THREE.Mesh(new THREE.BoxGeometry(boothW, boothH, 0.02), glassBoothMat);
    glassFront.position.set(bx, boothH / 2, bz + boothD / 2);

    const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.02, boothH, boothD), glassBoothMat);
    glassSide.position.set(bx + boothW / 2, boothH / 2, bz);

    const topBarFront = new THREE.Mesh(new THREE.BoxGeometry(boothW, 0.025, 0.03), chromeMat);
    topBarFront.position.set(bx, boothH, bz + boothD / 2);

    const topBarSide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, boothD), chromeMat);
    topBarSide.position.set(bx + boothW / 2, boothH, bz);

    // 샤워 수전 기둥
    const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, boothH * 0.85, 8), chromeMat);
    showerPipe.position.set(bx - boothW / 2 + 0.08, boothH * 0.45, bz);

    group.add(glassFront, glassSide, topBarFront, topBarSide, showerPipe);
  }

  // 4) 양변기 (Toilet)
  const toiletGroup = new THREE.Group();
  toiletGroup.position.set(bw / 2 - 0.34, 0, bd / 2 - 0.42);
  toiletGroup.rotation.y = -Math.PI / 2;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.4, 16), ceramicMat);
  bowl.position.set(0, 0.2, 0.1);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.2), ceramicMat);
  tank.position.set(0, 0.42, -0.14);
  toiletGroup.add(bowl, tank);
  group.add(toiletGroup);

  fixturesGroup.add(group);
}

function buildFoyerShoeCabinet(fData, wallH) {
  const mat = new THREE.MeshStandardMaterial({ color: '#F7F7F5', roughness: 0.35 });
  const h = Math.min(wallH - 0.05, 1.38);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(fData.w * MM_TO_UNIT, h, fData.d * MM_TO_UNIT),
    mat
  );
  mesh.position.set(toWorldX(fData.x), h / 2, toWorldZ(fData.z));
  mesh.castShadow = true;
  fixturesGroup.add(mesh);
}

/* =========================================================================
   가구 · 가전제품 · 소품 3D 생성기 (이미지 매핑 + 실측 W × D × H mm)
   ========================================================================= */
function buildPlacedFurniture3D() {
  clearGroup(furnitureGroup);
  clearGroup(dimsGroup);

  state.placedItems.forEach((item) => {
    const itemGroup = createItem3DMesh(item);
    itemGroup.position.set(
      toWorldX(item.xMm),
      (item.yMm || 0) * MM_TO_UNIT,
      toWorldZ(item.zMm)
    );
    itemGroup.rotation.y = THREE.MathUtils.degToRad(-(item.rotDeg || 0));
    itemGroup.userData = { isPlacedItem: true, itemId: item.id };
    furnitureGroup.add(itemGroup);

    // 선택된 아이템이거나 치수선 표시가 켜져 있으면 치수 및 외곽선 표시
    if (state.showDims || state.selectedItemId === item.id) {
      buildItemDimensionOverlay(item);
    }
  });

  updatePlacedListUI();
  updateInspectorUI();
}

function createItem3DMesh(item) {
  const group = new THREE.Group();
  const w = item.wMm * MM_TO_UNIT;
  const d = item.dMm * MM_TO_UNIT;
  const h = item.hMm * MM_TO_UNIT;
  const isSelected = state.selectedItemId === item.id;

  const baseMat = new THREE.MeshStandardMaterial({
    color: item.color || '#EAE6DF',
    roughness: 0.45,
    metalness: item.cat === 'appliance' ? 0.25 : 0.04
  });

  // 첨부된 제품 이미지가 있는 경우 텍스처 매핑
  let imgMat = baseMat;
  if (item.imageTexture) {
    imgMat = new THREE.MeshStandardMaterial({
      map: item.imageTexture,
      roughness: 0.4,
      metalness: 0.05
    });
  }

  const woodLegMat = new THREE.MeshStandardMaterial({ color: '#9E7B56', roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#242424', roughness: 0.3, metalness: 0.5 });

  switch (item.shape) {
    case 'sofa': {
      // 좌방석 + 등받이 + 양쪽 팔걸이
      const seatH = h * 0.48;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), imgMat);
      seat.position.y = seatH / 2;
      seat.castShadow = true;
      seat.receiveShadow = true;

      const backD = Math.min(d * 0.24, 0.22);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h - seatH, backD), baseMat);
      back.position.set(0, seatH + (h - seatH) / 2, -d / 2 + backD / 2);
      back.castShadow = true;

      const armW = Math.min(w * 0.1, 0.18);
      const armH = h * 0.72;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), baseMat);
      armL.position.set(-w / 2 + armW / 2, armH / 2, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), baseMat);
      armR.position.set(w / 2 - armW / 2, armH / 2, 0);

      group.add(seat, back, armL, armR);
      break;
    }
    case 'bed': {
      const frameH = h * 0.32;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), woodLegMat);
      frame.position.y = frameH / 2;
      frame.castShadow = true;

      const mattH = h * 0.26;
      const matt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, mattH, d * 0.92), imgMat);
      matt.position.set(0, frameH + mattH / 2, d * 0.02);
      matt.castShadow = true;

      const head = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), baseMat);
      head.position.set(0, h / 2, -d / 2 + 0.05);
      head.castShadow = true;

      // 베개 2개
      const pilW = w * 0.34;
      const pil1 = new THREE.Mesh(new THREE.BoxGeometry(pilW, 0.11, 0.32), new THREE.MeshStandardMaterial({ color: '#FFFFFF' }));
      pil1.position.set(-w * 0.22, frameH + mattH + 0.05, -d / 2 + 0.3);
      const pil2 = pil1.clone();
      pil2.position.x = w * 0.22;

      group.add(frame, matt, head, pil1, pil2);
      break;
    }
    case 'table': {
      const topThick = Math.min(0.05, h * 0.08);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), imgMat);
      top.position.y = h - topThick / 2;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      const legR = 0.03;
      const legH = h - topThick;
      const offsets = [
        [-w / 2 + 0.08, -d / 2 + 0.08],
        [w / 2 - 0.08, -d / 2 + 0.08],
        [-w / 2 + 0.08, d / 2 - 0.08],
        [w / 2 - 0.08, d / 2 - 0.08]
      ];
      offsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.8, legH, 10), woodLegMat);
        leg.position.set(lx, legH / 2, lz);
        leg.castShadow = true;
        group.add(leg);
      });
      break;
    }
    case 'chair': {
      const seatY = h * 0.52;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), imgMat);
      seat.position.y = seatY;
      seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h - seatY, 0.06), baseMat);
      back.position.set(0, seatY + (h - seatY) / 2, -d / 2 + 0.03);
      const baseLeg = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, seatY, d * 0.8), woodLegMat);
      baseLeg.position.y = seatY / 2;
      group.add(seat, back, baseLeg);
      break;
    }
    case 'tv': {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(w, h, Math.max(d, 0.04)), item.imageTexture ? imgMat : darkMat);
      screen.position.y = h / 2;
      screen.castShadow = true;
      group.add(screen);
      break;
    }
    case 'plant': {
      const potH = h * 0.36;
      const r = Math.min(w, d) / 2;
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.7, r * 0.52, potH, 18),
        new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: 0.6 })
      );
      pot.position.y = potH / 2;
      pot.castShadow = true;

      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.95, 16, 14),
        new THREE.MeshStandardMaterial({ color: item.color || '#4A7C59', roughness: 0.65 })
      );
      foliage.scale.set(1, (h - potH) / (r * 1.4), 1);
      foliage.position.y = potH + (h - potH) * 0.48;
      foliage.castShadow = true;
      group.add(pot, foliage);
      break;
    }
    case 'lamp': {
      const r = Math.min(w, d) / 2;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.03, 18), darkMat);
      base.position.y = 0.015;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h * 0.82, 10), darkMat);
      pole.position.y = h * 0.41;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.65, r, h * 0.22, 20),
        new THREE.MeshStandardMaterial({ color: item.color || '#F5E8C7', emissive: '#FFF3D1', emissiveIntensity: 0.25 })
      );
      shade.position.y = h - h * 0.11;
      shade.castShadow = true;
      group.add(base, pole, shade);
      break;
    }
    case 'rug': {
      const rugH = Math.max(0.012, h);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(w, rugH, d), imgMat);
      rug.position.y = rugH / 2;
      rug.receiveShadow = true;
      group.add(rug);
      break;
    }
    default: {
      // cabinet / appliance / frame (정면 및 상단에 첨부 이미지 매핑)
      const geo = new THREE.BoxGeometry(w, h, d);
      const mats = item.imageTexture
        ? [baseMat, baseMat, imgMat, baseMat, imgMat, baseMat]
        : baseMat;
      const box = new THREE.Mesh(geo, mats);
      box.position.y = h / 2;
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);
      break;
    }
  }

  // 선택된 가구 하이라이트 윤곽선
  const boundGeo = new THREE.BoxGeometry(w + 0.02, h + 0.02, d + 0.02);
  const edgeColor = isSelected ? '#2563EB' : 'rgba(20,20,20,0.18)';
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(boundGeo),
    new THREE.LineBasicMaterial({ color: edgeColor })
  );
  edges.position.y = h / 2;
  group.add(edges);

  return group;
}

/* 가구 치수 라벨(W × D × H mm) 및 선택 시 주변 벽체 거리 가이드라인 표시 */
function buildItemDimensionOverlay(item) {
  const wx = toWorldX(item.xMm);
  const wz = toWorldZ(item.zMm);
  const wy = ((item.yMm || 0) + item.hMm) * MM_TO_UNIT + 0.16;

  const isSelected = state.selectedItemId === item.id;
  const labelText = `${item.name} (${item.wMm}×${item.dMm}mm)`;
  const sprite = createTextSprite(
    labelText,
    isSelected ? '#FFFFFF' : '#1E1E1E',
    isSelected ? '#181818' : 'rgba(255,255,255,0.92)'
  );
  sprite.position.set(wx, wy, wz);
  dimsGroup.add(sprite);

  // 선택된 가구인 경우 외곽 경계까지의 여유 거리(Clearance) 점선 표시
  if (isSelected) {
    const lineMat = new THREE.LineDashedMaterial({ color: '#2563EB', dashSize: 0.08, gapSize: 0.05 });
    const yLine = 0.03;
    const leftEdgeX = toWorldX(0);
    const rightEdgeX = toWorldX(state.planWidthMm);
    const topEdgeZ = toWorldZ(0);
    const botEdgeZ = toWorldZ(state.planDepthMm);

    const ptsX = [new THREE.Vector3(leftEdgeX, yLine, wz), new THREE.Vector3(rightEdgeX, yLine, wz)];
    const lineX = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsX), lineMat);
    lineX.computeLineDistances();

    const ptsZ = [new THREE.Vector3(wx, yLine, topEdgeZ), new THREE.Vector3(wx, yLine, botEdgeZ)];
    const lineZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsZ), lineMat);
    lineZ.computeLineDistances();

    dimsGroup.add(lineX, lineZ);
  }
}

function createTextSprite(text, textColor = '#141414', bgColor = 'rgba(255,255,255,0.9)') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '600 24px Inter, "Noto Sans KR", sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 22;
  const w = Math.ceil(metrics.width + padX * 2);
  const h = 44;
  canvas.width = w;
  canvas.height = h;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,20,20,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '600 22px Inter, "Noto Sans KR", sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const scaleFactor = 0.0038;
  sprite.scale.set(w * scaleFactor, h * scaleFactor, 1);
  return sprite;
}

/* =========================================================================
   마우스 & 모바일 터치 드래그 앤 드롭 (가구 선택 및 이동)
   ========================================================================= */
function setupViewportInteractions(domElem) {
  let downPos = { x: 0, y: 0 };

  domElem.addEventListener('pointerdown', (e) => {
    if (state.viewMode !== '3d') return;
    downPos = { x: e.clientX, y: e.clientY };
    updatePointerNDC(e, domElem);

    raycaster.setFromCamera(pointerNDC, orthoCamera);
    const hits = raycaster.intersectObjects(furnitureGroup.children, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && (!obj.userData || !obj.userData.isPlacedItem)) {
        obj = obj.parent;
      }
      if (obj && obj.userData.itemId) {
        const hitId = obj.userData.itemId;
        selectPlacedItem(hitId);
        isDraggingItem = true;
        draggedItemId = hitId;
        controls.enabled = false;

        const item = state.placedItems.find((it) => it.id === hitId);
        const planeY = ((item?.yMm || 0) * MM_TO_UNIT);
        dragPlane.constant = -planeY;

        const intersectPt = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersectPt);
        dragOffset.set(obj.position.x - intersectPt.x, 0, obj.position.z - intersectPt.z);
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingItem || !draggedItemId) return;
    updatePointerNDC(e, domElem);
    raycaster.setFromCamera(pointerNDC, orthoCamera);

    const intersectPt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
      const targetX = intersectPt.x + dragOffset.x;
      const targetZ = intersectPt.z + dragOffset.z;

      // 50mm 단위 자석 그리드 스냅 및 도면 내부 클램핑
      let newXMm = Math.round(toPlanMmX(targetX) / 50) * 50;
      let newZMm = Math.round(toPlanMmZ(targetZ) / 50) * 50;

      const item = state.placedItems.find((it) => it.id === draggedItemId);
      if (item) {
        newXMm = Math.max(200, Math.min(state.planWidthMm - 200, newXMm));
        newZMm = Math.max(200, Math.min(state.planDepthMm - 200, newZMm));
        item.xMm = newXMm;
        item.zMm = newZMm;

        // 즉시 위치 반영
        const groupObj = furnitureGroup.children.find((c) => c.userData.itemId === item.id);
        if (groupObj) {
          groupObj.position.x = toWorldX(item.xMm);
          groupObj.position.z = toWorldZ(item.zMm);
        }
        updateClearanceDisplay(item);
      }
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (isDraggingItem) {
      isDraggingItem = false;
      draggedItemId = null;
      controls.enabled = true;
      buildPlacedFurniture3D();
      saveStateToLocal();
      return;
    }

    // 짧은 클릭 시 빈 공간이면 선택 해제
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (dist < 5 && e.target === domElem) {
      updatePointerNDC(e, domElem);
      raycaster.setFromCamera(pointerNDC, orthoCamera);
      const hits = raycaster.intersectObjects(furnitureGroup.children, true);
      if (hits.length === 0 && state.selectedItemId) {
        selectPlacedItem(null);
      }
    }
  });
}

function updatePointerNDC(e, domElem) {
  const rect = domElem.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateFloatingBadgePosition() {
  const badge = document.getElementById('floatingItemBadge');
  if (!badge) return;

  if (!state.selectedItemId || state.viewMode !== '3d') {
    badge.classList.add('hidden');
    return;
  }

  const item = state.placedItems.find((it) => it.id === state.selectedItemId);
  if (!item) {
    badge.classList.add('hidden');
    return;
  }

  const worldPos = new THREE.Vector3(
    toWorldX(item.xMm),
    ((item.yMm || 0) + item.hMm) * MM_TO_UNIT + 0.3,
    toWorldZ(item.zMm)
  );
  worldPos.project(orthoCamera);

  const holder = document.getElementById('canvas3DHolder');
  const x = (worldPos.x * 0.5 + 0.5) * holder.clientWidth;
  const y = (-(worldPos.y * 0.5) + 0.5) * holder.clientHeight;

  badge.style.left = `${x}px`;
  badge.style.top = `${y}px`;
  badge.classList.remove('hidden');
}

/* =========================================================================
   도면 첨부 & 자동 벽체 스캔 / 2D-to-3D 편집기
   ========================================================================= */
function handleFloorplanImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    const img = new Image();
    img.onload = () => {
      state.uploadedFloorplanUrl = dataUrl;
      state.uploadedFloorplanImg = img;
      state.currentPreset = 'CUSTOM';

      // [규칙] 도면의 공간 구성과 비율을 정확히 유지할 것
      const aspect = img.naturalWidth / img.naturalHeight;
      const baseWidthMm = Number(document.getElementById('inputPlanWidthMm').value) || 11200;
      const calcDepthMm = Math.round((baseWidthMm / aspect) / 50) * 50;

      state.planWidthMm = baseWidthMm;
      state.planDepthMm = calcDepthMm;
      document.getElementById('inputPlanDepthMm').value = calcDepthMm;

      // 1) 기존 표준 평면도 템플릿 UI 카드 삭제(숨김) 및 선택 해제
      document.getElementById('presetTemplateCard')?.classList.add('hidden');
      document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));

      // 2) 기존 표준 평면도 템플릿의 3D 데이터(방, 벽체, 창호, 빌트인) 완전히 삭제 후 첨부 도면 전용 베이스 생성
      state.floorplanData = {
        title: `CUSTOM FLOOR PLAN (${file.name.toUpperCase()}) · ${baseWidthMm}×${calcDepthMm} MM`,
        widthMm: baseWidthMm,
        depthMm: calcDepthMm,
        rooms: [
          {
            id: 'r_custom_base',
            name: '첨부 도면 베이스',
            type: 'wood',
            x: 0,
            z: 0,
            w: baseWidthMm,
            d: calcDepthMm
          }
        ],
        walls: [],
        openings: [],
        fixtures: null
      };

      // Three.js 텍스처 생성 및 오버레이 농도 설정
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      state.uploadedFloorplanTexture = tex;
      if (state.floorplanOpacity < 0.7) {
        state.floorplanOpacity = 0.85;
        const opSlider = document.getElementById('sliderPlanOpacity');
        const opVal = document.getElementById('valPlanOpacity');
        if (opSlider) opSlider.value = 85;
        if (opVal) opVal.textContent = '85%';
      }

      // UI 업데이트
      document.getElementById('floorplanDropContent').classList.add('hidden');
      document.getElementById('floorplanPreviewBox').classList.remove('hidden');
      document.getElementById('floorplanThumb').src = dataUrl;
      document.getElementById('floorplanFileName').textContent = file.name;
      document.getElementById('floorplanRatioText').textContent =
        `비율 ${aspect.toFixed(2)} : 1 (${baseWidthMm.toLocaleString()} × ${calcDepthMm.toLocaleString()} mm)`;

      document.getElementById('archPlanTitleStamp').textContent = state.floorplanData.title;

      // 3) 첨부된 도면 이미지로부터 벽체 단면을 자동 스캔하여 3D로 생성
      autoTraceWallsFromUploadedImage(true);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function rescaleFloorplanToDimensions(newW, newD) {
  const plan = state.floorplanData;
  if (!plan) return;
  const sx = newW / plan.widthMm;
  const sz = newD / plan.depthMm;

  plan.widthMm = newW;
  plan.depthMm = newD;

  plan.rooms.forEach((r) => {
    r.x = Math.round(r.x * sx);
    r.z = Math.round(r.z * sz);
    r.w = Math.round(r.w * sx);
    r.d = Math.round(r.d * sz);
  });

  plan.walls.forEach((w) => {
    w.x1 = Math.round(w.x1 * sx);
    w.z1 = Math.round(w.z1 * sz);
    w.x2 = Math.round(w.x2 * sx);
    w.z2 = Math.round(w.z2 * sz);
  });

  plan.openings.forEach((o) => {
    o.x1 = Math.round(o.x1 * sx);
    o.z1 = Math.round(o.z1 * sz);
    o.x2 = Math.round(o.x2 * sx);
    o.z2 = Math.round(o.z2 * sz);
  });

  if (plan.fixtures) {
    if (plan.fixtures.kitchen) {
      plan.fixtures.kitchen.x = Math.round(plan.fixtures.kitchen.x * sx);
      plan.fixtures.kitchen.z = Math.round(plan.fixtures.kitchen.z * sz);
      plan.fixtures.kitchen.islandX = Math.round(plan.fixtures.kitchen.islandX * sx);
      plan.fixtures.kitchen.islandZ = Math.round(plan.fixtures.kitchen.islandZ * sz);
    }
    if (plan.fixtures.utility) {
      plan.fixtures.utility.x = Math.round(plan.fixtures.utility.x * sx);
      plan.fixtures.utility.z = Math.round(plan.fixtures.utility.z * sz);
    }
    if (plan.fixtures.baths) {
      plan.fixtures.baths.forEach((b) => {
        b.x = Math.round(b.x * sx);
        b.z = Math.round(b.z * sz);
      });
    }
    if (plan.fixtures.foyerShoe) {
      plan.fixtures.foyerShoe.x = Math.round(plan.fixtures.foyerShoe.x * sx);
      plan.fixtures.foyerShoe.z = Math.round(plan.fixtures.foyerShoe.z * sz);
    }
  }
}

/* 첨부 도면 이미지의 어두운 벽체 선분을 스캔·병합하여 3D 절단 벽체로 자동 추출 */
function autoTraceWallsFromUploadedImage(isInitialUpload = false) {
  if (!state.uploadedFloorplanImg) {
    showToast('먼저 도면 이미지를 첨부해 주세요.');
    return;
  }

  const img = state.uploadedFloorplanImg;
  const scanW = 200;
  const scanH = Math.max(60, Math.round(scanW * (img.naturalHeight / img.naturalWidth)));
  const offCanvas = document.createElement('canvas');
  offCanvas.width = scanW;
  offCanvas.height = scanH;
  const ctx = offCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, scanW, scanH);
  const imgData = ctx.getImageData(0, 0, scanW, scanH).data;

  const isDarkWallPixel = (x, y) => {
    const idx = (y * scanW + x) * 4;
    const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2], a = imgData[idx + 3];
    if (a < 90) return false;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 105; // 도면의 진한 벽체 단면 감지
  };

  const scaleX = state.planWidthMm / scanW;
  const scaleZ = state.planDepthMm / scanH;
  const horizWalls = [];
  const vertWalls = [];

  // 가로 방향 벽체 스캔 및 인접 중복선 병합
  for (let y = 3; y < scanH - 3; y += 2) {
    let runStart = -1;
    for (let x = 3; x < scanW - 3; x++) {
      if (isDarkWallPixel(x, y)) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1 && x - runStart >= 14) {
          const x1 = Math.round(runStart * scaleX);
          const x2 = Math.round(x * scaleX);
          const z = Math.round(y * scaleZ);
          const dup = horizWalls.find(
            (w) => Math.abs(w.z1 - z) < 280 && Math.max(w.x1, x1) <= Math.min(w.x2, x2) + 200
          );
          if (dup) {
            dup.x1 = Math.min(dup.x1, x1);
            dup.x2 = Math.max(dup.x2, x2);
          } else {
            horizWalls.push({ x1, z1: z, x2, z2: z, thick: 160 });
          }
        }
        runStart = -1;
      }
    }
  }

  // 세로 방향 벽체 스캔 및 인접 중복선 병합
  for (let x = 3; x < scanW - 3; x += 2) {
    let runStart = -1;
    for (let y = 3; y < scanH - 3; y++) {
      if (isDarkWallPixel(x, y)) {
        if (runStart === -1) runStart = y;
      } else {
        if (runStart !== -1 && y - runStart >= 14) {
          const z1 = Math.round(runStart * scaleZ);
          const z2 = Math.round(y * scaleZ);
          const xMm = Math.round(x * scaleX);
          const dup = vertWalls.find(
            (w) => Math.abs(w.x1 - xMm) < 280 && Math.max(w.z1, z1) <= Math.min(w.z2, z2) + 200
          );
          if (dup) {
            dup.z1 = Math.min(dup.z1, z1);
            dup.z2 = Math.max(dup.z2, z2);
          } else {
            vertWalls.push({ x1: xMm, z1, x2: xMm, z2, thick: 160 });
          }
        }
        runStart = -1;
      }
    }
  }

  const combined = [...horizWalls, ...vertWalls].slice(0, 60);
  state.floorplanData.walls = combined;
  rebuild3DArchitecture();
  render2DFloorplanCanvas();

  if (isInitialUpload) {
    showToast(`📐 표준 템플릿을 삭제하고 첨부 도면 비율(${state.planWidthMm}×${state.planDepthMm}mm)과 벽체(${combined.length}개)로 변환했습니다.`);
  } else {
    showToast(`⚡ 첨부 도면에서 ${combined.length}개의 주요 벽체 단면을 추출하여 3D로 세웠습니다!`);
  }
}

/* =========================================================================
   2D 도면 & 공간 편집기 캔버스 렌더링 및 인터랙션
   ========================================================================= */
function setup2DFloorplanEditor() {
  const canvas = document.getElementById('floorplan2DCanvas');
  if (!canvas) return;

  let isDragging2D = false;
  let dragStartMm = { x: 0, z: 0 };

  const getCanvasMm = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const pad = 40;
    const availW = canvas.width - pad * 2;
    const availH = canvas.height - pad * 2;
    const scale = Math.min(availW / state.planWidthMm, availH / state.planDepthMm);
    const offsetX = (canvas.width - state.planWidthMm * scale) / 2;
    const offsetY = (canvas.height - state.planDepthMm * scale) / 2;

    return {
      x: Math.round(((cx - offsetX) / scale) / 100) * 100,
      z: Math.round(((cy - offsetY) / scale) / 100) * 100
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const pt = getCanvasMm(e);
    dragStartMm = pt;
    const plan = state.floorplanData;

    if (state.tool2D === 'select') {
      // 클릭한 방 찾기
      const hitRoom = [...plan.rooms].reverse().find(
        (r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.z >= r.z && pt.z <= r.z + r.d
      );
      state.selected2DElement = hitRoom || null;
      isDragging2D = !!hitRoom;
      render2DFloorplanCanvas();
    } else if (state.tool2D.startsWith('add-room-')) {
      const rType = state.tool2D.replace('add-room-', '');
      const names = { wood: '침실/거실 (원목마루)', bath: '욕실 (타일)', utility: '실외실' };
      const newRoom = {
        id: `r_${Date.now()}`,
        name: names[rType] || '공간',
        type: rType,
        x: Math.max(0, pt.x - 1200),
        z: Math.max(0, pt.z - 1200),
        w: 2400,
        d: 2400
      };
      plan.rooms.push(newRoom);
      // 방 외곽 벽체 자동 추가
      plan.walls.push(
        { x1: newRoom.x, z1: newRoom.z, x2: newRoom.x + newRoom.w, z2: newRoom.z, thick: 160 },
        { x1: newRoom.x + newRoom.w, z1: newRoom.z, x2: newRoom.x + newRoom.w, z2: newRoom.z + newRoom.d, thick: 160 },
        { x1: newRoom.x, z1: newRoom.z + newRoom.d, x2: newRoom.x + newRoom.w, z2: newRoom.z + newRoom.d, thick: 160 },
        { x1: newRoom.x, z1: newRoom.z, x2: newRoom.x, z2: newRoom.z + newRoom.d, thick: 160 }
      );
      state.selected2DElement = newRoom;
      rebuild3DArchitecture();
      render2DFloorplanCanvas();
      showToast(`📐 [${newRoom.name}] 공간과 절단 벽체를 추가했습니다.`);
    } else if (state.tool2D === 'add-door' || state.tool2D === 'add-window') {
      const isDoor = state.tool2D === 'add-door';
      plan.openings.push({
        type: isDoor ? 'door' : 'sash',
        x1: pt.x - (isDoor ? 450 : 900),
        z1: pt.z,
        x2: pt.x + (isDoor ? 450 : 900),
        z2: pt.z
      });
      rebuild3DArchitecture();
      render2DFloorplanCanvas();
      showToast(isDoor ? '🚪 도면에 문을 추가했습니다.' : '🪟 도면에 창문/베란다 새시를 추가했습니다.');
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging2D || !state.selected2DElement) return;
    const pt = getCanvasMm(e);
    const dx = pt.x - dragStartMm.x;
    const dz = pt.z - dragStartMm.z;
    if (Math.abs(dx) >= 100 || Math.abs(dz) >= 100) {
      state.selected2DElement.x += dx;
      state.selected2DElement.z += dz;
      dragStartMm = pt;
      render2DFloorplanCanvas();
    }
  });

  window.addEventListener('pointerup', () => {
    if (isDragging2D) {
      isDragging2D = false;
      rebuild3DArchitecture();
    }
  });
}

function render2DFloorplanCanvas() {
  const canvas = document.getElementById('floorplan2DCanvas');
  if (!canvas || !state.floorplanData) return;
  const ctx = canvas.getContext('2d');
  const plan = state.floorplanData;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 40;
  const availW = canvas.width - pad * 2;
  const availH = canvas.height - pad * 2;
  const scale = Math.min(availW / plan.widthMm, availH / plan.depthMm);
  const ox = (canvas.width - plan.widthMm * scale) / 2;
  const oy = (canvas.height - plan.depthMm * scale) / 2;

  // 첨부 도면 배경 그리기
  if (state.uploadedFloorplanImg) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(state.uploadedFloorplanImg, ox, oy, plan.widthMm * scale, plan.depthMm * scale);
    ctx.restore();
  }

  // 방 영역 그리기
  plan.rooms.forEach((r) => {
    const rx = ox + r.x * scale;
    const ry = oy + r.z * scale;
    const rw = r.w * scale;
    const rh = r.d * scale;

    const colors = {
      wood: 'rgba(227, 199, 159, 0.55)',
      bath: 'rgba(205, 214, 220, 0.65)',
      utility: 'rgba(195, 202, 208, 0.65)',
      balcony: 'rgba(235, 238, 240, 0.65)',
      foyer: 'rgba(210, 210, 205, 0.65)'
    };
    ctx.fillStyle = colors[r.type] || colors.wood;
    ctx.fillRect(rx, ry, rw, rh);

    if (state.selected2DElement && state.selected2DElement.id === r.id) {
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    ctx.fillStyle = '#181818';
    ctx.font = '600 12px Inter, "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.name, rx + rw / 2, ry + rh / 2);
    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(`${r.w}×${r.d}mm`, rx + rw / 2, ry + rh / 2 + 15);
  });

  // 절단 벽체 그리기
  ctx.strokeStyle = '#141414';
  ctx.lineCap = 'square';
  plan.walls.forEach((w) => {
    ctx.lineWidth = Math.max(4, (w.thick || 160) * scale);
    ctx.beginPath();
    ctx.moveTo(ox + w.x1 * scale, oy + w.z1 * scale);
    ctx.lineTo(ox + w.x2 * scale, oy + w.z2 * scale);
    ctx.stroke();
  });

  // 창호 표시
  plan.openings.forEach((op) => {
    ctx.strokeStyle = op.type === 'door' ? '#C68B59' : '#38BDF8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ox + op.x1 * scale, oy + op.z1 * scale);
    ctx.lineTo(ox + op.x2 * scale, oy + op.z2 * scale);
    ctx.stroke();
  });
}

/* =========================================================================
   가구·가전·소품 추가, 이미지 색상 추출, 선택 및 인스펙터 업데이트
   ========================================================================= */
function extractDominantColorFromImage(img) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 32, 32);
  const data = ctx.getImageData(8, 8, 16, 16).data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    // 너무 흰색 배경(누끼 배경)은 제외
    if (a > 128 && !(r > 242 && g > 242 && b > 242)) {
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }
  }
  if (count === 0) return '#EAE6DF';
  const toHex = (n) => Math.round(n / count).toString(16).padStart(2, '0');
  return `#${toHex(rSum)}${toHex(gSum)}${toHex(bSum)}`.toUpperCase();
}

function addFurnitureItem(itemSpec) {
  // 기본 배치 위치: 거실 중앙 부근 (겹침 방지 오프셋)
  const offsetCount = state.placedItems.length % 5;
  const defaultX = Math.round(state.planWidthMm * 0.38) + offsetCount * 250;
  const defaultZ = Math.round(state.planDepthMm * 0.56) + offsetCount * 200;

  const newItem = {
    id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: itemSpec.name || '커스텀 가구',
    cat: itemSpec.cat || 'furniture',
    shape: itemSpec.shape || 'sofa',
    wMm: Number(itemSpec.w) || 1200,
    dMm: Number(itemSpec.d) || 800,
    hMm: Number(itemSpec.h) || 750,
    yMm: Number(itemSpec.y) || 0,
    xMm: itemSpec.xMm || defaultX,
    zMm: itemSpec.zMm || defaultZ,
    rotDeg: itemSpec.rotDeg || 0,
    color: itemSpec.color || '#EAE6DF',
    imageUrl: itemSpec.imageUrl || null,
    imageTexture: null
  };

  if (newItem.imageUrl) {
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      newItem.imageTexture = tex;
      buildPlacedFurniture3D();
    };
    img.src = newItem.imageUrl;
  }

  state.placedItems.push(newItem);
  state.selectedItemId = newItem.id;
  buildPlacedFurniture3D();
  saveStateToLocal();
  showToast(`🛋️ [${newItem.name}] (${newItem.wMm}×${newItem.dMm}×${newItem.hMm}mm)가 3D 도면에 배치되었습니다.`);
}

function selectPlacedItem(itemId) {
  state.selectedItemId = itemId;
  buildPlacedFurniture3D();

  const item = state.placedItems.find((it) => it.id === itemId);
  const badge = document.getElementById('floatingItemBadge');
  if (item && badge) {
    document.getElementById('floatingBadgeTitle').textContent = item.name;
    document.getElementById('floatingBadgeDims').textContent = `${item.wMm} × ${item.dMm} × ${item.hMm} mm`;
    const badgeImg = document.getElementById('floatingBadgeImg');
    if (item.imageUrl) {
      badgeImg.src = item.imageUrl;
      badgeImg.classList.remove('hidden');
    } else {
      badgeImg.classList.add('hidden');
    }
  }
}

function updateClearanceDisplay(item) {
  const clearanceEl = document.getElementById('clearanceText');
  if (!clearanceEl || !item) return;
  const leftDist = Math.max(0, Math.round(item.xMm - item.wMm / 2));
  const rightDist = Math.max(0, Math.round(state.planWidthMm - (item.xMm + item.wMm / 2)));
  const backDist = Math.max(0, Math.round(item.zMm - item.dMm / 2));
  clearanceEl.textContent = `좌측 ${leftDist.toLocaleString()}mm · 우측 ${rightDist.toLocaleString()}mm · 후면 ${backDist.toLocaleString()}mm`;
}

function updatePlacedListUI() {
  const countBadge = document.getElementById('placedCountBadge');
  const listEl = document.getElementById('placedItemList');
  if (countBadge) countBadge.textContent = String(state.placedItems.length);
  if (!listEl) return;

  if (state.placedItems.length === 0) {
    listEl.innerHTML = `<li class="empty-list-item">아직 추가된 가구가 없습니다. (건축 기본 공간 상태)</li>`;
    return;
  }

  listEl.innerHTML = '';
  state.placedItems.forEach((it) => {
    const li = document.createElement('li');
    li.className = `placed-item-row ${state.selectedItemId === it.id ? 'active' : ''}`;
    li.innerHTML = `
      <span>${it.name} <small style="color:#777">(${it.wMm}×${it.dMm}mm)</small></span>
      <span>${it.rotDeg || 0}°</span>
    `;
    li.addEventListener('click', () => selectPlacedItem(it.id));
    listEl.appendChild(li);
  });
}

function updateInspectorUI() {
  const noSel = document.getElementById('noSelectionNotice');
  const ctrlBox = document.getElementById('selectionControls');
  const tag = document.getElementById('selectedItemTag');
  const item = state.placedItems.find((it) => it.id === state.selectedItemId);

  if (!item) {
    noSel.classList.remove('hidden');
    ctrlBox.classList.add('hidden');
    tag.textContent = '선택 없음';
    return;
  }

  noSel.classList.add('hidden');
  ctrlBox.classList.remove('hidden');
  tag.textContent = item.cat === 'appliance' ? '가전제품' : item.cat === 'prop' ? '소품' : '가구';

  document.getElementById('selItemTitle').textContent = item.name;
  document.getElementById('selItemDimsText').textContent = `${item.wMm} × ${item.dMm} × ${item.hMm} mm`;

  const thumb = document.getElementById('selItemThumb');
  if (item.imageUrl) {
    thumb.src = item.imageUrl;
    thumb.classList.remove('hidden');
  } else {
    thumb.classList.add('hidden');
  }

  document.getElementById('sliderItemRot').value = item.rotDeg || 0;
  document.getElementById('valItemRot').textContent = `${item.rotDeg || 0}°`;
  document.getElementById('editItemW').value = item.wMm;
  document.getElementById('editItemD').value = item.dMm;
  document.getElementById('editItemH').value = item.hMm;
  document.getElementById('editItemY').value = item.yMm || 0;
  document.getElementById('editItemColor').value = item.color || '#EAE6DF';

  updateClearanceDisplay(item);
}

/* =========================================================================
   카메라 각도 프리셋 & 건축 프레젠테이션 고화질 PNG 내보내기
   ========================================================================= */
function setCameraPreset(presetName) {
  const dist = 11.8;
  controls.target.set(0, 0.35, 0);

  switch (presetName) {
    case 'iso-se':
      orthoCamera.position.set(dist, dist, dist);
      break;
    case 'iso-sw':
      orthoCamera.position.set(-dist, dist, dist);
      break;
    case 'iso-ne':
      orthoCamera.position.set(dist, dist, -dist);
      break;
    case 'iso-nw':
      orthoCamera.position.set(-dist, dist, -dist);
      break;
    case 'top':
      orthoCamera.position.set(0, 18, 0.01);
      break;
  }
  orthoCamera.lookAt(controls.target);
  orthoCamera.updateProjectionMatrix();
  controls.update();
}

function exportPresentationPNG() {
  if (!renderer || !scene || !orthoCamera) return;
  renderer.render(scene, orthoCamera);

  const srcCanvas = renderer.domElement;
  const outW = 1920;
  const outH = 1360;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');

  // [스타일] 화이트 배경 & 얇은 건축 프레젠테이션 테두리 프레임
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, outW, outH);

  // 3D 렌더링 뷰 중앙 배치 (비율 유지)
  const srcAspect = srcCanvas.width / srcCanvas.height;
  const targetH = outH - 120;
  const targetW = targetH * srcAspect;
  const drawX = (outW - targetW) / 2;
  const drawY = 50;
  ctx.drawImage(srcCanvas, drawX, drawY, targetW, targetH);

  // 외곽 이중 얇은 테두리 프레임
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, outW - 48, outH - 48);
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, outW - 68, outH - 68);

  // 상단/하단 건축 프레젠테이션 타이틀 스탬프
  ctx.fillStyle = '#141414';
  ctx.font = '700 18px Inter, "Noto Sans KR", sans-serif';
  ctx.fillText('3D ISOMETRIC CUTAWAY VIEW · ARCHITECTURAL PRESENTATION', 56, 68);

  ctx.fillStyle = '#555555';
  ctx.font = '500 14px Inter, "Noto Sans KR", sans-serif';
  ctx.fillText(
    `${state.floorplanData.title} | Placed Items: ${state.placedItems.length}`,
    56,
    outH - 52
  );

  const link = document.createElement('a');
  link.download = `archicut-3d-cutaway-${Date.now()}.png`;
  link.href = outCanvas.toDataURL('image/png');
  link.click();
  showToast('📸 건축 프레젠테이션 퀄리티 3D 절단 뷰 이미지가 저장되었습니다.');
}

/* =========================================================================
   로컬 스토리지 저장/복원 및 UI 이벤트 바인딩
   ========================================================================= */
function saveStateToLocal() {
  try {
    const serializableItems = state.placedItems.map((it) => ({
      ...it,
      imageTexture: null
    }));
    localStorage.setItem('archicut_placed_items_v1', JSON.stringify(serializableItems));
  } catch (_) {}
}

function loadStateFromLocal() {
  try {
    const raw = localStorage.getItem('archicut_placed_items_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.placedItems = parsed;
      }
    }
  } catch (_) {}
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

function bindUIEvents() {
  // 상단 뷰 모드 전환 (3D 절단 뷰 / 2D 도면 편집기 / 건축 렌더링 레퍼런스)
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.viewMode;
      state.viewMode = mode;

      document.getElementById('canvas3DHolder').classList.toggle('hidden', mode !== '3d');
      document.getElementById('viewportControlsBar').classList.toggle('hidden', mode !== '3d');
      document.getElementById('editor2DHolder').classList.toggle('hidden', mode !== '2d');
      document.getElementById('referenceViewHolder').classList.toggle('hidden', mode !== 'ref');

      if (mode === '2d') render2DFloorplanCanvas();
      if (mode === '3d') onWindowResize();
    });
  });

  document.getElementById('btnBackToInteractive3D')?.addEventListener('click', () => {
    document.getElementById('btnMode3D').click();
  });

  // 좌측 사이드바 탭 전환
  document.querySelectorAll('.sidebar-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      document.getElementById(tabBtn.dataset.tab)?.classList.add('active');
    });
  });

  // 모바일 바텀 시트 접기/펼치기
  const sidebar = document.getElementById('controlSidebar');
  const handleBar = document.getElementById('sheetHandleBar');
  handleBar?.addEventListener('click', () => {
    sidebar.classList.toggle('sheet-collapsed');
    const toggleBtn = document.getElementById('btnToggleSheet');
    if (toggleBtn) {
      toggleBtn.textContent = sidebar.classList.contains('sheet-collapsed') ? '▲' : '▼';
    }
    setTimeout(onWindowResize, 260);
  });

  // 도면 파일 업로드 (드롭존 & 상단 버튼)
  const dropzone = document.getElementById('floorplanDropzone');
  const fileInput = document.getElementById('floorplanFileInput');
  const quickInput = document.getElementById('quickFloorplanInput');

  dropzone?.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    fileInput.click();
  });
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) handleFloorplanImageUpload(e.dataTransfer.files[0]);
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleFloorplanImageUpload(e.target.files[0]);
  });
  quickInput?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleFloorplanImageUpload(e.target.files[0]);
  });

  document.getElementById('btnAutoTraceFloorplan')?.addEventListener('click', (e) => {
    e.stopPropagation();
    autoTraceWallsFromUploadedImage(false);
  });

  document.getElementById('btnClearCustomWalls')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.floorplanData) {
      state.floorplanData.walls = [];
      state.floorplanData.openings = [];
      state.floorplanData.fixtures = null;
      rebuild3DArchitecture();
      render2DFloorplanCanvas();
      showToast('🧹 추출된 벽체를 모두 비우고 첨부 도면 바닥면만 남겼습니다.');
    }
  });

  document.getElementById('btnEdit2DFloorplan')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('btnMode2D').click();
  });

  document.getElementById('btnRemoveFloorplan')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.uploadedFloorplanUrl = null;
    state.uploadedFloorplanImg = null;
    state.uploadedFloorplanTexture = null;
    document.getElementById('floorplanFileInput').value = '';
    document.getElementById('quickFloorplanInput').value = '';
    document.getElementById('floorplanDropContent').classList.remove('hidden');
    document.getElementById('floorplanPreviewBox').classList.add('hidden');

    // 첨부 도면 제거 시 표준 평면도 템플릿 복원
    document.getElementById('presetTemplateCard')?.classList.remove('hidden');
    state.currentPreset = '84A';
    state.floorplanData = getPresetFloorplan('84A');
    document.querySelectorAll('.preset-card').forEach((c) => {
      c.classList.toggle('active', c.dataset.planPreset === '84A');
    });
    document.getElementById('inputPlanWidthMm').value = state.floorplanData.widthMm;
    document.getElementById('inputPlanDepthMm').value = state.floorplanData.depthMm;
    document.getElementById('archPlanTitleStamp').textContent = state.floorplanData.title;

    rebuild3DArchitecture();
    render2DFloorplanCanvas();
    showToast('첨부 도면을 제거하고 기본 평면도 템플릿을 복원했습니다.');
  });

  // 도면 가로/세로 전체 치수 변경
  const onPlanSizeChange = () => {
    const nw = Number(document.getElementById('inputPlanWidthMm').value) || 11200;
    const nd = Number(document.getElementById('inputPlanDepthMm').value) || 9200;
    rescaleFloorplanToDimensions(nw, nd);
    rebuild3DArchitecture();
    buildPlacedFurniture3D();
  };
  document.getElementById('inputPlanWidthMm')?.addEventListener('change', onPlanSizeChange);
  document.getElementById('inputPlanDepthMm')?.addEventListener('change', onPlanSizeChange);

  // 도면 오버레이 투명도
  document.getElementById('sliderPlanOpacity')?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    state.floorplanOpacity = v / 100;
    document.getElementById('valPlanOpacity').textContent = `${v}%`;
    rebuild3DArchitecture();
  });

  // 표준 평면도 템플릿 선택
  document.querySelectorAll('.preset-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const key = card.dataset.planPreset;
      state.currentPreset = key;
      state.floorplanData = getPresetFloorplan(key);
      document.getElementById('inputPlanWidthMm').value = state.floorplanData.widthMm;
      document.getElementById('inputPlanDepthMm').value = state.floorplanData.depthMm;
      document.getElementById('archPlanTitleStamp').textContent = state.floorplanData.title;
      rebuild3DArchitecture();
      buildPlacedFurniture3D();
      render2DFloorplanCanvas();
      showToast(`🏢 [${card.querySelector('strong').textContent}] 평면도로 전환했습니다.`);
    });
  });

  // [규칙/공간요소/스타일] 건축 옵션 컨트롤
  document.getElementById('sliderWallHeight')?.addEventListener('input', (e) => {
    state.wallHeightMm = Number(e.target.value);
    document.getElementById('valWallHeight').textContent = `${state.wallHeightMm.toLocaleString()} mm`;
    rebuild3DArchitecture();
  });

  document.getElementById('selectWallCapColor')?.addEventListener('change', (e) => {
    state.wallCapColor = e.target.value;
    rebuild3DArchitecture();
  });

  document.getElementById('selectWoodTone')?.addEventListener('change', (e) => {
    state.woodTone = e.target.value;
    rebuild3DArchitecture();
  });

  document.getElementById('chkBathroomFixtures')?.addEventListener('change', (e) => {
    state.showBathroom = e.target.checked;
    rebuild3DArchitecture();
  });
  document.getElementById('chkKitchenFixtures')?.addEventListener('change', (e) => {
    state.showKitchen = e.target.checked;
    rebuild3DArchitecture();
  });
  document.getElementById('chkUtilityFixtures')?.addEventListener('change', (e) => {
    state.showUtility = e.target.checked;
    rebuild3DArchitecture();
  });
  document.getElementById('chkOpenings')?.addEventListener('change', (e) => {
    state.showOpenings = e.target.checked;
    rebuild3DArchitecture();
  });
  document.getElementById('chkArchFrame')?.addEventListener('change', (e) => {
    state.showArchFrame = e.target.checked;
    document.getElementById('archFrameContainer')?.classList.toggle('frame-off', !state.showArchFrame);
  });
  document.getElementById('chkRoomLabels')?.addEventListener('change', (e) => {
    state.showRoomLabels = e.target.checked;
    rebuild3DArchitecture();
  });

  document.getElementById('sliderSunAngle')?.addEventListener('input', (e) => {
    state.sunAngleDeg = Number(e.target.value);
    document.getElementById('valSunAngle').textContent = `자연광 ${state.sunAngleDeg}°`;
    updateSunLightPosition(state.sunAngleDeg);
  });

  // 탭 2: 가구/가전/소품 커스텀 입력 폼
  document.querySelectorAll('.cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.pendingItemCategory = pill.dataset.itemCat;
    });
  });

  document.getElementById('itemColorInput')?.addEventListener('input', (e) => {
    document.getElementById('itemColorHex').textContent = e.target.value.toUpperCase();
  });

  // 제품 사진 첨부 시 미리보기 및 대표 색상 자동 추출
  document.getElementById('itemImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.pendingItemImgUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const domHex = extractDominantColorFromImage(img);
        document.getElementById('itemColorInput').value = domHex;
        document.getElementById('itemColorHex').textContent = domHex;
      };
      img.src = state.pendingItemImgUrl;

      document.getElementById('itemImgPlaceholder').classList.add('hidden');
      document.getElementById('itemImgPreviewWrap').classList.remove('hidden');
      document.getElementById('itemImgPreview').src = state.pendingItemImgUrl;
      document.getElementById('itemImgName').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnClearItemImg')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.pendingItemImgUrl = null;
    document.getElementById('itemImageInput').value = '';
    document.getElementById('itemImgPlaceholder').classList.remove('hidden');
    document.getElementById('itemImgPreviewWrap').classList.add('hidden');
  });

  document.getElementById('btnAddCustomItem')?.addEventListener('click', () => {
    const name = document.getElementById('itemNameInput').value.trim() || '커스텀 품목';
    const shape = document.getElementById('itemShapeSelect').value;
    const w = Number(document.getElementById('itemWidthInput').value) || 1000;
    const d = Number(document.getElementById('itemDepthInput').value) || 600;
    const h = Number(document.getElementById('itemHeightInput').value) || 750;
    const y = Number(document.getElementById('itemElevationInput').value) || 0;
    const color = document.getElementById('itemColorInput').value;

    addFurnitureItem({
      name,
      cat: state.pendingItemCategory,
      shape,
      w,
      d,
      h,
      y,
      color,
      imageUrl: state.pendingItemImgUrl
    });
  });

  // 빠른 실측 카탈로그 렌더링
  const catalogGrid = document.getElementById('quickCatalogGrid');
  if (catalogGrid) {
    QUICK_CATALOG.forEach((catItem) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'catalog-chip';
      btn.innerHTML = `
        <strong>${catItem.name}</strong>
        <span>${catItem.w} × ${catItem.d} × ${catItem.h} mm</span>
      `;
      btn.addEventListener('click', () => addFurnitureItem(catItem));
      catalogGrid.appendChild(btn);
    });
  }

  document.getElementById('btnClearAllFurniture')?.addEventListener('click', () => {
    state.placedItems = [];
    state.selectedItemId = null;
    buildPlacedFurniture3D();
    saveStateToLocal();
    showToast('🧹 추가된 모든 가구·가전·소품을 비우고 건축 기본 절단 뷰 상태로 복원했습니다.');
  });

  // 탭 3: 선택된 가구 정밀 제어 이벤트
  document.getElementById('sliderItemRot')?.addEventListener('input', (e) => {
    const item = state.placedItems.find((it) => it.id === state.selectedItemId);
    if (!item) return;
    item.rotDeg = Number(e.target.value);
    document.getElementById('valItemRot').textContent = `${item.rotDeg}°`;
    buildPlacedFurniture3D();
    saveStateToLocal();
  });

  document.querySelectorAll('[data-rot-delta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.placedItems.find((it) => it.id === state.selectedItemId);
      if (!item) return;
      const delta = Number(btn.dataset.rotDelta);
      item.rotDeg = ((item.rotDeg || 0) + delta + 360) % 360;
      buildPlacedFurniture3D();
      saveStateToLocal();
    });
  });

  const bindDimEdit = (inputId, prop) => {
    document.getElementById(inputId)?.addEventListener('change', (e) => {
      const item = state.placedItems.find((it) => it.id === state.selectedItemId);
      if (!item) return;
      item[prop] = Number(e.target.value);
      buildPlacedFurniture3D();
      saveStateToLocal();
    });
  };
  bindDimEdit('editItemW', 'wMm');
  bindDimEdit('editItemD', 'dMm');
  bindDimEdit('editItemH', 'hMm');
  bindDimEdit('editItemY', 'yMm');

  document.getElementById('editItemColor')?.addEventListener('input', (e) => {
    const item = state.placedItems.find((it) => it.id === state.selectedItemId);
    if (!item) return;
    item.color = e.target.value;
    buildPlacedFurniture3D();
    saveStateToLocal();
  });

  document.getElementById('btnDuplicateItem')?.addEventListener('click', () => {
    const item = state.placedItems.find((it) => it.id === state.selectedItemId);
    if (!item) return;
    addFurnitureItem({
      name: `${item.name} (복사)`,
      cat: item.cat,
      shape: item.shape,
      w: item.wMm,
      d: item.dMm,
      h: item.hMm,
      y: item.yMm,
      xMm: item.xMm + 400,
      zMm: item.zMm + 400,
      rotDeg: item.rotDeg,
      color: item.color,
      imageUrl: item.imageUrl
    });
  });

  const deleteSelectedItem = () => {
    if (!state.selectedItemId) return;
    state.placedItems = state.placedItems.filter((it) => it.id !== state.selectedItemId);
    state.selectedItemId = null;
    buildPlacedFurniture3D();
    saveStateToLocal();
    showToast('선택한 아이템을 삭제했습니다.');
  };

  document.getElementById('btnDeleteItem')?.addEventListener('click', deleteSelectedItem);
  document.getElementById('floatingBtnDel')?.addEventListener('click', deleteSelectedItem);
  document.getElementById('floatingBtnRot')?.addEventListener('click', () => {
    const item = state.placedItems.find((it) => it.id === state.selectedItemId);
    if (!item) return;
    item.rotDeg = ((item.rotDeg || 0) + 90) % 360;
    buildPlacedFurniture3D();
    saveStateToLocal();
  });

  // 카메라 컨트롤 바
  document.querySelectorAll('[data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cam]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setCameraPreset(btn.dataset.cam);
    });
  });

  document.getElementById('btnToggleDims')?.addEventListener('click', (e) => {
    state.showDims = !state.showDims;
    e.currentTarget.textContent = state.showDims ? '📏 치수선 ON' : '📏 치수선 OFF';
    buildPlacedFurniture3D();
  });

  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    orthoCamera.zoom = Math.min(3.5, orthoCamera.zoom * 1.18);
    orthoCamera.updateProjectionMatrix();
  });
  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    orthoCamera.zoom = Math.max(0.45, orthoCamera.zoom / 1.18);
    orthoCamera.updateProjectionMatrix();
  });
  document.getElementById('btnResetCam')?.addEventListener('click', () => {
    orthoCamera.zoom = 1.02;
    setCameraPreset('iso-se');
  });

  // 2D 도면 편집기 툴바
  document.querySelectorAll('.tool-2d-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-2d-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tool2D = btn.dataset['2dTool'];
    });
  });

  document.getElementById('btnDelete2DElem')?.addEventListener('click', () => {
    if (!state.selected2DElement) return;
    state.floorplanData.rooms = state.floorplanData.rooms.filter(
      (r) => r.id !== state.selected2DElement.id
    );
    state.selected2DElement = null;
    rebuild3DArchitecture();
    render2DFloorplanCanvas();
  });

  document.getElementById('btnApply2DTo3D')?.addEventListener('click', () => {
    rebuild3DArchitecture();
    document.getElementById('btnMode3D').click();
    showToast('🧊 편집한 도면 구성을 3D 아이소메트릭 절단 뷰에 반영했습니다.');
  });

  // JSON 프로젝트 저장/불러오기
  document.getElementById('btnSaveProject')?.addEventListener('click', () => {
    const payload = {
      preset: state.currentPreset,
      floorplanData: state.floorplanData,
      placedItems: state.placedItems.map((it) => ({ ...it, imageTexture: null }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `archicut-project-${Date.now()}.json`;
    a.click();
  });

  document.getElementById('loadProjectInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.floorplanData) state.floorplanData = data.floorplanData;
        if (Array.isArray(data.placedItems)) state.placedItems = data.placedItems;
        rebuild3DArchitecture();
        buildPlacedFurniture3D();
        showToast('📂 인테리어 프로젝트를 불러왔습니다.');
      } catch (_) {
        showToast('올바른 프로젝트 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  });

  // 고화질 PNG 저장
  document.getElementById('btnExportPNG')?.addEventListener('click', exportPresentationPNG);

  // 모바일/앱 설치 모달 및 PWA 설치 프롬프트
  const modal = document.getElementById('appInstallModal');
  document.getElementById('btnAppInstall')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
  });
  document.getElementById('btnCloseInstallModal')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  document.getElementById('btnTriggerPWAInstall')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      showToast('브라우저 우측 상단 메뉴(⋮) 또는 공유 버튼(📤)에서 [홈 화면에 추가 / 앱 설치]를 선택해 주세요.');
    }
  });
}

/* =========================================================================
   초기 부트스트랩 실행
   ========================================================================= */
window.addEventListener('DOMContentLoaded', () => {
  state.floorplanData = getPresetFloorplan('84A');
  loadStateFromLocal();
  initThreeScene();
  rebuild3DArchitecture();
  buildPlacedFurniture3D();
  setup2DFloorplanEditor();
  bindUIEvents();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});


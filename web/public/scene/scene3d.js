// The homepage's opening scene in 3D: a desk seen from above, real sun and shadows, and each
// piece of gear landing as you scroll. Loaded only when the browser can draw it; the drawn
// scene in the page stays underneath as the fallback. three.js is vendored in /vendor/three.
import * as THREE from '/vendor/three/three.module.min.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';
import { RoomEnvironment } from '/vendor/three/RoomEnvironment.js';

// To swap in a new model, change `file`. `width` is the real width in metres: whatever units
// the file uses, it is scaled so its widest side matches. `turn` spins it to face the user.
// `beat` is the scroll step it lands on.
const GEAR = [
  { id: 'monitor', beat: 1, file: '/models/monitor.glb', width: 0.605, turn: 0 },
  { id: 'keyboard', beat: 2, file: '/models/keyboard.glb', width: 0.305, turn: 0 },
  { id: 'pad', beat: 3, file: '/models/pad.glb', width: 0.49, turn: 0 },
  { id: 'mouse', beat: 4, file: '/models/mouse.glb', width: 0.1195, turn: Math.PI / 2 },
];
const BEATS = 5, DESK_THICK = 0.03;

// Where each piece sits on a desk of w x d metres (origin at the middle of the top, +z toward the user).
function spot(id, w, d){
  const padX = Math.max(0.16, w / 2 - 0.3), padZ = d / 2 - 0.26;
  return {
    monitor: [0, 0, -d / 2 + 0.2],
    keyboard: [-Math.min(0.2, w * 0.14), 0, d / 2 - 0.13],
    pad: [padX, 0, padZ],
    mouse: [padX - 0.02, 0.0039, padZ + 0.03],
  }[id];
}

function oak(){
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'), base = g.createLinearGradient(0, 0, 1024, 512);
  base.addColorStop(0, '#D9BE94'); base.addColorStop(1, '#C8A877'); g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 900; i++) {   // grain: long faint streaks along the desk
    const y = Math.random() * 512, x = Math.random() * 1024, len = 120 + Math.random() * 500;
    g.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '120,84,44' : '255,244,224') + ',' + (0.03 + Math.random() * 0.07) + ')';
    g.lineWidth = 0.5 + Math.random() * 1.5; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + 2, x + len * 2 / 3, y - 2, x + len, y + 1); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export async function start(section, getDesk){
  const view = section.querySelector('.view'), canvas = document.createElement('canvas');
  // No graphics card means the browser would draw this on the processor at a few frames a
  // second, so those visitors keep the drawn scene. ?3d=force skips the test, for checking
  // the scene on a machine without one.
  const force = /[?&]3d=force/.test(location.search);
  const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !force });
  if (!gl) return;
  const info = gl.getExtension('WEBGL_debug_renderer_info'), card = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
  if (!force && /swiftshader|llvmpipe|software/i.test(card)) return;
  canvas.className = 'stage3d'; canvas.setAttribute('aria-hidden', 'true'); view.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#3457CC');
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);

  // sun through a window: one light with shadows, and unseen slats that only cast them
  const sun = new THREE.DirectionalLight('#FFF1DC', 2.6); sun.position.set(-1.6, 2.6, 0.9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.004; sun.shadow.radius = 5;
  Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 7 });
  scene.add(sun, new THREE.HemisphereLight('#DCE6FF', '#3A4A8A', 1.3));
  const unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  [[-0.95, 0.3], [-0.2, 0.05], [0.42, 0.05], [1.1, 0.3]].forEach(([x, wide]) => {   // window frame bars
    const bar = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.004, 3.4), unseen); bar.castShadow = true;
    bar.position.set(x - 0.75, 1.25, 0.42); bar.rotation.y = 0.5; scene.add(bar);
  });

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: '#3457CC', roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = -0.74; rug.receiveShadow = true; scene.add(rug);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1, DESK_THICK, 1), new THREE.MeshStandardMaterial({ map: oak(), roughness: 0.55 }));
  desk.position.y = -DESK_THICK / 2; desk.castShadow = desk.receiveShadow = true; scene.add(desk);

  const loader = new GLTFLoader(), pieces = [];
  await Promise.all(GEAR.map(async (item) => {
    const model = (await loader.loadAsync(item.file)).scene, box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    const scale = item.width / Math.max(size.x, size.z);
    model.scale.setScalar(scale); model.position.set(-(box.min.x + size.x / 2) * scale, -box.min.y * scale, -(box.min.z + size.z / 2) * scale);
    model.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    const group = new THREE.Group(); group.add(model); group.rotation.y = item.turn; group.userData = item; scene.add(group);
    pieces.push({ item, group, reach: Math.max(size.x, size.z) * scale, drop: 0, home: new THREE.Vector3() });
  }));

  let w = 0, d = 0, held = null, shown = false, last = performance.now();
  const pointer = new THREE.Vector2(), ray = new THREE.Raycaster(), look = new THREE.Vector3(), eye = new THREE.Vector3(), wantLook = new THREE.Vector3(), wantEye = new THREE.Vector3();
  function layout(){
    const size = getDesk(); if (size.w === w && size.d === d) return;
    w = size.w; d = size.d; desk.scale.set(w / 1000, 1, d / 1000);
    pieces.forEach((p) => p.home.fromArray(spot(p.item.id, w / 1000, d / 1000)));
  }
  function resize(){
    const W = view.clientWidth, H = view.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H;
    // keep the desk clear of the words: to the right on wide screens, lower on tall ones
    if (W > 820) camera.setViewOffset(W, H, -W * 0.17, 0, W, H); else camera.setViewOffset(W, H, 0, -H * 0.17, W, H);
    camera.updateProjectionMatrix();
  }
  // Camera stop k: 0 is the whole desk, 1 to 4 fly low over one piece each.
  function stop(k, outLook, outEye){
    const wide = camera.aspect > 1, span = Math.max(w / 1000 / (wide ? 1 : 0.55), d / 1000 * 1.9);
    if (k === 0) { outLook.set(0, 0, 0); outEye.set(0, span * 1.55, span * 0.62); return; }
    const p = pieces.find((x) => x.item.beat === k), r = Math.max(0.2, p.reach) * (wide ? 1.7 : 2.6);
    outLook.copy(p.home); outEye.set(p.home.x, r * 1.25, p.home.z + r * 0.85);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e = new THREE.Vector3();
  function frame(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    layout();
    const box = section.getBoundingClientRect(), range = box.height - view.offsetHeight;
    const u = Math.min(1, Math.max(0, -box.top / Math.max(1, range))) * BEATS;
    // the camera rests on each beat and flies between them, rising a little on the way
    const t = Math.min(BEATS - 1, Math.max(0, u - 0.5)), k = Math.min(BEATS - 2, Math.floor(t)), f = t - k, s = f * f * (3 - 2 * f);
    stop(k, a, b); stop(k + 1, c, e);
    wantLook.lerpVectors(a, c, s); wantEye.lerpVectors(b, e, s); wantEye.y += Math.sin(Math.PI * s) * 0.12;
    wantEye.x += pointer.x * 0.04; wantEye.z -= pointer.y * 0.03;
    const ease = shown ? 1 - Math.exp(-4.2 * dt) : 1;
    look.lerp(wantLook, ease); eye.lerp(wantEye, ease); camera.position.copy(eye); camera.lookAt(look);
    pieces.forEach((p) => {
      // each piece comes down as its beat arrives, and lifts off again if you scroll back
      const want = Math.min(1, Math.max(0, (u - (p.item.beat - 0.35)) / 0.5));
      p.drop += (want - p.drop) * (shown ? 1 - Math.exp(-7 * dt) : 1);
      const up = 1 - p.drop, g = p.group;
      g.visible = p.drop > 0.002;
      if (held === p) {
        const front = camera.getWorldDirection(a).multiplyScalar(Math.max(0.35, p.reach * 1.5)).add(camera.position);
        g.position.lerp(front, 1 - Math.exp(-8 * dt));
        g.rotation.set(0.9 + pointer.y * 0.5, p.item.turn + pointer.x * 0.9, 0);
      } else {
        a.set(p.home.x + up * up * 0.25, p.home.y + up * up * 0.9, p.home.z + up * up * 0.5);
        g.position.lerp(a, held ? 1 - Math.exp(-8 * dt) : 1);
        g.rotation.set(up * 0.7, p.item.turn + up * 0.5, up * -0.35);
      }
    });
    renderer.render(scene, camera);
    if (!shown) { shown = true; section.classList.add('three'); }
    if (running) requestAnimationFrame(frame);
  }

  // click a piece to pick it up and turn it; click again, press Escape or scroll to put it back
  function hit(ev){
    const r = canvas.getBoundingClientRect(); pointer.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(pointer, camera);
    const found = ray.intersectObjects(pieces.filter((p) => p.drop > 0.9).map((p) => p.group), true)[0];
    if (!found) return null;
    let o = found.object; while (o && !pieces.some((p) => p.group === o)) o = o.parent;
    return pieces.find((p) => p.group === o);
  }
  view.addEventListener('pointermove', (ev) => { const p = hit(ev); canvas.style.cursor = held || p ? 'pointer' : ''; });
  canvas.addEventListener('click', (ev) => { held = held ? null : hit(ev); section.classList.toggle('holding', !!held); });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && held) { held = null; section.classList.remove('holding'); } });
  addEventListener('scroll', () => { if (held) { held = null; section.classList.remove('holding'); } }, { passive: true });

  let running = false;
  new ResizeObserver(resize).observe(view); resize();
  new IntersectionObserver((entries) => {   // only draw while the scene is on screen
    const on = entries[0].isIntersecting; if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } else if (!on) running = false;
  }).observe(view);
}

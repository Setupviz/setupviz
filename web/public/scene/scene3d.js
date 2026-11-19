// The homepage's opening scene in 3D: a walk along a dark floor past each piece of gear, one
// per scroll step, ending at the desk with all of it set up. Loaded only when the browser can draw it; the drawn
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
const BEATS = 6, STEP = 1.5, DESK_TOP = 0.73, DESK_THICK = 0.03, DESK_Z = -(4 * STEP + 1.3);
// How each piece lies on the floor on the way there: sideways shift and turn, by beat.
const FLOOR = { 1: [0.1, 0.12], 2: [-0.08, 0.3], 3: [0.1, -0.2], 4: [-0.04, 0.7] };

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

// A canvas painted with soft blotches and fine specks. Used twice: as the floor's colour and,
// in greys, as its roughness map, so the light catches the floor unevenly like a real surface.
function mottle(base, blots, specks){
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024, r = 40 + Math.random() * 180, blot = g.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, blots[i % blots.length]); blot.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = blot;
    // paint it again one tile over in each direction, so the texture repeats without a seam
    for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) { g.setTransform(1, 0, 0, 1, dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9000; i++) { g.fillStyle = specks[i % specks.length]; g.fillRect(Math.random() * 1024, Math.random() * 1024, 1 + Math.random(), 1 + Math.random()); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 28); t.anisotropy = 8; return t;
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

const clamp = (x) => Math.min(1, Math.max(0, x));

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const DARK = '#14161B', scene = new THREE.Scene(); scene.background = new THREE.Color(DARK);
  scene.fog = new THREE.Fog(DARK, 2.2, 6.5);   // the way ahead fades into the dark, so each piece is found in turn
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30);

  // One warm lamp with shadows. It travels with the camera, so its shadow map only has to
  // cover the couple of metres in view and stays sharp.
  const sun = new THREE.DirectionalLight('#FFE9CC', 3.4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.004; sun.shadow.radius = 6;
  Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 8 });
  scene.add(sun, sun.target, new THREE.HemisphereLight('#AFC3FF', '#0B0C10', 0.55));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 24), new THREE.MeshStandardMaterial({
    map: mottle('#2E323B', ['rgba(60,66,80,0.16)', 'rgba(8,9,12,0.2)'], ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.07)']),
    roughnessMap: mottle('#B8B8B8', ['rgba(255,255,255,0.25)', 'rgba(60,60,60,0.3)'], ['rgba(255,255,255,0.12)', 'rgba(40,40,40,0.12)']),
  }));
  floor.material.map.colorSpace = THREE.SRGBColorSpace;
  floor.rotation.x = -Math.PI / 2; floor.position.z = -4; floor.receiveShadow = true; scene.add(floor);

  // the desk at the end of the walk: an oak top on four dark legs
  const table = new THREE.Group(); table.position.set(0, DESK_TOP, DESK_Z); scene.add(table);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, DESK_THICK, 1), new THREE.MeshStandardMaterial({ map: oak(), roughness: 0.55 }));
  top.position.y = -DESK_THICK / 2; top.castShadow = top.receiveShadow = true; table.add(top);
  const legs = [0, 1, 2, 3].map(() => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, DESK_TOP - DESK_THICK, 0.05), new THREE.MeshStandardMaterial({ color: '#1A1B1F', roughness: 0.4, metalness: 0.6 }));
    leg.castShadow = true; table.add(leg); return leg;
  });

  // Every model appears twice: once lying on the floor along the way, once on the desk.
  const loader = new GLTFLoader(), pieces = [];
  await Promise.all(GEAR.map(async (item) => {
    const model = (await loader.loadAsync(item.file)).scene, box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    const scale = item.width / Math.max(size.x, size.z), reach = Math.max(size.x, size.z) * scale;
    model.scale.setScalar(scale); model.position.set(-(box.min.x + size.x / 2) * scale, -box.min.y * scale, -(box.min.z + size.z / 2) * scale);
    model.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    const [x, yaw] = FLOOR[item.beat];
    [false, true].forEach((onDesk) => {
      const group = new THREE.Group(); group.add(onDesk ? model.clone() : model); scene.add(group);
      pieces.push({ item, group, reach, onDesk, tall: size.y * scale, drop: onDesk ? 0 : 1, yaw: item.turn + (onDesk ? 0 : yaw), home: new THREE.Vector3(x, 0, -(item.beat - 1) * STEP) });
    });
  }));

  let w = 0, d = 0, held = null, shown = false, running = false, last = performance.now();
  const pointer = new THREE.Vector2(), ray = new THREE.Raycaster(), look = new THREE.Vector3(), eye = new THREE.Vector3(), wantLook = new THREE.Vector3(), wantEye = new THREE.Vector3();
  function layout(){
    const size = getDesk(); if (size.w === w && size.d === d) return;
    w = size.w; d = size.d; const W = w / 1000, D = d / 1000;
    top.scale.set(W, 1, D);
    legs.forEach((leg, i) => leg.position.set((i % 2 ? 1 : -1) * (W / 2 - 0.06), -DESK_TOP / 2 - DESK_THICK / 2, (i < 2 ? 1 : -1) * (D / 2 - 0.06)));
    pieces.filter((p) => p.onDesk).forEach((p) => p.home.fromArray(spot(p.item.id, W, D)).add(table.position));
  }
  function resize(){
    const W = view.clientWidth, H = view.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H;
    // keep the subject clear of the words: to the right on wide screens, lower on tall ones
    if (W > 820) camera.setViewOffset(W, H, -W * 0.16, 0, W, H); else camera.setViewOffset(W, H, 0, -H * 0.16, W, H);
    camera.updateProjectionMatrix();
  }
  // Camera stop k: 0 looks down the path, 1 to 4 fly low over one piece each, 5 is the desk.
  function stop(k, outLook, outEye){
    const wide = camera.aspect > 1;
    if (k === 0) { outLook.set(0, 0.1, -0.4); outEye.set(0, 0.5, 1.7); return; }
    if (k === BEATS - 1) {
      const span = Math.max(w / 1000 / (wide ? 1 : 0.5), d / 1000 * 1.8);
      outLook.set(0, DESK_TOP + 0.12, DESK_Z); outEye.set(0, DESK_TOP + span * 1.0, DESK_Z + span * 1.35); return;
    }
    const p = pieces.find((x) => x.item.beat === k && !x.onDesk), r = Math.max(0.22, p.reach) * (wide ? 1.55 : 2.4);
    outLook.set(p.home.x, p.tall * 0.4, p.home.z); outEye.set(p.home.x, p.tall * 0.4 + r * 0.75, p.home.z + r * 1.15);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e = new THREE.Vector3();
  function frame(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    layout();
    const box = section.getBoundingClientRect(), range = box.height - view.offsetHeight;
    const u = clamp(-box.top / Math.max(1, range)) * BEATS;
    // the camera rests on each beat and glides to the next, rising a little on the way
    const t = Math.min(BEATS - 1, Math.max(0, u - 0.5)), k = Math.min(BEATS - 2, Math.floor(t)), f = t - k, s = f * f * (3 - 2 * f);
    stop(k, a, b); stop(k + 1, c, e);
    wantLook.lerpVectors(a, c, s); wantEye.lerpVectors(b, e, s); wantEye.y += Math.sin(Math.PI * s) * 0.1;
    wantEye.x += pointer.x * 0.05; wantEye.y += pointer.y * 0.02;
    const ease = shown ? 1 - Math.exp(-4.2 * dt) : 1;
    look.lerp(wantLook, ease); eye.lerp(wantEye, ease); camera.position.copy(eye); camera.lookAt(look);
    sun.target.position.copy(look); sun.position.set(look.x - 1.5, look.y + 3, look.z + 1.4);
    pieces.forEach((p, i) => {
      // on the desk, the pieces come down one after another as the last step arrives
      if (p.onDesk) p.drop += (clamp((u - (BEATS - 1.5) - p.item.beat * 0.07) / 0.35) - p.drop) * (shown ? 1 - Math.exp(-7 * dt) : 1);
      const up = 1 - p.drop, g = p.group;
      g.visible = p.drop > 0.002;
      if (held === p) {
        const front = camera.getWorldDirection(a).multiplyScalar(Math.max(0.35, p.reach * 1.5)).add(camera.position);
        g.position.lerp(front, 1 - Math.exp(-8 * dt));
        g.rotation.set(0.9 + pointer.y * 0.5, p.yaw + pointer.x * 0.9, 0);
      } else {
        a.set(p.home.x, p.home.y + up * up * 0.7, p.home.z);
        g.position.lerp(a, shown ? 1 - Math.exp(-8 * dt) : 1);
        g.rotation.set(up * 0.5, p.yaw + up * 0.4, up * -0.25);
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
  const letGo = () => { held = null; section.classList.remove('holding'); };
  view.addEventListener('pointermove', (ev) => { const p = hit(ev); canvas.style.cursor = held || p ? 'pointer' : ''; });
  canvas.addEventListener('click', (ev) => { held = held ? null : hit(ev); section.classList.toggle('holding', !!held); });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && held) letGo(); });
  addEventListener('scroll', () => { if (held) letGo(); }, { passive: true });

  new ResizeObserver(resize).observe(view); resize();
  new IntersectionObserver((entries) => {   // only draw while the scene is on screen
    const on = entries[0].isIntersecting; if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } else if (!on) running = false;
  }).observe(view);
}

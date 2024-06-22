import './css/base.css';
import * as THREE from 'three';
import fragmentShader from './shaders/fragment.glsl';

// Extract "variation" parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
const variation = urlParams.get('var') || 0;

// Add selected class to link based on variation parameter
document.querySelector(`[data-var="${variation}"]`).classList.add('selected');

// Scene setup
const scene = new THREE.Scene();
const vMouse = new THREE.Vector2();
const vMouseDamp = new THREE.Vector2();
const vResolution = new THREE.Vector2();

// Viewport setup (updated on resize)
let w, h = 1;

// Orthographic camera setup
const aspect = w / h;
const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

const onPointerMove = (e) => {
  vMouse.set(e.pageX, e.pageY);
};
document.addEventListener('mousemove', onPointerMove);
document.addEventListener('pointermove', onPointerMove);
document.body.addEventListener('touchmove', function (e) {
  e.preventDefault();
}, { passive: false });

// Plane geometry covering the full viewport
const geo = new THREE.PlaneGeometry(1, 1);  // Scaled to cover full viewport

// Load text texture
const loader = new THREE.TextureLoader();
const textTexture = loader.load('path/to/your/text_texture.png', () => {
  textTexture.minFilter = THREE.LinearFilter;
  textTexture.magFilter = THREE.LinearFilter;
  textTexture.format = THREE.RGBAFormat;
});

// Shader material creation
const mat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    varying vec2 v_texcoord;
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        v_texcoord = uv;
    }`,
  fragmentShader, // Most of the action happening in the fragment
  uniforms: {
    u_mouse: { value: vMouseDamp },
    u_resolution: { value: vResolution },
    u_pixelRatio: { value: 2 },
    u_text: { value: textTexture }
  },
  defines: {
    VAR: variation
  }
});

// Mesh creation
const quad = new THREE.Mesh(geo, mat);
scene.add(quad);

// Camera position and orientation
camera.position.z = 1;  // Set appropriately for orthographic

// Animation loop to render
let time, lastTime = 0;
const update = () => {
  // Calculate delta time
  time = performance.now() * 0.001;
  const dt = time - lastTime;
  lastTime = time;

  // Ease mouse motion with damping
  for (const k in vMouse) {
    if (k === 'x' || k === 'y') vMouseDamp[k] = THREE.MathUtils.damp(vMouseDamp[k], vMouse[k], 8, dt);
  }

  // Render scene
  requestAnimationFrame(update);
  renderer.render(scene, camera);
};
update();

const resize = () => {
  w = window.innerWidth;
  h = window.innerHeight;

  const dpr = Math.min(window.devicePixelRatio, 2);

  renderer.setSize(w, h);
  renderer.setPixelRatio(dpr);

  camera.left = -w / 2;
  camera.right = w / 2;
  camera.top = h / 2;
  camera.bottom = -h / 2;
  camera.updateProjectionMatrix();

  quad.scale.set(w, h, 1);
  vResolution.set(w, h).multiplyScalar(dpr);
  mat.uniforms.u_pixelRatio.value = dpr;
};
resize();

window.addEventListener('resize', resize);

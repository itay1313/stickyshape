import './css/base.css';
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const vMouse = new THREE.Vector2();
const vResolution = new THREE.Vector2();

document.addEventListener('mousemove', (e) => {
  vMouse.set(e.pageX, h - e.pageY);
})

// Viewport setup
let w = window.innerWidth;
let h = window.innerHeight;

// Orthographic camera setup
const aspect = w / h;
const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

// Plane geometry covering the full viewport
const geo = new THREE.PlaneGeometry(1, 1);  // Scaled to cover full viewport

// Shader material
const mat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`
    varying vec2 v_texcoord;
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        v_texcoord = uv;
    }`,
  fragmentShader: /* glsl */`
    varying vec2 v_texcoord;

    uniform vec2 u_mouse;
    uniform vec2 u_resolution;

    /* sdf functions */
    float sdRoundRect(vec2 p, vec2 b, float r) {
      vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
    }
    float sdCircle(in vec2 st, in vec2 center) {
      return length(st - center) * 2.0;
    }

    /* antialiased step function */
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold - afwidth, threshold + afwidth, value);
    }
    /* Signed distance drawing methods */
    float fill(in float x) { return 1.0 - aastep(0.0, x); }
    float fill(float x, float size, float edge) {
        return 1.0 - smoothstep(size - edge, size + edge, x);
    }
    
    float stroke(in float d, in float t) { return (1.0 - aastep(t, abs(d))); }
    float stroke(float x, float size, float w, float edge) {
        float d = smoothstep(size - edge, size + edge, x + w * 0.5) - smoothstep(size - edge, size + edge, x - w * 0.5);
        return clamp(d, 0.0, 1.0);
    }

    void main() {
        vec2 st = v_texcoord;
        vec2 pixel = 1.0 / u_resolution.xy;
        vec2 posMouse = (u_mouse * pixel);

        // sdf Round Rect params
        float size = 1.0;
        float roundness = 0.4;
        float borderSize = 0.05;
        
        // sdf Circle params
        float sdfCircleSize = 0.3;
        float sdfCircleEdge = 0.5;
        float sdfCircle = fill(
            sdCircle(st, posMouse),
            sdfCircleSize,
            sdfCircleEdge
        );
        
        float sdf = sdRoundRect(st, vec2(size), roundness);
        // sdf = fill(sdf);
        sdf = sdfCircle;
        // sdf = stroke(sdf, 0.0, borderSize, 0.0);
        
        vec3 color = vec3(sdf);
        gl_FragColor = vec4(color.rgb, 1.0);
    }`,
  uniforms: {
    u_mouse: { value: vMouse },
    u_resolution: { value: vResolution }
  }
});



// Mesh creation
const quad = new THREE.Mesh(geo, mat);
scene.add(quad);

// Camera position and orientation
camera.position.z = 1;  // Set appropriately for orthographic

// Animation loop to render
const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};
animate();

const resize = () => {
  w = window.innerWidth;
  h = window.innerHeight;

  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);

  camera.left = -w / 2;
  camera.right = w / 2;
  camera.top = h / 2;
  camera.bottom = -h / 2;
  camera.updateProjectionMatrix();

  quad.scale.set(w, h, 1);
  vResolution.set(w, h);
};
resize();

document.addEventListener('resize', resize)

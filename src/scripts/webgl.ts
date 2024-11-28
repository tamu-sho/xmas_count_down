import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import GUI from "lil-gui";
import * as CANNON from "cannon-es";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { vec3 } from "three/webgpu";

/**
 * Debug
 */
// const gui: GUI = new GUI()
// const debugObject: {} = {}

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();
const textureLoader = new THREE.TextureLoader();

const environmentMap = cubeTextureLoader.load([
  "./envMaps/0/px.png",
  "./envMaps/0/nx.png",
  "./envMaps/0/py.png",
  "./envMaps/0/ny.png",
  "./envMaps/0/pz.png",
  "./envMaps/0/nz.png",
]);

/**
 * Base
 */
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Scene
const scene: THREE.Scene = new THREE.Scene();

scene.environment = environmentMap;
// scene.background = environmentMap

// const axesHelper = new THREE.AxesHelper(5)
// scene.add(axesHelper)

/**
 * Cannon World
 */
const world: CANNON.World = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, 0, 0);

// const solver = new CANNON.GSSolver()
// solver.iterations = 20
// solver.tolerance = 0.001
// world.solver = solver

// material
const defaultMaterial: CANNON.Material = new CANNON.Material({
  friction: 0.1,
  restitution: 0.0,
});
const defaultContactMaterial: CANNON.ContactMaterial =
  new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.1,
    restitution: 0.0,
  });
world.defaultContactMaterial = defaultContactMaterial;
world.addContactMaterial(defaultContactMaterial);

/**
 * Camera
 */
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 7.5);
scene.add(camera);

// // Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

/**
 * Mouse Ray
 */
const mouse: THREE.Vector2 = new THREE.Vector2(1, -1);
const ray: THREE.Ray = new THREE.Ray();
ray.origin.set(camera.position.x, camera.position.y, camera.position.z);
ray.direction.set(1, 1, 0);

const plane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

window.addEventListener("mousemove", (e: MouseEvent) => {
  const { clientX, clientY } = e;
  mouse.x = (clientX / sizes.width) * 2 - 1;
  mouse.y = -(clientY / sizes.height) * 2 + 1;
});
window.addEventListener("touchmove", (e: TouchEvent) => {
  const { clientX, clientY } = e.touches[0];
  mouse.x = (clientX / sizes.width) * 2 - 1;
  mouse.y = -(clientY / sizes.height) * 2 + 1;
});
window.addEventListener("touchend", () => {
  mouse.x = 1;
  mouse.y = 1;
});

// ray sphere
const rayMesh: THREE.Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.75, 10, 10),
  new THREE.MeshNormalMaterial({ wireframe: true })
);
rayMesh.position.set(0, 0, 0);
// scene.add(rayMesh)

const rayCannonShape = new CANNON.Sphere(0.75);
const rayCannonBody = new CANNON.Body({
  mass: 100.0,
  position: new CANNON.Vec3(0, 0, 0),
  shape: rayCannonShape,
  material: defaultMaterial,
});
rayCannonBody.linearDamping = 0.85;
world.addBody(rayCannonBody);

/**
 * Model
 */
const gradientTexture: THREE.Texture = textureLoader.load("./gradients/3.jpg");
gradientTexture.minFilter = THREE.NearestFilter;
gradientTexture.magFilter = THREE.NearestFilter;

// Sphere
const modelList: { mesh: THREE.Mesh | THREE.Group; body: CANNON.Body }[] = [];

const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
});

const testMesh: THREE.Mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
testMesh.material;

const createSphere = (
  radius: number,
  position: { x: number; y: number; z: number },
  model: THREE.Group,
  colorNum: number = 0
) => {
  // Three mesh
  const mesh: THREE.Group = model;
  mesh.castShadow = true;
  mesh.scale.set(radius, radius, radius);
  mesh.position.copy(position);
  // mesh.traverse((child : THREE.Mesh | any) => {
  //   if (child.isMesh) {
  //     child.material = new THREE.MeshToonMaterial({
  //       color: new THREE.Color(gradientList[colorNum])
  //     })
  //     child.material.gradientMap = gradientTexture
  //   }
  // })
  scene.add(mesh);

  // Cannon body
  const shape: CANNON.Sphere = new CANNON.Sphere(radius);
  const body: CANNON.Body = new CANNON.Body({
    mass: 1,
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position as CANNON.Vec3);
  body.angularDamping = 0.01;
  body.linearDamping = 0.85;
  world.addBody(body);

  modelList.push({ mesh, body });
};

// model loader
const gltfModelsPath: string[] = [
  "./models/gltf/ornament_gold.gltf",
  "./models/gltf/ornament_red.gltf",
  "./models/gltf/ornament_green.gltf",
];
let models: GLTF[] = [];

const gradientList: THREE.ColorRepresentation[] = [
  0xcfa242, 0x009902, 0xe70600,
];

// Real version
(async () => {
  for (const element of gltfModelsPath) {
    const gltf = await gltfLoader.loadAsync(element);
    models.push(gltf);
  }
})().then(() => {
  const modelNum: number = 20;
  for (let i = 0; i < modelNum; i++) {
    const vec = i % 2 == 0 ? 1 : -1;
    const x = (i * 2.5 * Math.random() + 1.0) * vec;
    const y = (i * 2.5 * Math.random() + 1.0) * vec;
    const z = (i * 2.5 * Math.random() + 1.0) * vec;

    const modelNum = i % gltfModelsPath.length;

    createSphere(
      0.45 + Math.random() * 0.25,
      { x: x, y: y, z: z },
      models[modelNum].scene.clone()
    );
  }
});

// // Toon version
// (async () => {
//   const model = await gltfLoader.loadAsync('./models/gltf/ornament_origin.gltf')
//   return model.scene

// })().then((model : THREE.Group) => {
//   const modelNum: number = 20
//   for (let i = 0; i < modelNum; i++) {
//     const vec = i % 2 == 0 ? 1 : -1
//     const x = (i * 2.5 * Math.random() + 1.0) * vec
//     const y = (i * 2.5 * Math.random() + 1.0) * vec
//     const z = (i * 2.5 * Math.random() + 1.0) * vec

//     const colorNum = i % gradientList.length

//     createSphere(0.45 + Math.random() * 0.25, {x: x, y: y, z: z}, model.clone(), colorNum)
//   }
// })

/**
 * Lights
 */
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const directionLight: THREE.DirectionalLight = new THREE.DirectionalLight(
  0xffffff,
  1.5
);
directionLight.castShadow = false;
directionLight.shadow.mapSize.set(1024, 1024);
directionLight.shadow.camera.far = 15;
directionLight.shadow.camera.left = -7;
directionLight.shadow.camera.top = 7;
directionLight.shadow.camera.right = 7;
directionLight.shadow.camera.bottom = -7;
directionLight.position.set(5, 5, 5);
scene.add(directionLight);

/**
 * Renderer
 */
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x00ffffff, 0);

/**
 * Center Gravity
 */
const applyGravityToCenter = (body: CANNON.Body) => {
  const direction = body.position.clone();
  const distance = direction.length();

  const negtiveForce = new THREE.Vector3()
    .copy(direction)
    .normalize()
    .multiply(new CANNON.Vec3(-1 * distance, -2 * distance, -5 * distance));
  body.applyForce(
    new CANNON.Vec3(negtiveForce.x, negtiveForce.y, negtiveForce.z),
    new CANNON.Vec3(-Math.min(distance * 0.0001, 0.001))
  );
};

/**
 * Animation
 */
const clock: THREE.Clock = new THREE.Clock();
let oldElapsedTime: number = 0;

const tick = () => {
  const elapsedTime: number = clock.getElapsedTime();
  const deltaTime: number = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update Models
  world.step(1 / 60, deltaTime);

  // Update Ray sphere
  ray.direction
    .set(mouse.x, mouse.y, 0)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  const intersection: THREE.Vector3 = new THREE.Vector3(0);
  ray.intersectPlane(plane, intersection);
  rayCannonBody.position.copy(
    new CANNON.Vec3(intersection.x, intersection.y, intersection.z)
  );
  rayMesh.position.copy(intersection);

  // Update model
  modelList.forEach((object) => {
    applyGravityToCenter(object.body);
    object.mesh.position.copy(object.body.position);
    object.mesh.quaternion.copy(object.body.quaternion);
  });

  // // Update Controls
  // controls.update()

  // Render
  renderer.render(scene, camera);

  // Animation
  window.requestAnimationFrame(tick);
};

tick();

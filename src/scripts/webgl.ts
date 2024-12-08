import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import GUI from "lil-gui";
import * as CANNON from "cannon-es";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { NodeMaterial, vec3 } from "three/webgpu";
import { deflate } from "three/examples/jsm/libs/fflate.module.js";

export default class Webgl {
  gltfLoader = new GLTFLoader();
  cubeTextureLoader = new THREE.CubeTextureLoader();
  textureLoader = new THREE.TextureLoader();

  sizes: { width: number; height: number };
  environmentMap: THREE.CubeTexture;
  models: GLTF[];
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  world: CANNON.World;
  defaultMaterial: CANNON.Material;
  camera: THREE.PerspectiveCamera;

  mouse: THREE.Vector2;
  ray: THREE.Ray;
  rayMesh: THREE.Mesh;
  plane: THREE.Plane;
  rayCannonBody: CANNON.Body;
  ambientLight: THREE.AmbientLight;
  directionLight: THREE.DirectionalLight;

  renderer: THREE.WebGLRenderer;

  clock: THREE.Clock;
  oldElapsedTime: number;

  modelList: { mesh: THREE.Group; body: CANNON.Body }[];

  constructor() {
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Canvas
    this.canvas = document.querySelector("canvas") as HTMLCanvasElement;

    // Scene
    this.scene = new THREE.Scene();

    // Cannon World
    const { world, defaultMaterial } = this.createCannonWorld();
    this.world = world;
    this.defaultMaterial = defaultMaterial;

    // Camera
    this.camera = this.createCamera();
    this.scene.add(this.camera);

    // Mouse Ray
    const { mouse, ray, plane, rayMesh, rayCannonBody } = this.setMouseRay();
    this.mouse = mouse;
    this.ray = ray;
    this.plane = plane;
    this.rayMesh = rayMesh;
    this.rayCannonBody = rayCannonBody;

    this.world.addBody(this.rayCannonBody);

    // Light
    const { ambientLight, directionLight } = this.createLight();
    this.ambientLight = ambientLight;
    this.directionLight = directionLight;
    this.scene.add(this.ambientLight);
    this.scene.add(this.directionLight);

    // Renderer
    this.renderer = this.setRenderer(this.canvas, this.sizes);

    // Tick
    this.clock = new THREE.Clock();
    this.oldElapsedTime = 0;
    this.tick();

    // イベントリスナー
    window.addEventListener("resize", this.resize);
    window.addEventListener("mousemove", (e: MouseEvent) => this.mouseMove(e));
    window.addEventListener("touchmove", (e: TouchEvent) => this.touchmove(e));
    window.addEventListener("touchend", () => this.touchEnd());
  }

  static async init(): Promise<Webgl> {
    const webgl = new Webgl();

    await webgl.load();

    // 環境マップ
    webgl.scene.environment = webgl.environmentMap;

    // モデル
    webgl.modelList = webgl.setModels();

    return webgl;
  }

  debug = () => {
    const gui: GUI = new GUI();
    const debugObject: {} = {};
  };

  load = async () => {
    const environmentMap = await this.cubeTextureLoader.loadAsync([
      "./envMaps/0/px.png",
      "./envMaps/0/nx.png",
      "./envMaps/0/py.png",
      "./envMaps/0/ny.png",
      "./envMaps/0/pz.png",
      "./envMaps/0/nz.png",
    ]);

    this.environmentMap = environmentMap;

    // model loader
    const gltfModelsPath: string[] = [
      "./models/gltf/ornament_gold.gltf",
      "./models/gltf/ornament_red.gltf",
      "./models/gltf/ornament_green.gltf",
    ];
    let models: GLTF[] = [];
    for (const element of gltfModelsPath) {
      const gltf = await this.gltfLoader.loadAsync(element);
      models.push(gltf);
    }
    this.models = models;
  };

  createCannonWorld = (): {
    world: CANNON.World;
    defaultMaterial: CANNON.Material;
  } => {
    const world: CANNON.World = new CANNON.World();
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.gravity.set(0, 0, 0);

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

    return {
      world,
      defaultMaterial,
    };
  };

  createCamera = (): THREE.PerspectiveCamera => {
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    return camera;
  };

  setMouseRay = () => {
    const mouse: THREE.Vector2 = new THREE.Vector2(1, -1);
    const ray: THREE.Ray = new THREE.Ray();
    ray.origin.set(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z
    );
    ray.direction.set(1, 1, 0);

    const plane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    // ray sphere
    const rayMesh: THREE.Mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 10, 10),
      new THREE.MeshNormalMaterial({ wireframe: true })
    );
    rayMesh.position.set(0, 0, 0);

    const rayCannonShape = new CANNON.Sphere(0.75);
    const rayCannonBody = new CANNON.Body({
      mass: 100.0,
      position: new CANNON.Vec3(0, 0, 0),
      shape: rayCannonShape,
      material: this.defaultMaterial,
    });
    rayCannonBody.linearDamping = 0.85;

    return {
      mouse,
      ray,
      plane,
      rayMesh,
      rayCannonBody,
    };
  };

  setModels = (): { mesh: THREE.Group; body: CANNON.Body }[] => {
    const modelList: { mesh: THREE.Group; body: CANNON.Body }[] = [];
    const modelNum: number = 20;
    for (let i = 0; i < modelNum; i++) {
      const vec = i % 2 == 0 ? 1 : -1;
      const x = (i * 2.5 * Math.random() + 1.0) * vec;
      const y = (i * 2.5 * Math.random() + 1.0) * vec;
      const z = (i * 2.5 * Math.random() + 1.0) * vec;

      const modelNum = i % this.models.length;

      const { mesh, body } = this.createSphere(
        0.45 + Math.random() * 0.25,
        { x: x, y: y, z: z },
        this.models[modelNum].scene.clone()
      );
      this.scene.add(mesh);
      this.world.addBody(body);
      modelList.push({ mesh, body });
    }

    return modelList;
  };

  createSphere = (
    radius: number,
    position: { x: number; y: number; z: number },
    model: THREE.Group,
    colorNum: number = 0
  ): { mesh: THREE.Group; body: CANNON.Body } => {
    // Three mesh
    const mesh: THREE.Group = model;
    mesh.castShadow = true;
    mesh.scale.set(radius, radius, radius);
    mesh.position.copy(position);

    // Cannon body
    const shape: CANNON.Sphere = new CANNON.Sphere(radius);
    const body: CANNON.Body = new CANNON.Body({
      mass: 1,
      shape: shape,
      material: this.defaultMaterial,
    });
    body.position.copy(position as CANNON.Vec3);
    body.angularDamping = 0.01;
    body.linearDamping = 0.85;

    return {
      mesh,
      body,
    };
  };

  createLight = (): {
    ambientLight: THREE.AmbientLight;
    directionLight: THREE.DirectionalLight;
  } => {
    const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(
      0xffffff,
      2.0
    );

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

    return {
      ambientLight,
      directionLight,
    };
  };

  setRenderer = (
    canvas: HTMLCanvasElement,
    sizes: { width: number; height: number }
  ): THREE.WebGLRenderer => {
    const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x00ffffff, 0);

    return renderer;
  };

  applyGravityToCenter = (body: CANNON.Body) => {
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

  tick = () => {
    const elapsedTime: number = this.clock.getElapsedTime();
    const deltaTime: number = elapsedTime - this.oldElapsedTime;
    this.oldElapsedTime = elapsedTime;

    // Update Models
    this.world.step(1 / 60, deltaTime);

    // Update Ray sphere
    this.ray.direction
      .set(this.mouse.x, this.mouse.y, 0)
      .unproject(this.camera)
      .sub(this.camera.position)
      .normalize();
    const intersection: THREE.Vector3 = new THREE.Vector3(0);
    this.ray.intersectPlane(this.plane, intersection);
    this.rayCannonBody.position.copy(
      new CANNON.Vec3(intersection.x, intersection.y, intersection.z)
    );
    this.rayMesh.position.copy(intersection);

    // Update model
    if (this.modelList) {
      this.modelList.forEach((object) => {
        this.applyGravityToCenter(object.body);
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion);
      });
    }

    // // Update Controls
    // controls.update()

    // Render
    this.renderer.render(this.scene, this.camera);

    // Animation
    window.requestAnimationFrame(this.tick);
  };

  mouseMove = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    this.mouse.x = (clientX / this.sizes.width) * 2 - 1;
    this.mouse.y = -(clientY / this.sizes.height) * 2 + 1;
  };

  touchmove = (e: TouchEvent) => {
    const { clientX, clientY } = e.touches[0];
    this.mouse.x = (clientX / this.sizes.width) * 2 - 1;
    this.mouse.y = -(clientY / this.sizes.height) * 2 + 1;
  };

  touchEnd = () => {
    this.mouse.x = 1;
    this.mouse.y = 1;
  };

  resize = () => {
    // Update sizes
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    // Update camera
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
}

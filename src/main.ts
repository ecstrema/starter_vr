import "./style.css";

import * as THREE from "three";

import { BoxLineGeometry } from "three/examples/jsm/geometries/BoxLineGeometry";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
let controller1: THREE.Group, controller2: THREE.Group;
let controllerGrip1: THREE.Group, controllerGrip2: THREE.Group;

let room: THREE.LineSegments;

let count = 0;
const radius = 0.08;
let normal = new THREE.Vector3();
const relativeVelocity = new THREE.Vector3();

const clock = new THREE.Clock();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
  camera.position.set(0, 1.6, 3);

  room = new THREE.LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10),
    new THREE.LineBasicMaterial({ color: 0x808080 }),
  );
  room.geometry.translate(0, 3, 0);
  scene.add(room);

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

  const light = new THREE.DirectionalLight(0xFFFFFF);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new THREE.IcosahedronGeometry(radius, 3);

  for (let i = 0; i < 200; i++) {
    const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x0000FF }));

    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 4;
    object.position.z = Math.random() * 4 - 2;

    object.userData.velocity = new THREE.Vector3();
    object.userData.velocity.x = Math.random() * 0.01 - 0.005;
    object.userData.velocity.y = Math.random() * 0.01 - 0.005;
    object.userData.velocity.z = Math.random() * 0.01 - 0.005;

    room.add(object);
  }

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSelectStart(this: THREE.Group) {
    this.userData.isSelecting = true;
  }

  function onSelectEnd(this: THREE.Group) {
    this.userData.isSelecting = false;
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("connected", function (this: THREE.Group, event) {
    this.add(buildController(event.data.targetRayMode));
  });
  controller1.addEventListener("disconnected", function (this: THREE.Group) {
    this.remove(this.children[0]);
  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("connected", function (this: THREE.Group, event) {
    this.add(buildController(event.data.targetRayMode));
  });
  controller2.addEventListener("disconnected", function (this: THREE.Group) {
    this.remove(this.children[0]);
  });
  scene.add(controller2);

  // The XRControllerModelFactory will automatically fetch controller models
  // that match what the user is holding as closely as possible. The models
  // should be attached to the object returned from getControllerGrip in
  // order to match the orientation of the held device.

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);

  //

  window.addEventListener("resize", onWindowResize);
}

function buildController(targetRayMode: "tracked-pointer" | "gaze") {
  let geometry, material;

  switch (targetRayMode) {
    case "tracked-pointer":
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

      material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

      return new THREE.Line(geometry, material);

    case "gaze":
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
      return new THREE.Mesh(geometry, material);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleController(controller: THREE.Group) {
  if (controller.userData.isSelecting) {
    const object = room.children[count++];

    object.position.copy(controller.position);
    object.userData.velocity.x = (Math.random() - 0.5) * 3;
    object.userData.velocity.y = (Math.random() - 0.5) * 3;
    object.userData.velocity.z = (Math.random() - 9);
    object.userData.velocity.applyQuaternion(controller.quaternion);

    if (count === room.children.length)
      count = 0;
  }
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  handleController(controller1);
  handleController(controller2);

  //

  const delta = clock.getDelta() * 0.8; // slow down simulation

  const range = 3 - radius;

  for (let i = 0; i < room.children.length; i++) {
    const object = room.children[i];

    object.position.x += object.userData.velocity.x * delta;
    object.position.y += object.userData.velocity.y * delta;
    object.position.z += object.userData.velocity.z * delta;

    // keep objects inside room

    if (object.position.x < -range || object.position.x > range) {
      object.position.x = THREE.MathUtils.clamp(object.position.x, -range, range);
      object.userData.velocity.x = -object.userData.velocity.x;
    }

    if (object.position.y < radius || object.position.y > 6) {
      object.position.y = Math.max(object.position.y, radius);

      object.userData.velocity.x *= 0.98;
      object.userData.velocity.y = -object.userData.velocity.y * 0.8;
      object.userData.velocity.z *= 0.98;
    }

    if (object.position.z < -range || object.position.z > range) {
      object.position.z = THREE.MathUtils.clamp(object.position.z, -range, range);
      object.userData.velocity.z = -object.userData.velocity.z;
    }

    for (let j = i + 1; j < room.children.length; j++) {
      const object2 = room.children[j];

      normal.copy(object.position).sub(object2.position);

      const distance = normal.length();

      if (distance < 2 * radius) {
        normal.multiplyScalar(0.5 * distance - radius);

        object.position.sub(normal);
        object2.position.add(normal);

        normal.normalize();

        relativeVelocity.copy(object.userData.velocity).sub(object2.userData.velocity);

        normal = normal.multiplyScalar(relativeVelocity.dot(normal));

        object.userData.velocity.sub(normal);
        object2.userData.velocity.add(normal);
      }
    }

    object.userData.velocity.y -= 9.8 * delta;
  }

  renderer.render(scene, camera);
}

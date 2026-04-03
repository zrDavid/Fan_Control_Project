import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 1. GLOBAL VARIABLES (Declared here so the whole script sees them)
let sensorModel; 
let time = 0;
const label = document.getElementById('temp-label');
let fanBlades;
let isRunning = false;  // To make Fan Off by default.

// 2. SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//window.camera = camera; // Expose to console

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.GridHelper(10, 10, 0x555555, 0x333333));

// 3. LIGHTING (Cranked up to ensure Blender models aren't black)
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Adding more lights to improve colors which were dark
// Fill Light: Softer source from Top-Left-Front
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 5, 5);
scene.add(fillLight);

// Back Light: Highlights the edges from behind
const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
backLight.position.set(0, 5, -5);
scene.add(backLight);

// 4. THE LOADER
const loader = new GLTFLoader();
console.log("Starting loader...");

loader.load('/blades_4.glb', (gltf) => {
    sensorModel = gltf.scene;
    // getting only the blades
    fanBlades = sensorModel.getObjectByName('BladeCore');

    sensorModel.position.set(0, 0.75, 0);
    sensorModel.scale.set(0.5, 0.5, 0.5); // Reset scale
    scene.add(sensorModel);
    console.log("SUCCESS: Model loaded and added to scene!");
}, undefined, (error) => {
    console.error("LOADER ERROR: Check if file is in /public folder", error);
});

camera.position.set(5, 5, 5);

// 5. ANIMATION LOOP

// This section was updated so that the temperature always sits on top of fan 
// even when the fan loads for the first time. This was the bug I had. The fan was already 
// running and stopping manually but initially, the temperature label
// was on top left corner of page, just above the button.
// function animate() {
//     requestAnimationFrame(animate);
    
//     // Move this OUTSIDE the 'if' so the mouse always works
//     controls.update(); 

//     //if (sensorModel) {
//     if (fanBlades && isRunning) {
//         time += 0.05;
//         //sensorModel.rotation.z -= 0.05; // +=0.05 for CCW rotation
//         fanBlades.rotation.y -= 0.05; // +=0.05 for CCW rotation

//         // Label Glue
//         const vector = new THREE.Vector3();
//         sensorModel.getWorldPosition(vector);
//         vector.y += 1.2; 
//         vector.project(camera);

//         const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
//         const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

//         if (label) {
//             label.style.left = `${x}px`;
//             label.style.top = `${y - 240}px`;
//             label.innerText = `TEMP: ${(23 + Math.sin(time)).toFixed(1)}°C`;
//         }
//     }

//     renderer.render(scene, camera);
// }

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (sensorModel && label) {
        // 1. ALWAYS CALC POSITION (The "Glue")
        const vector = new THREE.Vector3();
        sensorModel.getWorldPosition(vector);
        vector.y += 1.2; 
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

        label.style.left = `${x}px`;
        label.style.top = `${y - 240}px`;

        // 2. CONDITIONAL LOGIC (The "Data")
        if (fanBlades && isRunning) {
            time += 0.05;
            fanBlades.rotation.y -= 0.05; 
            label.innerText = `TEMP: ${(23 + Math.sin(time)).toFixed(1)}°C`;
        } else {
            label.innerText = `TEMP: --.---°C`;
        }
    }

    renderer.render(scene, camera);
}

// Start the loop
animate();

// 8. INTERACTION LOGIC
const alarmBtn = document.getElementById('alarmBtn');

alarmBtn.addEventListener('click', () => {
    // 1. Safety check: Exit if the model hasn't loaded yet
    if (!sensorModel) {
        console.log("Model not loaded yet...");
        return;
    }

    // 2. Check current state (Are we turning it RED or GREEN?)
    let turningRed = true;
    fanBlades.traverse((child) => {
        if (child.isMesh && child.material) {
            // If we find any part that is already RED, we know we are RESETTING
            if (child.material.color.getHex() === 0xff0000) {
                turningRed = false;
            }
        }
    });

    // 3. Apply the color to ALL parts
    fanBlades.traverse((child) => {
        if (child.isMesh && child.material) {

            // This line rotates the blades only
            // This is to separate "Shared materials" from Blender.
            child.material = child.material.clone(); 
            // ---------------------

            if (turningRed) {
                isRunning = false;
                child.material.color.set(0xff0000); // Alarm Red
                alarmBtn.innerText = "START FAN";
            } else {
                isRunning = true;
                child.material.color.set(0x82f9b6); // Back to Green
                alarmBtn.innerText = "STOP FAN";
            }
        }
    });
});
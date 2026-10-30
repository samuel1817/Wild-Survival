
import * as THREE from "three";

// ======================================
// WILD SURVIVAL - GAME ENGINE
// ======================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 35, 100);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    150
);

const renderer = new THREE.WebGLRenderer({
    antialias: false
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ======================================
// LIGHTING
// ======================================

const sunlight = new THREE.DirectionalLight(0xfff1cf, 2.2);
sunlight.position.set(30, 50, 20);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -45;
sunlight.shadow.camera.right = 45;
sunlight.shadow.camera.top = 45;
sunlight.shadow.camera.bottom = -45;
scene.add(sunlight);

scene.add(new THREE.AmbientLight(0xffffff, 1.0));

const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe7a0 })
);
sun.position.set(35, 35, -70);
scene.add(sun);

// ======================================
// MATERIALS
// ======================================

const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x65a843 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x79502e }),
    stone: new THREE.MeshStandardMaterial({ color: 0x888888 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x704020 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x28783a }),
    leavesLight: new THREE.MeshStandardMaterial({ color: 0x408c39 }),
    block: new THREE.MeshStandardMaterial({ color: 0x69a84a })
};

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

// ======================================
// TERRAIN
// ======================================

const WORLD_SIZE = 40;
const terrainObjects = [];

function terrainHeight(x, z) {
    return Math.floor(
        1.5 +
        Math.sin(x * 0.22) * 1.2 +
        Math.cos(z * 0.19) * 1.1 +
        Math.sin((x + z) * 0.12) * 0.8
    );
}

const grassInstances = [];
const dirtInstances = [];

for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x++) {
    for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z++) {
        const h = terrainHeight(x, z);

        grassInstances.push({ x, y: h - 0.5, z });

        for (let y = 1; y < h; y++) {
            dirtInstances.push({ x, y: y - 0.5, z });
        }
    }
}

function createInstances(list, material, name) {
    const mesh = new THREE.InstancedMesh(
        cubeGeometry,
        material,
        list.length
    );

    const dummy = new THREE.Object3D();

    list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.userData.kind = name;
    scene.add(mesh);
    terrainObjects.push(mesh);

    return mesh;
}

const grassMesh = createInstances(grassInstances, materials.grass, "grass");
createInstances(dirtInstances, materials.dirt, "dirt");

// ======================================
// NATURE
// ======================================

const resourceObjects = [];

function addCube(group, x, y, z, material, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(cubeGeometry, material);

    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);
    return mesh;
}

function createTree(x, z) {
    const group = new THREE.Group();
    const h = terrainHeight(x, z);

    addCube(group, x, h + 1, z, materials.wood, 0.65, 2, 0.65);

    addCube(group, x, h + 2.5, z, materials.leaves, 2.5, 1.5, 2.5);
    addCube(group, x, h + 3.5, z, materials.leavesLight, 1.8, 1.5, 1.8);
    addCube(group, x, h + 4.3, z, materials.leaves, 1.1, 1.1, 1.1);

    group.userData = {
        type: "tree",
        resource: "wood",
        amount: 3
    };

    scene.add(group);
    resourceObjects.push(group);
}

function createRock(x, z) {
    const group = new THREE.Group();
    const h = terrainHeight(x, z);

    addCube(group, x, h + 0.5, z, materials.stone, 1.4, 1, 1.2);
    addCube(group, x + 0.35, h + 1.1, z, materials.stone, 0.8, 0.8, 0.8);
    addCube(group, x - 0.3, h + 1.05, z + 0.3, materials.stone, 0.7, 0.7, 0.7);

    group.userData = {
        type: "rock",
        resource: "stone",
        amount: 2
    };

    scene.add(group);
    resourceObjects.push(group);
}

// Deterministic world generation
let seed = 12345;

function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

for (let i = 0; i < 95; i++) {
    const x = Math.floor(random() * 34 - 17);
    const z = Math.floor(random() * 34 - 17);

    // Keep starting area clear
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

    if (random() > 0.25) {
        createTree(x, z);
    } else {
        createRock(x, z);
    }
}

// ======================================
// PLAYER
// ======================================

const player = {
    position: new THREE.Vector3(0, terrainHeight(0, 0) + 1.7, 0),
    velocityY: 0,
    yaw: 0,
    pitch: 0,
    speed: 6,
    health: 100,
    hunger: 100,
    grounded: false
};

camera.position.copy(player.position);
camera.rotation.order = "YXZ";

let gameStarted = false;
let paused = false;
let inventoryOpen = false;

const keys = {};

document.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "Space") e.preventDefault();

    if (e.code === "KeyE" && gameStarted) {
        toggleInventory();
    }

    if (e.code === "Escape" && gameStarted) {
        if (inventoryOpen) {
            toggleInventory();
        } else if (!document.pointerLockElement) {
            showPause();
        }
    }

    if (e.code.startsWith("Digit")) {
        const number = Number(e.code.slice(5));
        if (number >= 1 && number <= 4) selectSlot(number);
    }
});

document.addEventListener("keyup", e => {
    keys[e.code] = false;
});

// ======================================
// MOUSE CAMERA
// ======================================

document.addEventListener("mousemove", e => {
    if (!gameStarted || paused || inventoryOpen) return;
    if (document.pointerLockElement !== renderer.domElement) return;

    player.yaw -= e.movementX * 0.002;
    player.pitch -= e.movementY * 0.002;

    player.pitch = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, player.pitch)
    );

    camera.rotation.set(player.pitch, player.yaw, 0);
});

renderer.domElement.addEventListener("click", () => {
    if (gameStarted && !paused && !inventoryOpen &&
        document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// ======================================
// INVENTORY
// ======================================

const inventory = {
    wood: 0,
    stone: 0,
    blocks: 8
};

let selectedSlot = 1;

function updateInventory() {
    document.getElementById("wood-count").textContent = inventory.wood;
    document.getElementById("stone-count").textContent = inventory.stone;
    document.getElementById("block-count").textContent = inventory.blocks;
}

function selectSlot(number) {
    selectedSlot = number;

    document.querySelectorAll(".hotbar-slot").forEach(slot => {
        slot.classList.toggle(
            "selected",
            Number(slot.dataset.slot) === number
        );
    });
}

function toggleInventory() {
    inventoryOpen = !inventoryOpen;

    document.getElementById("inventory").style.display =
        inventoryOpen ? "block" : "none";

    if (inventoryOpen) {
        document.exitPointerLock?.();
    } else {
        renderer.domElement.requestPointerLock();
    }
}

document.getElementById("close-inventory").addEventListener("click", () => {
    toggleInventory();
});

// ======================================
// MINING
// ======================================

const raycaster = new THREE.Raycaster();
raycaster.far = 5;

let messageTimeout;

function showMessage(text) {
    const el = document.getElementById("message");

    el.textContent = text;
    el.style.opacity = 1;

    clearTimeout(messageTimeout);

    messageTimeout = setTimeout(() => {
        el.style.opacity = 0;
    }, 1800);
}

function mineObject() {
    if (!gameStarted || paused || inventoryOpen) return;

    if (document.pointerLockElement !== renderer.domElement) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const targets = [];

    resourceObjects.forEach(group => {
        group.children.forEach(child => targets.push(child));
    });

    const hits = raycaster.intersectObjects(targets, false);

    if (!hits.length) return;

    const hit = hits[0];
    const group = hit.object.parent;
    const type = group.userData.type;

    if (!type) return;

    if (type === "tree") {
        inventory.wood += group.userData.amount;
        showMessage("🪵 +" + group.userData.amount + " wood");
    } else if (type === "rock") {
        inventory.stone += group.userData.amount;
        showMessage("🪨 +" + group.userData.amount + " stone");
    }

    scene.remove(group);

    const index = resourceObjects.indexOf(group);
    if (index !== -1) resourceObjects.splice(index, 1);

    updateInventory();
}

document.addEventListener("mousedown", e => {
    if (e.button === 0) {
        mineObject();
    }
});

// ======================================
// BUILDING
// ======================================

const placedBlocks = [];

function buildBlock() {
    if (!gameStarted || paused || inventoryOpen) return;

    if (document.pointerLockElement !== renderer.domElement) return;

    if (selectedSlot !== 4) {
        showMessage("Select block slot 4!");
        return;
    }

    if (inventory.blocks <= 0) {
        showMessage("No blocks available!");
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const targets = [...terrainObjects];

    resourceObjects.forEach(group => {
        group.children.forEach(child => targets.push(child));
    });

    placedBlocks.forEach(block => targets.push(block));

    const hits = raycaster.intersectObjects(targets, false);

    if (!hits.length || hits[0].distance > 5) return;

    const hit = hits[0];
    const normal = hit.face.normal.clone();

    const position = hit.object.localToWorld(
        hit.point.clone()
    );

    const block = new THREE.Mesh(cubeGeometry, materials.block);

    block.position.copy(position).add(
        normal.multiplyScalar(0.5)
    );

    block.position.set(
        Math.round(block.position.x),
        Math.round(block.position.y),
        Math.round(block.position.z)
    );

    block.castShadow = true;
    block.receiveShadow = true;

    scene.add(block);
    placedBlocks.push(block);

    inventory.blocks--;
    updateInventory();

    showMessage("🧱 Block placed!");
}

document.addEventListener("mousedown", e => {
    if (e.button === 2) {
        e.preventDefault();
        buildBlock();
    }
});

document.addEventListener("contextmenu", e => e.preventDefault());

// ======================================
// PLAYER MOVEMENT
// ======================================

function movePlayer(delta) {
    if (paused || inventoryOpen ||
        document.pointerLockElement !== renderer.domElement) return;

    const forward = new THREE.Vector3(
        -Math.sin(player.yaw),
        0,
        -Math.cos(player.yaw)
    );

    const right = new THREE.Vector3(
        Math.cos(player.yaw),
        0,
        -Math.sin(player.yaw)
    );

    const direction = new THREE.Vector3();

    if (keys.KeyW) direction.add(forward);
    if (keys.KeyS) direction.sub(forward);
    if (keys.KeyD) direction.add(right);
    if (keys.KeyA) direction.sub(right);

    if (direction.lengthSq() > 0) {
        direction.normalize();

        const speed = keys.ShiftLeft || keys.ShiftRight ? 10 : 6;

        player.position.addScaledVector(
            direction,
            speed * delta
        );
    }

    // Keep player inside world boundaries
    player.position.x = THREE.MathUtils.clamp(
        player.position.x, -19, 19
    );

    player.position.z = THREE.MathUtils.clamp(
        player.position.z, -19, 19
    );

    // Ground collision
    const ground = terrainHeight(
        Math.round(player.position.x),
        Math.round(player.position.z)
    );

    const groundY = ground + 1.7;

    if (keys.Space && player.grounded) {
        player.velocityY = 8;
        player.grounded = false;
    }

    player.velocityY -= 22 * delta;
    player.position.y += player.velocityY * delta;

    if (player.position.y <= groundY) {
        player.position.y = groundY;
        player.velocityY = 0;
        player.grounded = true;
    }

    camera.position.copy(player.position);
}

// ======================================
// HEALTH & HUNGER
// ======================================

let hungerTimer = 0;
let dayTimer = 0;
let day = 1;

function updateStats(delta) {
    hungerTimer += delta;

    if (hungerTimer >= 12) {
        hungerTimer = 0;
        player.hunger = Math.max(0, player.hunger - 1);

        if (player.hunger === 0) {
            player.health = Math.max(0, player.health - 2);
        }

        updateStatsUI();
    }

    if (player.health <= 0) {
        player.health = 100;
        player.hunger = 100;
        inventory.wood = 0;
        inventory.stone = 0;
        inventory.blocks = 8;

        player.position.set(0, terrainHeight(0, 0) + 1.7, 0);

        updateInventory();
        updateStatsUI();
        showMessage("You died! Starting again...");
    }
}

function updateStatsUI() {
    document.getElementById("health-fill").style.width =
        player.health + "%";

    document.getElementById("hunger-fill").style.width =
        player.hunger + "%";
}

// ======================================
// DAY / NIGHT
// ======================================

function updateDay(delta) {
    dayTimer += delta;

    if (dayTimer > 120) {
        dayTimer = 0;
        day++;

        document.getElementById("day").textContent = day;
        showMessage("☀ A new day has begun!");
    }

    const phase = (dayTimer % 120) / 120;
    const daylight = 0.3 + Math.sin(phase * Math.PI) * 0.7;

    sunlight.intensity = daylight * 2.2;
    scene.background.setRGB(
        0.08 + daylight * 0.45,
        0.12 + daylight * 0.55,
        0.18 + daylight * 0.75
    );

    scene.fog.color.copy(scene.background);
    sun.position.set(
        Math.cos(phase * Math.PI * 2) * 40,
        10 + daylight * 40,
        -50
    );
}

// ======================================
// SAVE / LOAD
// ======================================

function saveGame() {
    const data = {
        position: player.position.toArray(),
        health: player.health,
        hunger: player.hunger,
        inventory,
        day,
        dayTimer
    };

    localStorage.setItem("wildSurvivalSave", JSON.stringify(data));
    showMessage("Game saved!");
}

function loadGame() {
    const raw = localStorage.getItem("wildSurvivalSave");

    if (!raw) return;

    try {
        const data = JSON.parse(raw);

        if (Array.isArray(data.position) && data.position.length === 3) {
            player.position.fromArray(data.position);
        }

        player.health = THREE.MathUtils.clamp(data.health ?? 100, 0, 100);
        player.hunger = THREE.MathUtils.clamp(data.hunger ?? 100, 0, 100);

        inventory.wood = Math.max(0, Number(data.inventory?.wood) || 0);
        inventory.stone = Math.max(0, Number(data.inventory?.stone) || 0);
        inventory.blocks = Math.max(0, Number(data.inventory?.blocks) || 0);

        day = Math.max(1, Number(data.day) || 1);
        dayTimer = Number(data.dayTimer) || 0;

        document.getElementById("day").textContent = day;

        updateInventory();
        updateStatsUI();
    } catch (error) {
        console.error("Save file could not be loaded:", error);
    }
}

// ======================================
// START / PAUSE
// ======================================

const startScreen = document.getElementById("start-screen");
const gameUI = document.getElementById("game-ui");
const pauseScreen = document.getElementById("pause-screen");

document.getElementById("start-button").addEventListener("click", () => {
    startScreen.style.display = "none";
    gameUI.style.display = "block";

    loadGame();

    gameStarted = true;
    renderer.domElement.requestPointerLock();
});

function showPause() {
    paused = true;
    pauseScreen.style.display = "flex";
    document.exitPointerLock?.();
}

document.getElementById("resume-button").addEventListener("click", () => {
    paused = false;
    pauseScreen.style.display = "none";
    renderer.domElement.requestPointerLock();
});

document.getElementById("save-button").addEventListener("click", saveGame);

document.getElementById("save-button").addEventListener("click", () => {
    document.getElementById("save-button").textContent = "SAVED!";
});

document.addEventListener("pointerlockchange", () => {
    if (!gameStarted || inventoryOpen) return;

    if (document.pointerLockElement !== renderer.domElement && !paused) {
        showPause();
    }
});

// ======================================
// WINDOW RESIZE
// ======================================

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ======================================
// GAME LOOP
// ======================================

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (gameStarted && !paused && !inventoryOpen) {
        movePlayer(delta);
        updateStats(delta);
        updateDay(delta);
    }

    renderer.render(scene, camera);
}

updateInventory();
updateStatsUI();
animate();

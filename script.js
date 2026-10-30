import * as THREE from "three";

/* =========================================
   WILD SURVIVAL
   Singleplayer voxel survival
========================================= */

const WORLD_SIZE = 48;
const HALF_WORLD = WORLD_SIZE / 2;
const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.75;
const EYE_HEIGHT = 1.62;
const BUILD_REACH = 6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc8e3);
scene.fog = new THREE.Fog(0x9bc8e3, 38, 105);

const camera = new THREE.PerspectiveCamera(
    76,
    innerWidth / innerHeight,
    0.1,
    180
);

camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

document.body.appendChild(renderer.domElement);


/* =========================================
   SVETLO A ATMOSFÉRA
========================================= */

const hemi = new THREE.HemisphereLight(
    0xdaf0ff,
    0x52613c,
    1.45
);

scene.add(hemi);

const sunlight = new THREE.DirectionalLight(
    0xfff0d1,
    2.3
);

sunlight.position.set(-28, 45, 24);
sunlight.castShadow = true;

sunlight.shadow.mapSize.set(2048, 2048);

sunlight.shadow.camera.left = -42;
sunlight.shadow.camera.right = 42;
sunlight.shadow.camera.top = 42;
sunlight.shadow.camera.bottom = -42;

sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 110;
sunlight.shadow.bias = -0.00025;

scene.add(sunlight);
scene.add(sunlight.target);

const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 20, 16),
    new THREE.MeshBasicMaterial({
        color: 0xffe5a0
    })
);

scene.add(sunBall);


/* =========================================
   MATERIÁLY
========================================= */

const mats = {
    grass: new THREE.MeshStandardMaterial({
        color: 0x6f9f45,
        roughness: 1
    }),

    dirt: new THREE.MeshStandardMaterial({
        color: 0x795438,
        roughness: 1
    }),

    stone: new THREE.MeshStandardMaterial({
        color: 0x858b88,
        roughness: 1
    }),

    wood: new THREE.MeshStandardMaterial({
        color: 0x79502f,
        roughness: 1
    }),

    leaves: new THREE.MeshStandardMaterial({
        color: 0x397b3d,
        roughness: 1
    }),

    leaves2: new THREE.MeshStandardMaterial({
        color: 0x559448,
        roughness: 1
    }),

    placed: new THREE.MeshStandardMaterial({
        color: 0x79a94e,
        roughness: 1
    }),

    sand: new THREE.MeshStandardMaterial({
        color: 0xc4ad70,
        roughness: 1
    })
};

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

const terrainMeshes = [];
const resources = [];
const placedBlocks = [];

const removedResourceIds = new Set();

let nextResourceId = 0;


/* =========================================
   GENEROVANIE TERÉNU
========================================= */

function terrainHeight(x, z) {

    return Math.floor(
        2.2 +
        Math.sin(x * 0.16) * 1.35 +
        Math.cos(z * 0.18) * 1.2 +
        Math.sin((x + z) * 0.105) * 0.8 +
        Math.cos((x - z) * 0.07) * 0.45
    );

}

function seededRandom(seed) {

    let value = seed >>> 0;

    return () => {

        value = (
            value * 1664525 + 1013904223
        ) >>> 0;

        return value / 4294967296;

    };

}

const random = seededRandom(73129);


function createTerrainLayer(entries, material, kind) {

    const mesh = new THREE.InstancedMesh(
        cubeGeo,
        material,
        entries.length
    );

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    entries.forEach((p, i) => {

        dummy.position.set(p.x, p.y, p.z);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);

        const variation = 0.88 + random() * 0.22;

        tint.setScalar(variation);

        mesh.setColorAt(i, tint);

    });

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
    }

    mesh.receiveShadow = true;
    mesh.userData.kind = kind;

    scene.add(mesh);
    terrainMeshes.push(mesh);

    return mesh;

}


const grassCells = [];
const dirtCells = [];
const stoneCells = [];

for (
    let x = -HALF_WORLD;
    x < HALF_WORLD;
    x++
) {

    for (
        let z = -HALF_WORLD;
        z < HALF_WORLD;
        z++
    ) {

        const h = terrainHeight(x, z);

        grassCells.push({
            x,
            y: h - 0.5,
            z
        });

        for (let y = 0; y < h - 1; y++) {

            if (y < -1) {

                stoneCells.push({
                    x,
                    y: y + 0.5,
                    z
                });

            } else {

                dirtCells.push({
                    x,
                    y: y + 0.5,
                    z
                });

            }

        }

    }

}

createTerrainLayer(
    grassCells,
    mats.grass,
    "grass"
);

createTerrainLayer(
    dirtCells,
    mats.dirt,
    "dirt"
);

createTerrainLayer(
    stoneCells,
    mats.stone,
    "stone"
);


/* =========================================
   OBLÁKY
========================================= */

const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5ed,
    roughness: 1
});

for (let i = 0; i < 9; i++) {

    const cloud = new THREE.Group();

    const cx = (random() - 0.5) * 100;
    const cz = (random() - 0.5) * 100;

    for (let j = 0; j < 4; j++) {

        const puff = new THREE.Mesh(
            cubeGeo,
            cloudMat
        );

        puff.position.set(
            j * 1.7,
            (j % 2) * 0.35,
            (j % 2) * 0.5
        );

        puff.scale.set(2.8, 0.65, 1.8);

        cloud.add(puff);

    }

    cloud.position.set(
        cx,
        24 + random() * 12,
        cz
    );

    scene.add(cloud);

}


/* =========================================
   STROMY A KAMENE
========================================= */

function addResourceCube(
    group,
    x,
    y,
    z,
    material,
    sx = 1,
    sy = 1,
    sz = 1
) {

    const mesh = new THREE.Mesh(
        cubeGeo,
        material
    );

    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);

    return mesh;

}


function createTree(x, z, id) {

    const h = terrainHeight(x, z);

    const group = new THREE.Group();

    group.position.set(x, 0, z);

    addResourceCube(
        group,
        0,
        h + 1,
        0,
        mats.wood,
        0.62,
        2,
        0.62
    );

    addResourceCube(
        group,
        0,
        h + 2.45,
        0,
        mats.leaves,
        2.8,
        1.65,
        2.8
    );

    addResourceCube(
        group,
        0.12,
        h + 3.45,
        0,
        mats.leaves2,
        2.05,
        1.45,
        2.05
    );

    addResourceCube(
        group,
        -0.08,
        h + 4.25,
        0.08,
        mats.leaves,
        1.25,
        1.15,
        1.25
    );

    group.userData = {
        type: "tree",
        resource: "wood",
        amount: 3,
        id,
        radius: 0.72,
        baseY: h
    };

    scene.add(group);
    resources.push(group);

}


function createRock(x, z, id) {

    const h = terrainHeight(x, z);

    const group = new THREE.Group();

    group.position.set(x, 0, z);

    addResourceCube(
        group,
        0,
        h + 0.48,
        0,
        mats.stone,
        1.45,
        0.96,
        1.25
    );

    addResourceCube(
        group,
        0.35,
        h + 1.03,
        0.08,
        mats.stone,
        0.78,
        0.78,
        0.78
    );

    addResourceCube(
        group,
        -0.32,
        h + 0.98,
        0.27,
        mats.stone,
        0.72,
        0.72,
        0.72
    );

    group.userData = {
        type: "rock",
        resource: "stone",
        amount: 2,
        id,
        radius: 0.88,
        baseY: h
    };

    scene.add(group);
    resources.push(group);

}


let resourceId = 0;

for (let i = 0; i < 115; i++) {

    const x = Math.floor(
        random() * 40 - 20
    );

    const z = Math.floor(
        random() * 40 - 20
    );

    if (
        Math.abs(x) < 4 &&
        Math.abs(z) < 4
    ) continue;

    if (
        resources.some(r =>
            Math.abs(r.position.x - x) < 2 &&
            Math.abs(r.position.z - z) < 2
        )
    ) continue;

    if (random() < 0.76) {

        createTree(x, z, resourceId++);

    } else {

        createRock(x, z, resourceId++);

    }

}

nextResourceId = resourceId;


/* =========================================
   HRÁČ
========================================= */

const player = {

    position: new THREE.Vector3(
        0,
        terrainHeight(0, 0) + EYE_HEIGHT,
        0
    ),

    velocityY: 0,
    yaw: 0,
    pitch: 0,

    health: 100,
    hunger: 100,

    grounded: true,

    speed: 5.8

};

camera.position.copy(player.position);


let gameStarted = false;
let paused = false;
let inventoryOpen = false;

let selectedSlot = 1;

const keys = Object.create(null);

const inventory = {
    wood: 0,
    stone: 0,
    blocks: 8
};


const $ = id => document.getElementById(id);


/* =========================================
   INVENTÁR A UI
========================================= */

function updateInventory() {

    $("wood-count").textContent = inventory.wood;
    $("stone-count").textContent = inventory.stone;
    $("block-count").textContent = inventory.blocks;

}


function updateStatsUI() {

    $("health-fill").style.width =
        `${player.health}%`;

    $("hunger-fill").style.width =
        `${player.hunger}%`;

    $("health-value").textContent =
        Math.ceil(player.health);

    $("hunger-value").textContent =
        Math.ceil(player.hunger);

}


function selectSlot(n) {

    selectedSlot = n;

    document.querySelectorAll(".hotbar-slot")
        .forEach(el => {

            el.classList.toggle(
                "selected",
                Number(el.dataset.slot) === n
            );

        });

}


let messageTimer;

function showMessage(text) {

    const el = $("message");

    el.textContent = text;
    el.style.opacity = "1";

    clearTimeout(messageTimer);

    messageTimer = setTimeout(() => {

        el.style.opacity = "0";

    }, 1900);

}


/* =========================================
   OVLÁDANIE
========================================= */

function toggleInventory() {

    if (!gameStarted || paused) return;

    inventoryOpen = !inventoryOpen;

    $("inventory").style.display =
        inventoryOpen ? "block" : "none";

    if (inventoryOpen) {

        document.exitPointerLock?.();

    } else {

        renderer.domElement.requestPointerLock?.();

    }

}


$("close-inventory").addEventListener(
    "click",
    toggleInventory
);


document.addEventListener("keydown", e => {

    keys[e.code] = true;

    if (
        [
            "Space",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight"
        ].includes(e.code)
    ) {

        e.preventDefault();

    }

    if (e.repeat) return;

    if (
        e.code === "KeyE" &&
        gameStarted
    ) {

        toggleInventory();

    }

    if (
        e.code === "Escape" &&
        gameStarted
    ) {

        if (inventoryOpen) {

            toggleInventory();

        } else if (!paused) {

            showPause();

        } else {

            resumeGame();

        }

    }

    if (e.code.startsWith("Digit")) {

        const n = Number(e.code.slice(5));

        if (n >= 1 && n <= 4) {
            selectSlot(n);
        }

    }

});


document.addEventListener("keyup", e => {

    keys[e.code] = false;

});


window.addEventListener("blur", () => {

    for (const k in keys) {
        keys[k] = false;
    }

});


document.addEventListener("mousemove", e => {

    if (
        !gameStarted ||
        paused ||
        inventoryOpen ||
        document.pointerLockElement !== renderer.domElement
    ) return;

    player.yaw -= e.movementX * 0.0022;

    player.pitch -= e.movementY * 0.0022;

    player.pitch = THREE.MathUtils.clamp(
        player.pitch,
        -Math.PI / 2 + 0.04,
        Math.PI / 2 - 0.04
    );

    camera.rotation.set(
        player.pitch,
        player.yaw,
        0
    );

});


renderer.domElement.addEventListener("click", () => {

    if (
        gameStarted &&
        !paused &&
        !inventoryOpen &&
        document.pointerLockElement !== renderer.domElement
    ) {

        renderer.domElement.requestPointerLock?.();

    }

});


/* =========================================
   ŤAŽENIE
========================================= */

const raycaster = new THREE.Raycaster();

raycaster.far = BUILD_REACH;

const centerScreen = new THREE.Vector2(0, 0);


function allResourceMeshes() {

    const result = [];

    for (const group of resources) {

        for (const child of group.children) {
            result.push(child);
        }

    }

    return result;

}


function allBuildTargets() {

    return [
        ...terrainMeshes,
        ...allResourceMeshes(),
        ...placedBlocks
    ];

}


function mineObject() {

    if (
        !gameStarted ||
        paused ||
        inventoryOpen ||
        document.pointerLockElement !== renderer.domElement
    ) return;

    raycaster.setFromCamera(
        centerScreen,
        camera
    );

    const hits = raycaster.intersectObjects(
        allResourceMeshes(),
        false
    );

    if (
        !hits.length ||
        hits[0].distance > 5.5
    ) return;

    const group = hits[0].object.parent;

    const data = group.userData;

    if (!data?.type) return;

    inventory[data.resource] += data.amount;

    removedResourceIds.add(data.id);

    scene.remove(group);

    const index = resources.indexOf(group);

    if (index !== -1) {
        resources.splice(index, 1);
    }

    updateInventory();

    showMessage(
        data.resource === "wood"
            ? `🪵 +${data.amount} drevo`
            : `🪨 +${data.amount} kameň`
    );

}


/* =========================================
   STAVANIE BLOKOV
========================================= */

function snapBlockPosition(point, normal) {

    const p = point.clone().add(
        normal.clone().multiplyScalar(0.501)
    );

    return new THREE.Vector3(
        Math.round(p.x),
        Math.floor(p.y) + 0.5,
        Math.round(p.z)
    );

}


function blockKey(p) {

    return [
        Math.round(p.x),
        Math.round(p.y * 2) / 2,
        Math.round(p.z)
    ].join(",");

}


function isBlockPositionFree(p) {

    if (
        placedBlocks.some(
            b => b.userData.key === blockKey(p)
        )
    ) return false;

    const terrainTop = terrainHeight(
        Math.round(p.x),
        Math.round(p.z)
    );

    if (p.y < terrainTop + 0.5) {
        return false;
    }

    for (const r of resources) {

        const dx = Math.abs(
            p.x - r.position.x
        );

        const dz = Math.abs(
            p.z - r.position.z
        );

        if (
            dx < r.userData.radius + 0.35 &&
            dz < r.userData.radius + 0.35 &&
            p.y < r.userData.baseY +
                (r.userData.type === "tree" ? 5 : 2.1) &&
            p.y > r.userData.baseY - 0.1
        ) {

            return false;

        }

    }

    const playerFeet =
        player.position.y - EYE_HEIGHT;

    const playerHead =
        playerFeet + PLAYER_HEIGHT;

    if (
        Math.abs(p.x - player.position.x) < 0.8 &&
        Math.abs(p.z - player.position.z) < 0.8 &&
        p.y + 0.5 > playerFeet &&
        p.y - 0.5 < playerHead
    ) {

        return false;

    }

    return true;

}


function buildBlock() {

    if (
        !gameStarted ||
        paused ||
        inventoryOpen ||
        document.pointerLockElement !== renderer.domElement
    ) return;

    if (selectedSlot !== 4) {

        showMessage("Vyber blok v slote 4");

        return;

    }

    if (inventory.blocks <= 0) {

        showMessage("Nemáš žiadne bloky");

        return;

    }

    raycaster.setFromCamera(
        centerScreen,
        camera
    );

    const hits = raycaster.intersectObjects(
        allBuildTargets(),
        false
    );

    const hit = hits.find(
        h => h.distance <= BUILD_REACH
    );

    if (!hit || !hit.face) {

        showMessage("Namier na povrch bloku");

        return;

    }

    const normalMatrix = new THREE.Matrix3()
        .getNormalMatrix(hit.object.matrixWorld);

    const worldNormal = hit.face.normal
        .clone()
        .applyMatrix3(normalMatrix)
        .normalize();

    const pos = snapBlockPosition(
        hit.point,
        worldNormal
    );

    if (!isBlockPositionFree(pos)) {

        showMessage("Na tomto mieste sa nedá stavať");

        return;

    }

    const block = new THREE.Mesh(
        cubeGeo,
        mats.placed
    );

    block.position.copy(pos);

    block.castShadow = true;
    block.receiveShadow = true;

    block.userData.key = blockKey(pos);

    scene.add(block);

    placedBlocks.push(block);

    inventory.blocks--;

    updateInventory();

    showMessage("🧱 Blok postavený!");

}


/* =========================================
   MYŠ
========================================= */

document.addEventListener("mousedown", e => {

    if (e.button === 0) {
        mineObject();
    }

    if (e.button === 2) {

        e.preventDefault();

        buildBlock();

    }

});


document.addEventListener("contextmenu", e => {

    e.preventDefault();

});


/* =========================================
   KOLÍZIE
========================================= */

function collidesAt(x, z, feetY) {

    const minY = feetY + 0.12;

    const maxY =
        feetY + PLAYER_HEIGHT - 0.12;

    // Stromy a kamene
    for (const r of resources) {

        const dx = Math.abs(
            x - r.position.x
        );

        const dz = Math.abs(
            z - r.position.z
        );

        if (
            dx >= r.userData.radius + PLAYER_RADIUS ||
            dz >= r.userData.radius + PLAYER_RADIUS
        ) continue;

        const bottom = r.userData.baseY;

        const top = bottom +
            (r.userData.type === "tree" ? 5.05 : 1.55);

        if (
            maxY > bottom &&
            minY < top
        ) {

            return true;

        }

    }

    // Postavené bloky
    for (const b of placedBlocks) {

        if (
            Math.abs(x - b.position.x) <
                0.5 + PLAYER_RADIUS &&
            Math.abs(z - b.position.z) <
                0.5 + PLAYER_RADIUS &&
            maxY > b.position.y - 0.5 &&
            minY < b.position.y + 0.5
        ) {

            return true;

        }

    }

    return false;

}


/* =========================================
   POHYB A SKÁKANIE
========================================= */

function movePlayer(delta) {

    if (
        paused ||
        inventoryOpen ||
        document.pointerLockElement !== renderer.domElement
    ) return;

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
    }

    const speed =
        (keys.ShiftLeft || keys.ShiftRight)
            ? 9.2
            : player.speed;

    const step = speed * delta;

    const feet =
        player.position.y - EYE_HEIGHT;

    const nextX = THREE.MathUtils.clamp(
        player.position.x + direction.x * step,
        -HALF_WORLD + 0.7,
        HALF_WORLD - 0.7
    );

    if (
        !collidesAt(
            nextX,
            player.position.z,
            feet
        )
    ) {

        player.position.x = nextX;

    }

    const nextZ = THREE.MathUtils.clamp(
        player.position.z + direction.z * step,
        -HALF_WORLD + 0.7,
        HALF_WORLD - 0.7
    );

    if (
        !collidesAt(
            player.position.x,
            nextZ,
            feet
        )
    ) {

        player.position.z = nextZ;

    }

    const ground = terrainHeight(
        Math.round(player.position.x),
        Math.round(player.position.z)
    );

    const groundY = ground + EYE_HEIGHT;

    if (
        keys.Space &&
        player.grounded
    ) {

        player.velocityY = 7.2;
        player.grounded = false;

    }

    player.velocityY -= 21 * delta;

    const nextY =
        player.position.y +
        player.velocityY * delta;

    const nextFeet = nextY - EYE_HEIGHT;

    if (nextY <= groundY) {

        player.position.y = groundY;

        player.velocityY = 0;
        player.grounded = true;

    } else {

        let hitCeiling = false;

        if (player.velocityY > 0) {

            for (const b of placedBlocks) {

                if (
                    Math.abs(player.position.x - b.position.x) <
                        0.5 + PLAYER_RADIUS &&
                    Math.abs(player.position.z - b.position.z) <
                        0.5 + PLAYER_RADIUS &&
                    nextFeet + PLAYER_HEIGHT >
                        b.position.y - 0.5 &&
                    nextFeet + PLAYER_HEIGHT <
                        b.position.y + 0.65
                ) {

                    hitCeiling = true;
                    break;

                }

            }

        }

        if (hitCeiling) {

            player.velocityY = 0;

        } else {

            player.position.y = nextY;

        }

        player.grounded = false;

    }

    camera.position.copy(player.position);

}


/* =========================================
   HLAD A ŽIVOTY
========================================= */

let hungerTimer = 0;

let dayTimer = 0;

let day = 1;


function updateStats(delta) {

    hungerTimer += delta;

    if (hungerTimer >= 14) {

        hungerTimer -= 14;

        player.hunger = Math.max(
            0,
            player.hunger - 1
        );

        if (player.hunger <= 0) {

            player.health = Math.max(
                0,
                player.health - 2
            );

        }

        updateStatsUI();

    }

    if (player.health <= 0) {

        player.health = 100;
        player.hunger = 100;

        player.position.set(
            0,
            terrainHeight(0, 0) + EYE_HEIGHT,
            0
        );

        player.velocityY = 0;

        inventory.wood = 0;
        inventory.stone = 0;
        inventory.blocks = 8;

        updateInventory();
        updateStatsUI();

        showMessage(
            "Zomrel si. Vrátil si sa na začiatok."
        );

    }

}


/* =========================================
   DEŇ A NOC
========================================= */

function updateDay(delta) {

    dayTimer += delta;

    if (dayTimer >= 150) {

        dayTimer -= 150;

        day++;

        $("day").textContent = day;

        showMessage("☀ Začal sa nový deň!");

    }

    const phase =
        (dayTimer / 150) * Math.PI * 2;

    const daylight = THREE.MathUtils.clamp(
        0.16 +
        (Math.sin(phase - Math.PI / 2) + 1) * 0.48,
        0.12,
        1
    );

    sunlight.intensity =
        0.28 + daylight * 2.05;

    hemi.intensity =
        0.38 + daylight * 1.12;

    sunBall.position.set(
        Math.cos(phase) * 42,
        8 + daylight * 42,
        -48
    );

    sunBall.visible = daylight > 0.2;

    const sky = new THREE.Color().setRGB(
        0.025 + daylight * 0.48,
        0.045 + daylight * 0.62,
        0.09 + daylight * 0.78
    );

    scene.background.copy(sky);
    scene.fog.color.copy(sky);

    sunlight.position.set(
        Math.cos(phase) * 35,
        12 + daylight * 48,
        Math.sin(phase) * 30
    );

}


/* =========================================
   UKLADANIE HRY
========================================= */

function saveGame() {

    const data = {

        position: player.position.toArray(),

        health: player.health,
        hunger: player.hunger,

        inventory: { ...inventory },

        day,
        dayTimer,
        hungerTimer,

        removedResourceIds: [
            ...removedResourceIds
        ],

        placedBlocks: placedBlocks.map(
            b => b.position.toArray()
        )

    };

    try {

        localStorage.setItem(
            "wildSurvivalSave",
            JSON.stringify(data)
        );

        showMessage("Hra bola uložená!");

        $("save-button").textContent =
            "ULOŽENÉ ✓";

        setTimeout(() => {

            $("save-button").textContent =
                "ULOŽIŤ HRU";

        }, 1400);

    } catch (err) {

        showMessage("Uloženie sa nepodarilo");

        console.error(err);

    }

}


function loadGame() {

    let data;

    try {

        data = JSON.parse(
            localStorage.getItem(
                "wildSurvivalSave"
            ) || "null"
        );

    } catch (e) {

        console.warn("Save is invalid", e);

        return;

    }

    if (!data) return;

    if (
        Array.isArray(data.position) &&
        data.position.length === 3
    ) {

        player.position.fromArray(
            data.position
        );

        player.position.x =
            THREE.MathUtils.clamp(
                player.position.x,
                -HALF_WORLD + 1,
                HALF_WORLD - 1
            );

        player.position.z =
            THREE.MathUtils.clamp(
                player.position.z,
                -HALF_WORLD + 1,
                HALF_WORLD - 1
            );

    }

    player.health =
        THREE.MathUtils.clamp(
            Number(data.health) || 100,
            0,
            100
        );

    player.hunger =
        THREE.MathUtils.clamp(
            Number(data.hunger) || 100,
            0,
            100
        );

    for (const key of [
        "wood",
        "stone",
        "blocks"
    ]) {

        inventory[key] = Math.max(
            0,
            Number(data.inventory?.[key]) || 0
        );

    }

    day = Math.max(
        1,
        Number(data.day) || 1
    );

    dayTimer = Math.max(
        0,
        Number(data.dayTimer) || 0
    );

    hungerTimer = Math.max(
        0,
        Number(data.hungerTimer) || 0
    );


    removedResourceIds.clear();

    for (
        const id of
        data.removedResourceIds || []
    ) {

        removedResourceIds.add(id);

    }

    for (const group of [...resources]) {

        if (
            removedResourceIds.has(
                group.userData.id
            )
        ) {

            scene.remove(group);

            resources.splice(
                resources.indexOf(group),
                1
            );

        }

    }


    for (const b of placedBlocks) {
        scene.remove(b);
    }

    placedBlocks.length = 0;

    for (
        const coords of
        data.placedBlocks || []
    ) {

        if (
            !Array.isArray(coords) ||
            coords.length !== 3
        ) continue;

        const block = new THREE.Mesh(
            cubeGeo,
            mats.placed
        );

        block.position.fromArray(coords);

        block.castShadow = true;
        block.receiveShadow = true;

        block.userData.key =
            blockKey(block.position);

        scene.add(block);

        placedBlocks.push(block);

    }

    camera.position.copy(player.position);

    $("day").textContent = day;

    updateInventory();
    updateStatsUI();

}


/* =========================================
   PAUZA A ŠTART
========================================= */

const startScreen = $("start-screen");

const gameUI = $("game-ui");

const pauseScreen = $("pause-screen");


function startGame() {

    startScreen.style.display = "none";

    gameUI.style.display = "block";

    loadGame();

    gameStarted = true;

    renderer.domElement.requestPointerLock?.();

}


function showPause() {

    if (
        !gameStarted ||
        paused ||
        inventoryOpen
    ) return;

    paused = true;

    pauseScreen.style.display = "flex";

    document.exitPointerLock?.();

}


function resumeGame() {

    paused = false;

    pauseScreen.style.display = "none";

    renderer.domElement.requestPointerLock?.();

}


$("start-button").addEventListener(
    "click",
    startGame
);

$("resume-button").addEventListener(
    "click",
    resumeGame
);

$("save-button").addEventListener(
    "click",
    saveGame
);


document.addEventListener(
    "pointerlockchange",
    () => {

        if (!gameStarted || inventoryOpen) {
            return;
        }

        if (
            document.pointerLockElement !== renderer.domElement &&
            !paused
        ) {

            showPause();

        }

    }
);


document.querySelectorAll(".hotbar-slot")
    .forEach(el => {

        el.addEventListener("click", () => {

            selectSlot(
                Number(el.dataset.slot)
            );

        });

    });


/* =========================================
   ZMENA VEĽKOSTI OKNA
========================================= */

window.addEventListener("resize", () => {

    camera.aspect =
        innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        innerWidth,
        innerHeight
    );

    renderer.setPixelRatio(
        Math.min(devicePixelRatio, 1.75)
    );

});


/* =========================================
   HLAVNÁ HERNÁ SLUČKA
========================================= */

const clock = new THREE.Clock();

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(
        clock.getDelta(),
        0.05
    );

    if (
        gameStarted &&
        !paused &&
        !inventoryOpen
    ) {

        movePlayer(delta);

        updateStats(delta);

        updateDay(delta);

    }

    renderer.render(
        scene,
        camera
    );

}


updateInventory();
updateStatsUI();

animate();

import * as THREE from '../../vendor/three.module.js';

export const ROOM = {
    width: 13,
    height: 5.8,
    backZ: -22,
    entranceZ: 22,
    wallX: 6.5,
};

export const EYE_HEIGHT = 1.62;

export const BOUNDS = {
    minX: -5.65,
    maxX: 5.65,
    minZ: -20.2,
    maxZ: 20.2,
};

const COLORS = {
    wall: 0xe4dccd,
    wallTrim: 0x2a221b,
    ceiling: 0x161311,
    frame: 0x241b14,
    mat: 0xefe7d7,
};

const formatDate = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const makeCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

const toTexture = (canvas, anisotropy = 4) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
};

const createFloorTexture = (anisotropy) => {
    const canvas = makeCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#6f5138';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rows = 8;
    const rowHeight = canvas.height / rows;

    for (let row = 0; row < rows; row += 1) {
        const y = row * rowHeight;
        let x = -Math.random() * 260;

        while (x < canvas.width) {
            const width = 320 + Math.random() * 420;
            const hue = 26 + Math.random() * 5;
            const saturation = 22 + Math.random() * 8;
            const lightness = 24 + Math.random() * 7;
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.fillRect(x, y, width - 3, rowHeight - 3);

            for (let grain = 0; grain < 12; grain += 1) {
                ctx.strokeStyle = `rgba(30, 18, 10, ${0.03 + Math.random() * 0.05})`;
                ctx.lineWidth = 1 + Math.random() * 1.4;
                ctx.beginPath();
                const grainY = y + Math.random() * rowHeight;
                ctx.moveTo(x, grainY);
                ctx.bezierCurveTo(
                    x + width * 0.3, grainY + (Math.random() - 0.5) * 9,
                    x + width * 0.6, grainY + (Math.random() - 0.5) * 9,
                    x + width, grainY
                );
                ctx.stroke();
            }

            x += width;
        }

        ctx.fillStyle = 'rgba(24, 14, 8, 0.38)';
        ctx.fillRect(0, y + rowHeight - 2, canvas.width, 2);
    }

    const texture = toTexture(canvas, anisotropy);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 9);
    return texture;
};

const createCarpetTexture = (anisotropy) => {
    const canvas = makeCanvas(256, 256);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2b2723';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2600; i += 1) {
        const alpha = 0.02 + Math.random() * 0.05;
        ctx.fillStyle = Math.random() > 0.5
            ? `rgba(255, 238, 210, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    }

    const texture = toTexture(canvas, anisotropy);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 8);
    return texture;
};

const createPlaqueTexture = (item, anisotropy) => {
    const canvas = makeCanvas(640, 200);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#efe7d7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c6b9a4';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.fillStyle = '#2b241d';
    ctx.font = '600 44px "Songti SC", "Noto Serif SC", Georgia, serif';
    ctx.textBaseline = 'middle';
    const title = item.title.length > 11 ? `${item.title.slice(0, 11)}…` : item.title;
    ctx.fillText(title, 34, 66);

    ctx.fillStyle = '#6f6355';
    ctx.font = '28px "PingFang SC", "Hiragino Sans GB", sans-serif';
    const meta = [item.desc, formatDate(item.date)].filter(Boolean).join('  ·  ');
    ctx.fillText(meta.length > 24 ? `${meta.slice(0, 24)}…` : meta, 34, 130);

    return toTexture(canvas, anisotropy);
};

const createBrandTexture = (anisotropy) => {
    const canvas = makeCanvas(1600, 800);
    const ctx = canvas.getContext('2d');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#241d16';
    ctx.font = '500 208px "Songti SC", "Noto Serif SC", Georgia, serif';
    ctx.fillText('wwj gallery', 800, 350);

    ctx.fillStyle = '#7c6a52';
    ctx.font = '34px "PingFang SC", "Hiragino Sans GB", sans-serif';
    ctx.fillText('D R A W I N G S   ·   P H O T O G R A P H S   ·   S I N C E   2 0 2 0', 800, 520);

    return toTexture(canvas, anisotropy);
};

const createEntranceSignTexture = (anisotropy) => {
    const canvas = makeCanvas(1024, 256);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#100d0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(200, 169, 126, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = '#e8d6b2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 104px "Songti SC", "Noto Serif SC", Georgia, serif';
    ctx.fillText('wwj gallery', 512, 132);

    return toTexture(canvas, anisotropy);
};

const artSize = (aspect) => {
    const maxWidth = 2.9;
    const maxHeight = 2.35;
    if (aspect >= maxWidth / maxHeight) {
        return { width: maxWidth, height: maxWidth / aspect };
    }
    return { width: maxHeight * aspect, height: maxHeight };
};

export const createGallery = ({ scene, items, textures, anisotropy = 4 }) => {
    const floorTexture = createFloorTexture(anisotropy);
    const carpetTexture = createCarpetTexture(anisotropy);
    const brandTexture = createBrandTexture(anisotropy);
    const entranceSignTexture = createEntranceSignTexture(anisotropy);

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.wall,
        roughness: 0.94,
        metalness: 0,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.wallTrim,
        roughness: 0.7,
        metalness: 0.08,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: 0xffffff,
        roughness: 0.52,
        metalness: 0.04,
    });
    const carpetMaterial = new THREE.MeshStandardMaterial({
        map: carpetTexture,
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
    });
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.ceiling,
        roughness: 0.96,
        metalness: 0,
    });

    // ---------- room shell ----------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, 44), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 38), carpetMaterial);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.012, 0);
    carpet.receiveShadow = true;
    scene.add(carpet);

    const carpetEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x574836, roughness: 0.9 });
    [-1.62, 1.62].forEach((x) => {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 38), carpetEdgeMaterial);
        edge.position.set(x, 0.02, 0);
        scene.add(edge);
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, 44), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM.height;
    scene.add(ceiling);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.height), wallMaterial);
    backWall.position.set(0, ROOM.height / 2, ROOM.backZ);
    backWall.receiveShadow = true;
    scene.add(backWall);

    [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, ROOM.height), wallMaterial);
        wall.position.set(side * ROOM.wallX, ROOM.height / 2, 0);
        wall.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        wall.receiveShadow = true;
        scene.add(wall);

        const baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 44), trimMaterial);
        baseboard.position.set(side * (ROOM.wallX - 0.05), 0.13, 0);
        scene.add(baseboard);
    });

    const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.26, 0.08), trimMaterial);
    backBaseboard.position.set(0, 0.13, ROOM.backZ + 0.05);
    scene.add(backBaseboard);

    // entrance wall with doorway
    const doorwayWidth = 3.6;
    const doorwayHeight = 3.85;
    const panelWidth = (ROOM.width - doorwayWidth) / 2;
    [-1, 1].forEach((side) => {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(panelWidth, ROOM.height, 0.24),
            wallMaterial
        );
        panel.position.set(side * (doorwayWidth / 2 + panelWidth / 2), ROOM.height / 2, ROOM.entranceZ + 0.12);
        panel.castShadow = true;
        panel.receiveShadow = true;
        scene.add(panel);
    });

    const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(doorwayWidth, ROOM.height - doorwayHeight, 0.24),
        wallMaterial
    );
    lintel.position.set(0, doorwayHeight + (ROOM.height - doorwayHeight) / 2, ROOM.entranceZ + 0.12);
    lintel.castShadow = true;
    scene.add(lintel);

    const frameTrim = new THREE.MeshStandardMaterial({ color: 0x191410, roughness: 0.6, metalness: 0.15 });
    [-1, 1].forEach((side) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, doorwayHeight, 0.38), frameTrim);
        jamb.position.set(side * (doorwayWidth / 2 + 0.02), doorwayHeight / 2, ROOM.entranceZ + 0.12);
        scene.add(jamb);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(doorwayWidth + 0.36, 0.16, 0.38), frameTrim);
    head.position.set(0, doorwayHeight + 0.08, ROOM.entranceZ + 0.12);
    scene.add(head);

    // dark vestibule the walk-through starts in
    const vestibuleFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM.width, 10),
        new THREE.MeshStandardMaterial({ color: 0x1c1815, roughness: 0.85, metalness: 0.06 })
    );
    vestibuleFloor.rotation.x = -Math.PI / 2;
    vestibuleFloor.position.set(0, 0, 27);
    scene.add(vestibuleFloor);

    const vestibuleCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM.width, 10),
        new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 1 })
    );
    vestibuleCeiling.rotation.x = Math.PI / 2;
    vestibuleCeiling.position.set(0, ROOM.height, 27);
    scene.add(vestibuleCeiling);

    const darkWallMaterial = new THREE.MeshStandardMaterial({ color: 0x211c17, roughness: 0.95 });
    [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, ROOM.height), darkWallMaterial);
        wall.position.set(side * ROOM.wallX, ROOM.height / 2, 27);
        wall.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        scene.add(wall);
    });
    const vestibuleBack = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.height), darkWallMaterial);
    vestibuleBack.position.set(0, ROOM.height / 2, 32);
    vestibuleBack.rotation.y = Math.PI;
    scene.add(vestibuleBack);

    const entranceSign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 0.85),
        new THREE.MeshBasicMaterial({ map: entranceSignTexture, toneMapped: false })
    );
    entranceSign.position.set(0, 4.55, ROOM.entranceZ + 0.26);
    scene.add(entranceSign);

    // brand wall + bench at the far end
    const brand = new THREE.Mesh(
        new THREE.PlaneGeometry(6.6, 3.3),
        new THREE.MeshBasicMaterial({ map: brandTexture, transparent: true, toneMapped: false })
    );
    brand.position.set(0, 3.55, ROOM.backZ + 0.08);
    scene.add(brand);

    const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.55, metalness: 0.05 });
    const bench = new THREE.Group();
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.72), benchMaterial);
    benchTop.position.y = 0.46;
    benchTop.castShadow = true;
    bench.add(benchTop);
    [-1.35, 1.35].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.6), benchMaterial);
        leg.position.set(x, 0.22, 0);
        leg.castShadow = true;
        bench.add(leg);
    });
    bench.position.set(0, 0, -19.2);
    scene.add(bench);

    // ---------- lighting ----------
    scene.add(new THREE.HemisphereLight(0xfff1dd, 0x2a2118, 1.1));

    const keyLight = new THREE.DirectionalLight(0xffe7c9, 1.45);
    keyLight.position.set(3.5, 9, 9);
    keyLight.target.position.set(0, 1.5, -4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -26;
    keyLight.shadow.camera.right = 26;
    keyLight.shadow.camera.top = 26;
    keyLight.shadow.camera.bottom = -26;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    scene.add(keyLight.target);

    const stripMaterial = new THREE.MeshBasicMaterial({ color: 0xffe8c6, toneMapped: false });
    const pointLights = [];
    const stripZ = [-18, -10.8, -3.6, 3.6, 10.8, 18];

    stripZ.forEach((z, index) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.07, 0.18), stripMaterial);
        strip.position.set(0, ROOM.height - 0.06, z);
        scene.add(strip);

        const light = new THREE.PointLight(0xffd9a8, 29, 15, 2);
        light.position.set(0, ROOM.height - 0.7, z);
        light.userData.baseIntensity = light.intensity;
        light.userData.phase = index * 1.7;
        scene.add(light);
        pointLights.push(light);
    });

    const vestibuleLight = new THREE.PointLight(0xffb066, 22, 16, 2);
    vestibuleLight.position.set(0, 4.4, 28);
    scene.add(vestibuleLight);

    // ---------- artwork ----------
    const artworks = [];
    const artMeshes = [];
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.frame,
        roughness: 0.48,
        metalness: 0.18,
    });
    const matMaterial = new THREE.MeshStandardMaterial({ color: COLORS.mat, roughness: 0.95 });

    const leftItems = items.filter((_, index) => index % 2 === 0);
    const rightItems = items.filter((_, index) => index % 2 === 1);
    const spacing = 5.2;
    // leave an empty foyer near the entrance so the first paintings are not clipped by the camera
    const rowCenterZ = -2.5;

    const placeSide = (sideItems, side) => {
        const startZ = rowCenterZ - ((sideItems.length - 1) * spacing) / 2;

        sideItems.forEach((item, order) => {
            const index = items.indexOf(item);
            const texture = textures[index];
            const aspect = texture?.image
                ? texture.image.width / texture.image.height
                : 1;
            const { width, height } = artSize(aspect);

            const group = new THREE.Group();
            group.position.set(
                side === 'left' ? -ROOM.wallX + 0.02 : ROOM.wallX - 0.02,
                2.72,
                startZ + order * spacing
            );
            group.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;

            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.12),
                frameMaterial
            );
            frame.position.z = -0.02;
            frame.castShadow = true;
            group.add(frame);

            const mat = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.16, height + 0.16), matMaterial);
            mat.position.z = 0.045;
            group.add(mat);

            const artMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.88,
                metalness: 0,
                emissive: 0xffffff,
                emissiveMap: texture,
                emissiveIntensity: 0.16,
            });
            const art = new THREE.Mesh(new THREE.PlaneGeometry(width, height), artMaterial);
            art.position.z = 0.055;
            art.userData.artIndex = index;
            group.add(art);
            artMeshes.push(art);

            const plaqueTexture = createPlaqueTexture(item, anisotropy);
            const plaque = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 0.375),
                new THREE.MeshStandardMaterial({
                    map: plaqueTexture,
                    roughness: 0.9,
                    emissive: 0xffffff,
                    emissiveMap: plaqueTexture,
                    emissiveIntensity: 0.18,
                })
            );
            plaque.position.set(0, -height / 2 - 0.52, 0.05);
            group.add(plaque);

            scene.add(group);

            artworks[index] = {
                index,
                item,
                group,
                material: artMaterial,
                hover: 0,
            };
        });
    };

    placeSide(leftItems, 'left');
    placeSide(rightItems, 'right');

    // subtle dust in the air
    const dustCount = 320;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSeed = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i += 1) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 11.4;
        dustPositions[i * 3 + 1] = 0.3 + Math.random() * 4.9;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        dustSeed[i] = Math.random() * Math.PI * 2;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
        dustGeometry,
        new THREE.PointsMaterial({
            color: 0xffe3b8,
            size: 0.023,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        })
    );
    scene.add(dust);

    let hovered = -1;

    const setHovered = (index) => {
        hovered = index;
    };

    const update = (dt, elapsed) => {
        pointLights.forEach((light) => {
            light.intensity = light.userData.baseIntensity * (1 + Math.sin(elapsed * 0.8 + light.userData.phase) * 0.02);
        });

        const positions = dustGeometry.attributes.position.array;
        for (let i = 0; i < dustCount; i += 1) {
            const yIndex = i * 3 + 1;
            positions[yIndex] += dt * 0.045;
            if (positions[yIndex] > 5.2) positions[yIndex] = 0.25;
            positions[i * 3] += Math.sin(elapsed * 0.3 + dustSeed[i]) * dt * 0.012;
        }
        dustGeometry.attributes.position.needsUpdate = true;

        artworks.forEach((artwork) => {
            const target = artwork.index === hovered ? 1 : 0;
            artwork.hover += (target - artwork.hover) * Math.min(1, dt * 9);
            const scale = 1 + artwork.hover * 0.022;
            artwork.group.scale.set(scale, scale, 1);
            artwork.material.emissiveIntensity = 0.16 + artwork.hover * 0.3;
        });
    };

    return {
        artworks,
        artMeshes,
        setHovered,
        update,
    };
};

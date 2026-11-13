import * as THREE from '../../vendor/three.module.js';
import { createGallery, EYE_HEIGHT, BOUNDS } from './scene.js';
import { GalleryControls } from './controls.js';

const items = window.__GALLERY_LIST__ || [];

const app = document.getElementById('app');
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
const introEl = document.getElementById('intro');
const tooltip = document.getElementById('tooltip');
const detail = document.getElementById('detail');
const detailImg = document.getElementById('detailImg');
const detailTitle = document.getElementById('detailTitle');
const detailDesc = document.getElementById('detailDesc');
const detailMeta = document.getElementById('detailMeta');
const detailClose = document.getElementById('detailClose');

const formatDate = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const makeFallbackTexture = (item) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2a241d');
    gradient.addColorStop(1, '#171310');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(200, 169, 126, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
    ctx.fillStyle = '#d8c8ac';
    ctx.textAlign = 'center';
    ctx.font = '42px "Songti SC", "Noto Serif SC", Georgia, serif';
    ctx.fillText(item.title, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const setProgress = (ratio) => {
    const percent = Math.round(ratio * 100);
    loaderFill.style.width = `${percent}%`;
    loaderPct.textContent = `${percent}%`;
};

const loadTexture = (item) => new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
        const maxSize = 1024;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropy;
        resolve(texture);
    };
    image.onerror = () => resolve(makeFallbackTexture(item));
    image.src = `gallery/${item.url}`;
});

let renderer;
let anisotropy = 4;

const boot = async () => {
    try {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
    } catch (error) {
        loaderPct.textContent = '当前浏览器不支持 WebGL';
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'gallery-canvas';
    app.appendChild(renderer.domElement);

    anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080706);
    scene.fog = new THREE.FogExp2(0x0a0806, 0.012);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 90);
    camera.position.set(0, EYE_HEIGHT, 29.2);
    camera.rotation.order = 'YXZ';

    const controls = new GalleryControls(camera, renderer.domElement, BOUNDS);

    let loaded = 0;
    const textures = await Promise.all(items.map(async (item) => {
        const texture = await loadTexture(item);
        loaded += 1;
        setProgress(loaded / items.length);
        return texture;
    }));

    await new Promise((resolve) => setTimeout(resolve, 420));

    const gallery = createGallery({ scene, items, textures, anisotropy });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-10, -10);
    const pointerClient = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let hoverIndex = -1;
    let introActive = false;
    let introStart = 0;
    let suppressClickUntil = 0;
    let downInfo = null;

    const INTRO_START_Z = 29.2;
    const INTRO_END_Z = 16.6;
    const INTRO_DURATION = 5600;

    const setPointer = (clientX, clientY) => {
        pointerClient.x = clientX;
        pointerClient.y = clientY;
        pointer.x = (clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    };

    const updateTooltip = () => {
        if (hoverIndex < 0 || introActive || detail.classList.contains('is-open') || controls.isDragging) {
            tooltip.classList.remove('is-visible');
            return;
        }
        const item = items[hoverIndex];
        if (!item) return;
        tooltip.textContent = item.title;
        tooltip.classList.add('is-visible');
        const maxX = window.innerWidth - tooltip.offsetWidth - 24;
        const maxY = window.innerHeight - tooltip.offsetHeight - 24;
        tooltip.style.left = `${Math.min(pointerClient.x, maxX)}px`;
        tooltip.style.top = `${Math.min(pointerClient.y, maxY)}px`;
    };

    const pickArtwork = () => {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(gallery.artMeshes, false);
        return hits.length ? hits[0].object.userData.artIndex : -1;
    };

    const updateHover = () => {
        if (introActive || detail.classList.contains('is-open')) {
            if (hoverIndex !== -1) {
                hoverIndex = -1;
                gallery.setHovered(-1);
                renderer.domElement.classList.remove('is-pointing');
                tooltip.classList.remove('is-visible');
            }
            return;
        }

        const next = pickArtwork();
        if (next !== hoverIndex) {
            hoverIndex = next;
            gallery.setHovered(next);
            renderer.domElement.classList.toggle('is-pointing', next >= 0);
        }
        updateTooltip();
    };

    const openDetail = (index) => {
        const item = items[index];
        if (!item) return;

        detailImg.src = `gallery/${item.url}`;
        detailImg.alt = item.title;
        detailTitle.textContent = item.title;
        detailDesc.textContent = item.desc || '未命名作品';
        const meta = [formatDate(item.date)];
        if (item.tags && item.tags.length) meta.push(item.tags.join(' / '));
        detailMeta.textContent = meta.join('  ·  ');

        detail.classList.add('is-open');
        detail.setAttribute('aria-hidden', 'false');
        controls.setEnabled(false);
        tooltip.classList.remove('is-visible');
        renderer.domElement.classList.remove('is-pointing');
        hoverIndex = -1;
        gallery.setHovered(-1);
    };

    const closeDetail = () => {
        if (!detail.classList.contains('is-open')) return;
        detail.classList.remove('is-open');
        detail.setAttribute('aria-hidden', 'true');
        controls.setEnabled(true);
        suppressClickUntil = performance.now() + 300;
    };

    const finishIntro = () => {
        if (!introActive) return;
        introActive = false;
        controls.setEnabled(true);
        controls.setPose(0, INTRO_END_Z, 0, 0);
        introEl.classList.add('is-hidden');
        document.body.classList.add('is-ready');
        suppressClickUntil = performance.now() + 450;
        window.removeEventListener('keydown', skipIntro, true);
        window.removeEventListener('pointerdown', skipIntro, true);
    };

    const skipIntro = () => {
        finishIntro();
    };

    const startIntro = () => {
        introActive = true;
        introStart = performance.now();
        camera.position.set(0, EYE_HEIGHT, INTRO_START_Z);
        camera.rotation.set(0, 0, 0, 'YXZ');
        loaderEl.classList.add('is-hidden');
        window.addEventListener('keydown', skipIntro, true);
        window.addEventListener('pointerdown', skipIntro, true);
        clock.start();
        animate();
    };

    const updateIntro = () => {
        const t = Math.min(1, (performance.now() - introStart) / INTRO_DURATION);
        const eased = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.z = INTRO_START_Z - (INTRO_START_Z - INTRO_END_Z) * eased;
        camera.position.y = EYE_HEIGHT + Math.sin(eased * Math.PI) * 0.018;
        if (t >= 1) finishIntro();
    };

    const clock = new THREE.Clock();
    let elapsed = 0;

    const animate = () => {
        requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;

        if (introActive) {
            updateIntro();
        } else {
            controls.update(dt);
            updateHover();
        }

        gallery.update(dt, elapsed);
        renderer.render(scene, camera);
    };

    // ---------- events ----------
    window.addEventListener('pointermove', (event) => {
        setPointer(event.clientX, event.clientY);
    });

    window.addEventListener('pointerdown', (event) => {
        if (event.target !== renderer.domElement) return;
        setPointer(event.clientX, event.clientY);
    });

    renderer.domElement.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        downInfo = {
            x: event.clientX,
            y: event.clientY,
            time: performance.now(),
            duringIntro: introActive,
        };
    });

    renderer.domElement.addEventListener('pointerup', (event) => {
        if (!downInfo) return;
        const info = downInfo;
        downInfo = null;

        if (info.duringIntro || introActive) return;
        if (performance.now() < suppressClickUntil) return;

        const distance = Math.hypot(event.clientX - info.x, event.clientY - info.y);
        if (distance > 9 || performance.now() - info.time > 700) return;

        setPointer(event.clientX, event.clientY);
        const index = pickArtwork();
        if (index >= 0) openDetail(index);
    });

    detailClose.addEventListener('click', closeDetail);
    detail.addEventListener('click', (event) => {
        if (event.target === detail || event.target.classList.contains('detail-backdrop')) {
            closeDetail();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.code === 'Escape') closeDetail();
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    setProgress(1);
    startIntro();
};

boot().catch((error) => {
    console.error(error);
    loaderPct.textContent = '画廊加载失败';
});

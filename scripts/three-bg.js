import * as THREE from 'three'
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js'
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js'

const canvas = document.getElementById('bg-canvas')

if (canvas) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bloomEnabled = window.innerWidth > 760 && !reducedMotion

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050b18)
    scene.fog = new THREE.FogExp2(0x050b18, 0.012)

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400)
    camera.position.set(0, 3.5, 30)

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    renderer.setClearColor(0x050b18, 1)

    let composer = null
    if (bloomEnabled) {
        composer = new EffectComposer(renderer)
        composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
        composer.setSize(window.innerWidth, window.innerHeight)
        composer.addPass(new RenderPass(scene, camera))
        composer.addPass(new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.85,
            0.75,
            0.16
        ))
        composer.addPass(new OutputPass())
    }

    // 柔光粒子贴图
    const glowTexture = (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 128
        const ctx = c.getContext('2d')
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
        gradient.addColorStop(0, 'rgba(255,255,255,1)')
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)')
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 128, 128)
        return new THREE.CanvasTexture(c)
    })()

    // 星空
    const createStarField = (count, color, size, depth) => {
        const positions = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200
            positions[i * 3 + 1] = (Math.random() - 0.5) * 120
            positions[i * 3 + 2] = -Math.random() * depth
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const points = new THREE.Points(geometry, new THREE.PointsMaterial({
            size,
            map: glowTexture,
            color,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }))
        scene.add(points)
        return points
    }

    const stars = createStarField(900, 0xbfeaff, 0.55, 150)
    const violetStars = createStarField(260, 0xb69bff, 0.45, 170)

    // 星云光斑
    const nebulas = []
    const nebulaColors = [0x2b7dd4, 0x7c4dff, 0x1fa2c9]
    nebulaColors.forEach((color, i) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTexture,
            color,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }))
        sprite.position.set(
            (i - 1) * 34 + (Math.random() - 0.5) * 10,
            (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 12),
            -70 - i * 15
        )
        sprite.scale.setScalar(80 + i * 22)
        sprite.userData = {baseX: sprite.position.x, baseY: sprite.position.y, phase: i * 2.1}
        scene.add(sprite)
        nebulas.push(sprite)
    })

    // 中央线框晶体
    const core = new THREE.Group()
    core.position.set(0, 6, -16)

    const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(12, 1)),
        new THREE.LineBasicMaterial({
            color: 0x4bc4ff,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    )
    const innerWireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(7, 0)),
        new THREE.LineBasicMaterial({
            color: 0x8fe8ff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    )
    const vertices = new THREE.Points(
        new THREE.IcosahedronGeometry(12, 1),
        new THREE.PointsMaterial({
            size: 0.32,
            map: glowTexture,
            color: 0x9fe4ff,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })
    )
    const halo = new THREE.Mesh(
        new THREE.TorusGeometry(15.5, 0.02, 8, 200),
        new THREE.MeshBasicMaterial({
            color: 0x4bc4ff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    )
    halo.rotation.x = 1.18
    halo.rotation.y = 0.25
    const haloB = new THREE.Mesh(
        new THREE.TorusGeometry(18.5, 0.015, 8, 220),
        new THREE.MeshBasicMaterial({
            color: 0x8b5cf6,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    )
    haloB.rotation.x = 1.4
    haloB.rotation.z = 0.5
    core.add(wireframe, innerWireframe, vertices, halo, haloB)
    scene.add(core)

    // 环绕粒子带
    const orbitCount = 420
    const orbitPositions = new Float32Array(orbitCount * 3)
    for (let i = 0; i < orbitCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = 16 + (Math.random() - 0.5) * 3
        orbitPositions[i * 3] = Math.cos(angle) * radius
        orbitPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.8
        orbitPositions[i * 3 + 2] = Math.sin(angle) * radius
    }
    const orbitGeometry = new THREE.BufferGeometry()
    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3))
    const orbit = new THREE.Points(orbitGeometry, new THREE.PointsMaterial({
        size: 0.3,
        map: glowTexture,
        color: 0xa8ecff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }))
    orbit.rotation.x = 1.25
    core.add(orbit)

    // 两侧线框结
    const knotGeometry = new THREE.TorusKnotGeometry(8, 0.16, 260, 10)
    const knots = [
        {
            mesh: new THREE.Mesh(knotGeometry, new THREE.MeshBasicMaterial({
                color: 0x4bc4ff,
                transparent: true,
                opacity: 0.16,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })),
            position: [-32, 3, -48],
            scale: 1.5
        },
        {
            mesh: new THREE.Mesh(knotGeometry, new THREE.MeshBasicMaterial({
                color: 0x8b5cf6,
                transparent: true,
                opacity: 0.14,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })),
            position: [34, -4, -52],
            scale: 1.8
        }
    ]
    knots.forEach(knot => {
        knot.mesh.position.set(...knot.position)
        knot.mesh.scale.setScalar(knot.scale)
        scene.add(knot.mesh)
    })

    // 地面网格
    const grid = new THREE.GridHelper(260, 80, 0x4bc4ff, 0x0e3550)
    grid.position.set(0, -13, -20)
    grid.material.transparent = true
    grid.material.opacity = 0.22
    grid.material.depthWrite = false
    scene.add(grid)

    // 漂浮碎片
    const shardGeometry = new THREE.WireframeGeometry(new THREE.OctahedronGeometry(1, 0))
    const shardMaterials = [
        new THREE.LineBasicMaterial({color: 0x4bc4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false}),
        new THREE.LineBasicMaterial({color: 0x86e7ff, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false})
    ]
    const shards = []
    for (let i = 0; i < 10; i++) {
        const shard = new THREE.LineSegments(shardGeometry, shardMaterials[i % 2])
        shard.position.set(
            (i % 2 === 0 ? 1 : -1) * (17 + Math.random() * 14),
            -9 + Math.random() * 19,
            -10 - Math.random() * 20
        )
        shard.scale.setScalar(0.8 + Math.random() * 1.9)
        shard.userData = {
            speed: 0.2 + Math.random() * 0.45,
            phase: Math.random() * Math.PI * 2,
            baseY: shard.position.y
        }
        scene.add(shard)
        shards.push(shard)
    }

    // 鼠标视差
    const pointer = {x: 0, y: 0}
    window.addEventListener('pointermove', event => {
        pointer.x = event.clientX / window.innerWidth * 2 - 1
        pointer.y = event.clientY / window.innerHeight * 2 - 1
    }, {passive: true})

    const clock = new THREE.Clock()
    let frameId = null

    const renderFrame = () => {
        const time = clock.getElapsedTime()

        core.rotation.y = time * 0.1
        core.rotation.x = Math.sin(time * 0.22) * 0.12
        halo.rotation.z = time * 0.06
        haloB.rotation.z = -time * 0.045
        orbit.rotation.z = time * 0.12
        stars.rotation.y = time * 0.006
        violetStars.rotation.y = -time * 0.004
        grid.position.z = -20 + (time * 2.4) % (260 / 80)

        nebulas.forEach(nebula => {
            nebula.position.x = nebula.userData.baseX + Math.sin(time * 0.08 + nebula.userData.phase) * 4
            nebula.position.y = nebula.userData.baseY + Math.cos(time * 0.06 + nebula.userData.phase) * 3
        })

        knots.forEach((knot, i) => {
            knot.mesh.rotation.x = time * 0.05 + i
            knot.mesh.rotation.y = time * 0.08 + i * 2
        })

        shards.forEach(shard => {
            shard.rotation.x = time * shard.userData.speed * 0.6
            shard.rotation.y = time * shard.userData.speed
            shard.position.y = shard.userData.baseY + Math.sin(time * shard.userData.speed + shard.userData.phase) * 0.9
        })

        camera.position.x += (pointer.x * 2 - camera.position.x) * 0.04
        camera.position.y += (3.5 - pointer.y * 1 - camera.position.y) * 0.04
        camera.lookAt(0, 3, -10)

        if (composer) {
            composer.render()
        } else {
            renderer.render(scene, camera)
        }
    }

    const loop = () => {
        renderFrame()
        frameId = requestAnimationFrame(loop)
    }

    const resize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight, false)
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight)
        }
        if (reducedMotion) renderFrame()
    }

    window.addEventListener('resize', resize)

    document.addEventListener('visibilitychange', () => {
        if (reducedMotion) return
        if (document.hidden) {
            cancelAnimationFrame(frameId)
            frameId = null
        } else if (frameId === null) {
            loop()
        }
    })

    if (reducedMotion) {
        renderFrame()
    } else {
        loop()
    }
}

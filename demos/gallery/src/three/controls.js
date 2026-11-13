import * as THREE from '../../vendor/three.module.js';

const PI_2 = Math.PI / 2;

export class GalleryControls {
    constructor(camera, domElement, bounds) {
        this.camera = camera;
        this.domElement = domElement;
        this.bounds = bounds;

        this.enabled = false;
        this.eyeHeight = 1.62;
        this.yaw = 0;
        this.pitch = 0;
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.bob = 0;
        this.knock = 0;
        this.lookSpeed = 0.0024;
        this.walkSpeed = 4.0;
        this.runSpeed = 6.8;
        this.dragging = false;

        this.keys = new Set();
        this.velocity = new THREE.Vector3();
        this._targetVelocity = new THREE.Vector3();
        this._forward = new THREE.Vector3();
        this._right = new THREE.Vector3();

        camera.rotation.order = 'YXZ';

        this._lastX = 0;
        this._lastY = 0;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onWheel = this._onWheel.bind(this);

        domElement.addEventListener('pointerdown', this._onPointerDown);
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerUp);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        domElement.addEventListener('wheel', this._onWheel, { passive: false });
    }

    get isDragging() {
        return this.dragging;
    }

    setEnabled(value) {
        this.enabled = value;
        if (!value) {
            this.keys.clear();
            this.dragging = false;
            this.domElement.classList.remove('is-grabbing');
        }
    }

    setPose(x, z, yaw = 0, pitch = 0) {
        this.camera.position.set(x, this.eyeHeight, z);
        this.yaw = this.targetYaw = yaw;
        this.pitch = this.targetPitch = pitch;
        this.velocity.set(0, 0, 0);
        this.knock = 0;
        this.bob = 0;
        this._applyRotation();
    }

    _applyRotation() {
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    _onPointerDown(event) {
        if (!this.enabled) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.target !== this.domElement) return;

        this.dragging = true;
        this._lastX = event.clientX;
        this._lastY = event.clientY;
        this.domElement.classList.add('is-grabbing');
        this.domElement.setPointerCapture?.(event.pointerId);
    }

    _onPointerMove(event) {
        if (!this.enabled || !this.dragging) return;

        const dx = event.clientX - this._lastX;
        const dy = event.clientY - this._lastY;
        this._lastX = event.clientX;
        this._lastY = event.clientY;

        this.targetYaw -= dx * this.lookSpeed;
        this.targetPitch -= dy * this.lookSpeed;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -PI_2 + 0.08, PI_2 - 0.08);
    }

    _onPointerUp() {
        if (!this.dragging) return;
        this.dragging = false;
        this.domElement.classList.remove('is-grabbing');
    }

    _onKeyDown(event) {
        if (!this.enabled) return;
        this.keys.add(event.code);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
    }

    _onKeyUp(event) {
        this.keys.delete(event.code);
    }

    _onWheel(event) {
        if (!this.enabled) return;
        event.preventDefault();
        this.knock = THREE.MathUtils.clamp(this.knock - event.deltaY * 0.0026, -3.2, 3.2);
    }

    update(dt) {
        if (!this.enabled) return;

        const rotateDamp = 1 - Math.exp(-16 * dt);
        this.yaw += (this.targetYaw - this.yaw) * rotateDamp;
        this.pitch += (this.targetPitch - this.pitch) * rotateDamp;
        this._applyRotation();

        const forwardInput =
            (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
            (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const strafeInput =
            (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
            (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

        const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        const speed = sprinting ? this.runSpeed : this.walkSpeed;

        this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        this._targetVelocity.set(0, 0, 0);
        this._targetVelocity.addScaledVector(this._forward, forwardInput);
        this._targetVelocity.addScaledVector(this._right, strafeInput);
        if (this._targetVelocity.lengthSq() > 1) this._targetVelocity.normalize();
        this._targetVelocity.multiplyScalar(speed);

        const moveDamp = 1 - Math.exp(-9 * dt);
        this.velocity.lerp(this._targetVelocity, moveDamp);

        const position = this.camera.position;
        position.addScaledVector(this.velocity, dt);
        position.addScaledVector(this._forward, this.knock * dt * 2.4);
        this.knock *= Math.exp(-4.2 * dt);

        const { minX, maxX, minZ, maxZ } = this.bounds;
        const clampedX = THREE.MathUtils.clamp(position.x, minX, maxX);
        const clampedZ = THREE.MathUtils.clamp(position.z, minZ, maxZ);
        if (clampedX !== position.x) this.velocity.x = 0;
        if (clampedZ !== position.z) this.velocity.z = 0;
        position.x = clampedX;
        position.z = clampedZ;

        const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (planarSpeed > 0.12) this.bob += dt * (5.4 + planarSpeed * 0.9);
        const bobAmount = Math.sin(this.bob * 2) * 0.016 * Math.min(planarSpeed / this.walkSpeed, 1);
        position.y = this.eyeHeight + bobAmount;
    }
}

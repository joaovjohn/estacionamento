import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type SpotType = 'start' | 'finish';

export interface ParkingSpotOptions {
    position: THREE.Vector3;
    type: SpotType;
    rotation?: number; // rotacao em radianos no eixo Y
}

export class ParkingSpot {
    private mesh: THREE.Group;
    private type: SpotType;
    private position: THREE.Vector3;
    private triggerRadius = 3; // raio para detectar se o carro chegou

    constructor(scene: THREE.Scene, options: ParkingSpotOptions) {
        const { 
            position, 
            type, 
            rotation = 0 
        } = options;
        this.type = type;
        this.position = position.clone();

        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        this.mesh.rotation.y = rotation;
        scene.add(this.mesh);

        // cria placeholder visual
        this.createPlaceholder();

        // cria marcacao no chao
        this.createGroundMarking();

        // carrega o modelo apropriado
        const modelPath =
            type === 'start'
                ? '/kenney_toy-car-kit/Models/GLB format/gate.glb'
                : '/kenney_toy-car-kit/Models/GLB format/gate-finish.glb';

        this.loadModel(modelPath);
    }

    private createPlaceholder(): void {
        const color = this.type === 'start' ? 0x00ff00 : 0xff0000;

        // arco simples como placeholder
        const geometry = new THREE.TorusGeometry(2, 0.2, 8, 16, Math.PI);
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.5,
        });
        const arch = new THREE.Mesh(geometry, material);
        arch.rotation.x = Math.PI / 2;
        arch.position.y = 2;
        arch.name = 'placeholder';
        this.mesh.add(arch);

        // postes laterais
        const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5);
        const postMaterial = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.5,
        });

        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(-2, 1.25, 0);
        leftPost.name = 'placeholder-left';
        this.mesh.add(leftPost);

        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.set(2, 1.25, 0);
        rightPost.name = 'placeholder-right';
        this.mesh.add(rightPost);
    }

    private createGroundMarking(): void {
        const color = this.type === 'start' ? 0x00ff00 : 0xff0000;

        // area retangular no chão indicando o ponto
        const geometry = new THREE.PlaneGeometry(6, 4);
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });
        const marking = new THREE.Mesh(geometry, material);
        marking.rotation.x = -Math.PI / 2;
        marking.position.y = 0.02;
        this.mesh.add(marking);

        // bordas da vaga
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const borderGeometry = new THREE.PlaneGeometry(0.15, 4);

        const leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        leftBorder.rotation.x = -Math.PI / 2;
        leftBorder.position.set(-3, 0.03, 0);
        this.mesh.add(leftBorder);

        const rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        rightBorder.rotation.x = -Math.PI / 2;
        rightBorder.position.set(3, 0.03, 0);
        this.mesh.add(rightBorder);

        // texto indicador (usando sprite para simplificar)
        this.createLabel();
    }

    private createLabel(): void {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;

        // fundo
        context.fillStyle = this.type === 'start' ? '#00aa00' : '#aa0000';
        context.fillRect(0, 0, 256, 128);

        // texto de demonstracao
        context.fillStyle = '#ffffff';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.type === 'start' ? 'PARTIDA' : 'CHEGADA', 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 1, 1); 
        sprite.position.y = 3.5; 
        this.mesh.add(sprite);
    }

    private async loadModel(path: string): Promise<void> {
        const loader = new GLTFLoader();

        try {
            const gltf = await loader.loadAsync(path);
            const model = gltf.scene;

            // ajusta a escala
            model.scale.set(2, 2, 2);

            // configura sombras
            model.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // remove os placeholders
            const placeholder = this.mesh.getObjectByName('placeholder');
            const placeholderLeft = this.mesh.getObjectByName('placeholder-left');
            const placeholderRight = this.mesh.getObjectByName('placeholder-right');

            if (placeholder) this.mesh.remove(placeholder);
            if (placeholderLeft) this.mesh.remove(placeholderLeft);
            if (placeholderRight) this.mesh.remove(placeholderRight);

            this.mesh.add(model);
        } catch (error) {
            console.log(error);
        }
    }

    public isCarInside(carPosition: THREE.Vector3): boolean {
        const distance = this.position.distanceTo(carPosition);
        return distance < this.triggerRadius;
    }
}

// gerenciador dos pontos de partida e chegada
export class ParkingSpotManager {
    private startSpot: ParkingSpot | null = null;
    private finishSpot: ParkingSpot | null = null;
    private onFinishCallback: (() => void) | null = null;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public createSpots(startPos: THREE.Vector3, finishPos: THREE.Vector3): void {
        this.startSpot = new ParkingSpot(this.scene, {
            position: startPos,
            type: 'start',
            rotation: 0,
        });

        this.finishSpot = new ParkingSpot(this.scene, {
            position: finishPos,
            type: 'finish',
            rotation: Math.PI,
        });
    }

    public checkCarPosition(carPosition: THREE.Vector3): { atStart: boolean; atFinish: boolean } {
        const atStart = this.startSpot?.isCarInside(carPosition) || false;
        const atFinish = this.finishSpot?.isCarInside(carPosition) || false;

        if (atFinish && this.onFinishCallback) {
            this.onFinishCallback();
        }

        return { atStart, atFinish };
    }

    public onFinish(callback: () => void): void {
        this.onFinishCallback = callback;
    }
}

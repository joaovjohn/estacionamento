import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsWorld } from '../core/PhysicsWorld';

export type ObstacleType = 'cone' | 'box';

export interface ObstacleOptions {
    position: THREE.Vector3;
    type?: ObstacleType;
    scale?: number;
}

export class Obstacle {
    private mesh: THREE.Group;
    private body: CANNON.Body;
    private type: ObstacleType;
    private scale: number;

    constructor(
        scene: THREE.Scene,
        physicsWorld: PhysicsWorld, 
        options: ObstacleOptions
    ) {
        const { position, type = 'cone', scale = 1 } = options;
        this.type = type;
        this.scale = scale;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // cria placeholder visual e corpo físico baseado no tipo
        if (type === 'cone') {
            this.createConePlaceholder(scale);
            this.body = this.createConePhysics(position, scale, physicsWorld);
            this.loadModel('/kenney_car-kit/Models/GLB format/cone.glb', scale);
        } else {
            this.createBoxPlaceholder(scale);
            this.body = this.createBoxPhysics(position, scale, physicsWorld);
            this.loadModel('/kenney_car-kit/Models/GLB format/box.glb', scale);
        }
    }

    private createConePlaceholder(scale: number): void {
        const geometry = new THREE.ConeGeometry(0.3 * scale, 0.8 * scale, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.5,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.4 * scale;
        mesh.castShadow = true;
        mesh.name = 'placeholder';
        this.mesh.add(mesh);
    }

    private createBoxPlaceholder(scale: number): void {
        const geometry = new THREE.BoxGeometry(0.8 * scale, 0.8 * scale, 0.8 * scale);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            transparent: true,
            opacity: 0.5,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.4 * scale;
        mesh.castShadow = true;
        mesh.name = 'placeholder';
        this.mesh.add(mesh);
    }

    private createConePhysics(
        position: THREE.Vector3,
        scale: number,
        physicsWorld: PhysicsWorld,
    ): CANNON.Body {
        // aproximacao: usa um cilindro para fisica do cone
        const shape = new CANNON.Cylinder(0.1 * scale, 0.3 * scale, 0.8 * scale, 8);
        const body = new CANNON.Body({
            mass: 5, // leve
            position: new CANNON.Vec3(position.x, position.y + 0.4 * scale, position.z),
            shape,
        });
        physicsWorld.addBody(body);
        return body;
    }

    private createBoxPhysics(
        position: THREE.Vector3,
        scale: number,
        physicsWorld: PhysicsWorld,
    ): CANNON.Body {
        const shape = new CANNON.Box(new CANNON.Vec3(0.4 * scale, 0.4 * scale, 0.4 * scale));
        const body = new CANNON.Body({
            mass: 20, // pesado
            position: new CANNON.Vec3(position.x, position.y + 0.4 * scale, position.z),
            shape,
        });
        physicsWorld.addBody(body);
        return body;
    }

    private async loadModel(path: string, scale: number): Promise<void> {
        const loader = new GLTFLoader();

        try {
            const gltf = await loader.loadAsync(path);
            const model = gltf.scene;

            // ajusta a escala
            model.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);

            // configura sombras
            model.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // remove o placeholder
            const placeholder = this.mesh.getObjectByName('placeholder');
            if (placeholder) {
                this.mesh.remove(placeholder);
            }

            this.mesh.add(model);
        } catch (error) {
            console.log(error);
        }
    }

    public update(): void {
        // offset entre o centro do corpo fisico e a base do mesh
        const offset = 0.4 * this.scale;
        
        // altura minima do corpo fisico para n atravessar o chao
        const minBodyY = offset;
        
        // se o corpo estiver abaixo do minimo, corrige
        if (this.body.position.y < minBodyY) {
            this.body.position.y = minBodyY;
            if (this.body.velocity.y < 0) {
                this.body.velocity.y = 0;
            }
        }
        
        // sincroniza o mesh com o corpo fisico
        this.mesh.position.set(
            this.body.position.x,
            Math.max(0, this.body.position.y - offset),
            this.body.position.z,
        );
        this.mesh.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w,
        );
    }

    public getBody(): CANNON.Body {
        return this.body;
    }

    public getType(): ObstacleType {
        return this.type;
    }

    public destroy(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
        // remove o mesh da cena
        scene.remove(this.mesh);

        // remove o corpo fisico do mundo
        physicsWorld.removeBody(this.body);

        // limpa os filhos do mesh
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }
    }
}

// classe para gerenciar multiplos obstaculos
export class ObstacleManager {
    private obstacles: Obstacle[] = [];
    private scene: THREE.Scene;
    private physicsWorld: PhysicsWorld;

    constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    public addObstacle(options: ObstacleOptions): Obstacle {
        const obstacle = new Obstacle(
            this.scene, 
            this.physicsWorld, 
            options
        );
        console.log(obstacle);
        this.obstacles.push(obstacle);
        return obstacle;
    }

    public clearObstacles(): void {
        for (const obstacle of this.obstacles) {
            obstacle.destroy(this.scene, this.physicsWorld);
        }
        this.obstacles = [];
    }

    public reset(): void {
        this.clearObstacles();
        this.createObstacleLayout();
    }

    public createObstacleLayout(): void {
        const obstaclePositions: ObstacleOptions[] = [];

        // ========================================
        // ESTRADA SIMPLES E CLARA
        // Cones nas bordas = limite da estrada (mais densos para não escapar)
        // Caixas no meio = obstáculos a desviar
        // ========================================

        const roadWidth = 6; // Largura da pista (distância do centro até a borda)
        const coneSpacing = 2; // Espaçamento entre cones (reduzido para barreira mais densa)

        // ========================================
        // TRECHO 1: RETA INICIAL (z: 33 a 15)
        // Estrada reta saindo da partida
        // ========================================

        for (let z = 33; z >= 15; z -= coneSpacing) {
            // Bordas de cones - ESQUERDA
            obstaclePositions.push({ position: new THREE.Vector3(-roadWidth, 0, z), type: 'cone' });
            // Bordas de cones - DIREITA
            obstaclePositions.push({ position: new THREE.Vector3(roadWidth, 0, z), type: 'cone' });
        }

        // caixas no meio da reta inicial
        obstaclePositions.push({ position: new THREE.Vector3(-2, 0, 28), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(2, 0, 22), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(0, 0, 17), type: 'box' });

        // ========================================
        // TRECHO 2: CURVA À ESQUERDA (z: 15 a 5)
        // Mais pontos na curva para cobertura completa
        // ========================================

        const curve1 = [
            { z: 14, centerX: -1 },
            { z: 12, centerX: -3 },
            { z: 10, centerX: -5 },
            { z: 8, centerX: -7 },
            { z: 6, centerX: -9 },
            { z: 4, centerX: -10 },
        ];

        for (const point of curve1) {
            obstaclePositions.push({
                position: new THREE.Vector3(point.centerX - roadWidth, 0, point.z),
                type: 'cone',
            });
            obstaclePositions.push({
                position: new THREE.Vector3(point.centerX + roadWidth, 0, point.z),
                type: 'cone',
            });
        }

        // Caixa na curva
        obstaclePositions.push({ position: new THREE.Vector3(-6, 0, 9), type: 'box' });

        // ========================================
        // TRECHO 3: RETA À ESQUERDA (z: 4 a -10)
        // ========================================

        const leftOffset = -10;
        for (let z = 2; z >= -10; z -= coneSpacing) {
            obstaclePositions.push({
                position: new THREE.Vector3(leftOffset - roadWidth, 0, z),
                type: 'cone',
            });
            obstaclePositions.push({
                position: new THREE.Vector3(leftOffset + roadWidth, 0, z),
                type: 'cone',
            });
        }

        // Caixas no meio
        obstaclePositions.push({ position: new THREE.Vector3(-12, 0, -2), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(-8, 0, -6), type: 'box' });

        // ========================================
        // TRECHO 4: CURVA À DIREITA (z: -10 a -18)
        // Mais pontos na curva para cobertura completa
        // ========================================

        const curve2 = [
            { z: -11, centerX: -9 },
            { z: -12, centerX: -7 },
            { z: -13, centerX: -5 },
            { z: -14, centerX: -3 },
            { z: -15, centerX: -1 },
            { z: -16, centerX: 0 },
        ];

        for (const point of curve2) {
            obstaclePositions.push({
                position: new THREE.Vector3(point.centerX - roadWidth, 0, point.z),
                type: 'cone',
            });
            obstaclePositions.push({
                position: new THREE.Vector3(point.centerX + roadWidth, 0, point.z),
                type: 'cone',
            });
        }

        // Caixa na curva
        obstaclePositions.push({ position: new THREE.Vector3(-3, 0, -14), type: 'box' });

        // ========================================
        // TRECHO 5: RETA FINAL (z: -18 a -33)
        // Volta ao centro, reta até a chegada
        // ========================================

        for (let z = -17; z >= -33; z -= coneSpacing) {
            obstaclePositions.push({ position: new THREE.Vector3(-roadWidth, 0, z), type: 'cone' });
            obstaclePositions.push({ position: new THREE.Vector3(roadWidth, 0, z), type: 'cone' });
        }

        // Slalom de caixas na reta final
        obstaclePositions.push({ position: new THREE.Vector3(2, 0, -20), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(-2, 0, -24), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(2, 0, -28), type: 'box' });
        obstaclePositions.push({ position: new THREE.Vector3(0, 0, -31), type: 'box' });
        
        for (const options of obstaclePositions) {
            this.addObstacle(options);
        }
        console.log('criou')

    }

    public update(): void {
        for (const obstacle of this.obstacles) {
            obstacle.update();
        }
    }

    public getObstacles(): Obstacle[] {
        return this.obstacles;
    }
}

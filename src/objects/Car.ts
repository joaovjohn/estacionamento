import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsWorld } from '../core/PhysicsWorld';
import type { InputState } from '../core/InputManager';

export interface CarOptions {
    position?: THREE.Vector3;
    modelPath?: string;
}

export class Car {
    private mesh: THREE.Group;
    private body: CANNON.Body;
    private physicsWorld: PhysicsWorld;

    // parametro do veículo
    private readonly maxSpeed = 13.89; // como se fosse 50km
    private readonly acceleration = 12; 
    private readonly brakeForce = 20;
    private readonly turnSpeed = 1.8;
    private readonly friction = 4;

    // estado atual
    private currentSpeed = 0;
    private steeringAngle = 0;

    constructor(
        scene: THREE.Scene, 
        physicsWorld: PhysicsWorld, 
        options: CarOptions = {}
    ) {
        this.physicsWorld = physicsWorld;

        const position = options.position || new THREE.Vector3(0, 0.5, 0);
        const modelPath = options.modelPath || '/kenney_car-kit/Models/GLB format/garbage-truck.glb';
        // tractor
        // van
        // truck
        // suv-luxury
        // tractor-police
        // race
        // firetruck
        // garbage-truck

        // cria um grupo para o mesh do carro
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // cria um placeholder visual enquanto o modelo carrega
        const placeholderGeometry = new THREE.BoxGeometry(2, 1, 4);
        const placeholderMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.5,
        });
        const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        placeholder.position.y = 0.5;
        placeholder.castShadow = true;
        placeholder.name = 'placeholder';
        this.mesh.add(placeholder);

        // cria o corpo fisico do carro
        const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        this.body = new CANNON.Body({
            mass: 1000, // kg
            position: new CANNON.Vec3(position.x, position.y + 0.5, position.z),
            shape: carShape,
            linearDamping: 0.3,
            angularDamping: 0.5,
            allowSleep: false, // importante: nao deixar o corpo dormir
        });

        // fixa a rotacao nos eixos X e Z para evitar que o carro capote
        this.body.fixedRotation = false;
        this.body.updateMassProperties();

        // material do carro
        const carMaterial = new CANNON.Material('car');
        this.body.material = carMaterial;

        physicsWorld.addBody(this.body);

        // carrega o modelo GLB
        this.loadModel(modelPath);
    }

    private async loadModel(path: string): Promise<void> {
        const loader = new GLTFLoader();

        try {
            const gltf = await loader.loadAsync(path);
            const model = gltf.scene;

            // ajusta a escala e posição do modelo
            model.scale.set(1.5, 1.5, 1.5);
            model.position.y = -0.3;

            // rotaciona o modelo 180 graus para a frente ficar na direção correta
            model.rotation.y = Math.PI;

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
            console.log('foi');
        } catch (error) {
            console.log(error);
        }
    }

    public update(delta: number, input: InputState): void {
        // acorda o corpo fisico se estiver parado
        if (this.body.sleepState === CANNON.Body.SLEEPING) {
            this.body.wakeUp();
        }

        // mantem o carro nivelado (evita que capote)
        // extrai apenas a rotação Y do quaternion atual
        const euler = new CANNON.Vec3();
        this.body.quaternion.toEuler(euler);

        // reseta rotacao X e Z para manter o carro nivelado
        this.body.quaternion.setFromEuler(0, euler.y, 0);

        // aplica aceleracao
        if (input.forward) {
            this.currentSpeed = Math.min(
                this.currentSpeed + this.acceleration * delta,
                this.maxSpeed,
            );
        } else if (input.backward) {
            this.currentSpeed = Math.max(
                this.currentSpeed - this.acceleration * delta,
                -this.maxSpeed * 0.5,
            );
        } else {
            // desaceleracao natural (friccao)
            if (this.currentSpeed > 0) {
                this.currentSpeed = Math.max(0, this.currentSpeed - this.friction * delta);
            } else if (this.currentSpeed < 0) {
                this.currentSpeed = Math.min(0, this.currentSpeed + this.friction * delta);
            }
        }

        // aplica freio
        if (input.brake) {
            if (this.currentSpeed > 0) {
                this.currentSpeed = Math.max(0, this.currentSpeed - this.brakeForce * delta);
            } else if (this.currentSpeed < 0) {
                this.currentSpeed = Math.min(0, this.currentSpeed + this.brakeForce * delta);
            }
        }

        // aplica direcao (so funciona se estiver em movimento)
        if (Math.abs(this.currentSpeed) > 0.1) {
            const turnMultiplier = this.currentSpeed > 0 ? 1 : -1;

            if (input.left) {
                this.steeringAngle = this.turnSpeed * turnMultiplier;
            } else if (input.right) {
                this.steeringAngle = -this.turnSpeed * turnMultiplier;
            } else {
                this.steeringAngle = 0;
            }

            // aplica rotacao ao corpo fisico (apenas no eixo Y)
            // em baixa velocidade: curva mais acentuada (fácil manobrar)
            // em alta velocidade: curva mais suave (mais realista)
            const normalizedSpeed = Math.abs(this.currentSpeed) / this.maxSpeed;
            // fator vai de 0.8 (parado) até 0.4 (velocidade maxima)
            const speedFactor = 0.8 - normalizedSpeed * 0.4;
            const angularVelocity = this.steeringAngle * speedFactor;
            this.body.angularVelocity.set(0, angularVelocity, 0);
        } else {
            this.steeringAngle = 0;
            this.body.angularVelocity.set(0, 0, 0);
        }

        // calcula a direcao baseada na rotacao Y do corpo (no plano horizontal)
        const yRotation = euler.y;
        const directionX = -Math.sin(yRotation);
        const directionZ = -Math.cos(yRotation);

        // aplica velocidade na direcao do carro (apenas X e Z, nunca Y)
        this.body.velocity.x = directionX * this.currentSpeed;
        this.body.velocity.z = directionZ * this.currentSpeed;

        // mantem o carro no chao - se estiver proximo do solo, zera a velocidade Y
        // isso evita o pulo durante as curvas
        const groundLevel = 1.0; // Altura normal do carro
        if (this.body.position.y <= groundLevel + 0.1) {
            // carro esta no chao ou muito proximo - zera velocidade vertical
            this.body.velocity.y = 0;
            // corrige a posicao se estiver flutuando levemente
            if (this.body.position.y > groundLevel) {
                this.body.position.y = groundLevel;
            }
        } else if (this.body.position.y > groundLevel + 0.1) {
            // carro esta no ar - forca ele a descer
            this.body.velocity.y = -5;
        }

        // sincroniza o mesh com o corpo fisico
        this.syncMeshWithBody();
    }

    private syncMeshWithBody(): void {
        // copia posicao
        this.mesh.position.set(
            this.body.position.x,
            this.body.position.y - 0.5,
            this.body.position.z,
        );

        // copia rotacao
        this.mesh.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w,
        );
    }

    public getMesh(): THREE.Group {
        return this.mesh;
    }

    public getBody(): CANNON.Body {
        return this.body;
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position.clone();
    }

    public getSpeed(): number {
        return this.currentSpeed;
    }

    public reset(
        position: THREE.Vector3
    ): void {
        this.body.position.set(position.x, position.y + 0.5, position.z);
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
        this.body.quaternion.set(0, 0, 0, 1);
        this.currentSpeed = 0;
        this.steeringAngle = 0;
        this.syncMeshWithBody();
    }
}

import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld';
import { InputManager } from './InputManager';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private physicsWorld: PhysicsWorld;
    private inputManager: InputManager;
    private clock: THREE.Clock;

    // atualização de objetos do jogo
    private updateCallbacks: ((delta: number) => void)[] = [];

    // objt que a camera deve seguir
    private cameraTarget: THREE.Object3D | null = null;
    private cameraOffset = new THREE.Vector3(0, 8, 12);

    constructor(container: HTMLElement) {
        // inicializa a cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        // configura a camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);

        // configura o renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // limita o pixelRatio para no max 2 ,melhora performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap; // mais rápido que PCFSoftShadowMap
        container.appendChild(this.renderer.domElement);

        this.physicsWorld = new PhysicsWorld();
        this.inputManager = new InputManager();

        // clock para delta time
        this.clock = new THREE.Clock();

        // configura iluminacao
        this.setupLighting();

        // evento de redimensionamento
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupLighting(): void {
        // luz ambiente
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // luz direcional (sol)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        // shadow map otimizado
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 200;
        // area de sombra menor = melhor qualidade e performance
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);

        // luz hemisferica para iluminacao mais natural
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
        this.scene.add(hemisphereLight);
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateCamera(): void {
        if (!this.cameraTarget) return;

        // posicao alvo da camera (atras e acima do carro)
        const targetPosition = this.cameraTarget.position.clone();
        const targetRotation = this.cameraTarget.rotation.y;

        // calcula offset rotacionado
        const offset = this.cameraOffset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);

        // suaviza o movimento da camera
        const desiredPosition = targetPosition.clone().add(offset);
        this.camera.position.lerp(desiredPosition, 0.05);

        // faz a camera olhar para o carro
        const lookAtPosition = targetPosition.clone();
        lookAtPosition.y += 1;
        this.camera.lookAt(lookAtPosition);
    }

    public setCameraTarget(target: THREE.Object3D): void {
        this.cameraTarget = target;
    }

    public setCameraOffset(offset: THREE.Vector3): void {
        this.cameraOffset = offset;
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    public getPhysicsWorld(): PhysicsWorld {
        return this.physicsWorld;
    }

    public getInputManager(): InputManager {
        return this.inputManager;
    }

    public addUpdateCallback(callback: (delta: number) => void): void {
        this.updateCallbacks.push(callback);
    }

    public start(): void {
        this.clock.start();
        this.gameLoop();
    }

    private gameLoop(): void {
        requestAnimationFrame(this.gameLoop.bind(this));

        const delta = this.clock.getDelta();

        // atualiza a física
        this.physicsWorld.update(delta);

        // executa callbacks de atualização
        for (const callback of this.updateCallbacks) {
            callback(delta);
        }

        // atualiza a camera
        this.updateCamera();

        // renderiza a cena
        this.renderer.render(this.scene, this.camera);
    }
}

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../core/PhysicsWorld';

export interface TrackOptions {
    width?: number;
    length?: number;
    groundColor?: number;
}

export class Track {
    
    private mesh: THREE.Group;
    private groundBody: CANNON.Body;
    private walls: CANNON.Body[] = [];

    constructor(
        scene: THREE.Scene, 
        physicsWorld: PhysicsWorld, 
        options: TrackOptions = {}
    ) {
        const width = options.width || 60;
        const length = options.length || 80;
        const groundColor = options.groundColor || 0x555555;

        this.mesh = new THREE.Group();
        scene.add(this.mesh);

        // cria o chao visual
        this.createGround(width, length, groundColor);

        // cria as paredes/bordas
        this.createWalls(width, length, physicsWorld);

        // cria o corpo fisico do chao
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0, // estatico
            shape: groundShape,
            type: CANNON.Body.STATIC,
        });
        this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

        // material do chao
        const groundMaterial = new CANNON.Material('ground');
        this.groundBody.material = groundMaterial;

        physicsWorld.addBody(this.groundBody);

        // add marcacoes na pista
        this.createRoadMarkings(width, length);

        // add decoracao
        this.createDecoration(width, length);
    }

    private createGround(width: number, length: number, color: number): void {
        // asfalto
        const groundGeometry = new THREE.PlaneGeometry(width, length);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.mesh.add(ground);

        // area verde ao redor
        const outerGroundGeometry = new THREE.PlaneGeometry(width * 2, length * 2);
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a8c3a,
            roughness: 1,
            metalness: 0,
        });
        const outerGround = new THREE.Mesh(outerGroundGeometry, grassMaterial);
        outerGround.rotation.x = -Math.PI / 2;
        outerGround.position.y = -0.01; // ligeiramente abaixo do asfalto
        outerGround.receiveShadow = true;
        this.mesh.add(outerGround);
    }

    private createWalls(width: number, length: number, physicsWorld: PhysicsWorld): void {
        const wallHeight = 1;
        const wallThickness = 0.5;

        // material visual para as paredes
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            roughness: 0.5,
        });

        // posicoes das 4 paredes
        const wallConfigs = [
            { pos: [0, wallHeight / 2, -length / 2], size: [width, wallHeight, wallThickness] }, // n
            { pos: [0, wallHeight / 2, length / 2], size: [width, wallHeight, wallThickness] }, // s
            { pos: [-width / 2, wallHeight / 2, 0], size: [wallThickness, wallHeight, length] }, // o
            { pos: [width / 2, wallHeight / 2, 0], size: [wallThickness, wallHeight, length] }, // l
        ];

        for (const config of wallConfigs) {
            // mesh visual
            const geometry = new THREE.BoxGeometry(config.size[0], config.size[1], config.size[2]);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(config.pos[0], config.pos[1], config.pos[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mesh.add(mesh);

            // corpo fisico
            const shape = new CANNON.Box(
                new CANNON.Vec3(config.size[0] / 2, config.size[1] / 2, config.size[2] / 2),
            );
            const body = new CANNON.Body({
                mass: 0,
                shape,
                position: new CANNON.Vec3(config.pos[0], config.pos[1], config.pos[2]),
            });
            physicsWorld.addBody(body);
            this.walls.push(body);
        }
    }

    private createRoadMarkings(width: number, length: number): void {
        const lineWidth = 0.3;
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
        });

        // linha central
        const dashLength = 3;
        const gapLength = 2;
        const totalDashes = Math.floor(length / (dashLength + gapLength));

        for (let i = 0; i < totalDashes; i++) {
            const lineGeometry = new THREE.PlaneGeometry(lineWidth, dashLength);
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.01, -length / 2 + dashLength / 2 + i * (dashLength + gapLength));
            this.mesh.add(line);
        }

        // linha lateral continua
        const sideLineGeometry = new THREE.PlaneGeometry(lineWidth, length);

        const leftLine = new THREE.Mesh(sideLineGeometry, lineMaterial);
        leftLine.rotation.x = -Math.PI / 2;
        leftLine.position.set(-width / 4, 0.01, 0);
        this.mesh.add(leftLine);

        const rightLine = new THREE.Mesh(sideLineGeometry, lineMaterial);
        rightLine.rotation.x = -Math.PI / 2;
        rightLine.position.set(width / 4, 0.01, 0);
        this.mesh.add(rightLine);
    }

    private createDecoration(width: number, length: number): void {
        // postes de luz
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffaa,
            emissive: 0xffffaa,
            emissiveIntensity: 0.3,
        });

        const postPositions = [
            [-width / 2 + 2, -length / 2 + 10],
            [-width / 2 + 2, 0],
            [-width / 2 + 2, length / 2 - 10],
            [width / 2 - 2, -length / 2 + 10],
            [width / 2 - 2, 0],
            [width / 2 - 2, length / 2 - 10],
        ];

        for (const [x, z] of postPositions) {
            // poste
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4);
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(x, 2, z);
            post.castShadow = true;
            this.mesh.add(post);

            // luminaria
            const lightGeometry = new THREE.SphereGeometry(0.3);
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(x, 4.2, z);
            this.mesh.add(light);

            // luz
            const pointLight = new THREE.PointLight(0xffffaa, 0.5, 15);
            pointLight.position.set(x, 4, z);
            pointLight.castShadow = true;
            this.mesh.add(pointLight);
        }
    }
}

/**
*  2221101018 - João John
**/
import * as THREE from 'three';
import { Game } from './core';
import { Car, Track, ObstacleManager, ParkingSpotManager } from './objects';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

// pontuacao
class ScoreManager {
    private score = 1000;
    private collisionCooldowns: Map<number, number> = new Map();
    private readonly cooldownTime = 1000; // 1 seg p descontar ponto por bater no msm objeto

    public getScore(): number {
        return this.score;
    }

    public penalize(obstacleId: number, type: 'cone' | 'box'): boolean {
        const now = Date.now();
        const lastCollision = this.collisionCooldowns.get(obstacleId) || 0;

        // validacao p n descontar ponto mt rapido do msm cone/caixa
        if (now - lastCollision < this.cooldownTime) {
            return false;
        }

        this.collisionCooldowns.set(obstacleId, now);

        // cone = -10, caixa = -25
        const penalty = type === 'cone' ? 10 : 25;
        this.score = Math.max(0, this.score - penalty);

        console.log(`parabens barbeiro -${penalty} pontos, pontuacao ${this.score}`);
        return true;
    }

    public reset(): void {
        this.score = 1000;
        this.collisionCooldowns.clear();
    }
}

// cria a interface do jogo
function createUI(): {
    statusElement: HTMLDivElement;
    instructionsElement: HTMLDivElement;
    winMessageElement: HTMLDivElement;
} {
    // UI base
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    app.appendChild(uiContainer);

    // instrucoes de controle
    const instructionsElement = document.createElement('div');
    instructionsElement.id = 'instructions';
    instructionsElement.innerHTML = `
    <h2>Estacionamento</h2>
    <p><strong>Objetivo:</strong> Vá do ponto PARTIDA até o ponto CHEGADA</p>
    <div class="controls">
      <p><strong>W / ⬆️ </strong> - Acelerar</p>
      <p><strong>S / ⬇️ </strong> - Ré</p>
      <p><strong>A / ⬅️ </strong> - Esquerda</p>
      <p><strong>D / ➡️ </strong> - Direita</p>
      <p><strong>Espaço</strong> - Freio</p>
    </div>
    <p class="penalty"> Cone: -10 pts <br>Caixa: -25 pts</p>
  `;
    uiContainer.appendChild(instructionsElement);

    // Status do jogo
    const statusElement = document.createElement('div');
    statusElement.id = 'status';
    statusElement.innerHTML = `
        <p>Velocidade: <span id="speed">0</span> km/h</p>
        <p>Pontuação: <span id="score">1000</span></p>
    `;
    uiContainer.appendChild(statusElement);

    // RESENHA contador de fps pq aq é foco na otimização
    const fpsElement = document.createElement('div');
    fpsElement.id = 'fps-counter';
    fpsElement.innerHTML = `FPS: <span id="fps">60</span>`;
    uiContainer.appendChild(fpsElement);

    // Mensagem de vitória
    const winMessageElement = document.createElement('div');
    winMessageElement.id = 'win-message';
    winMessageElement.innerHTML = `
        <h1>Parabéns</h1>
        <p>Ta igual torreto</p>
        <p>Pontuação final: <span id="final-score">1000</span></p>
        <button id="restart-btn">Jogar Novamente</button>
    `;
    winMessageElement.style.display = 'none';
    uiContainer.appendChild(winMessageElement);

    return { statusElement, instructionsElement, winMessageElement };
}

async function init() {
    // cria a UI
    const { winMessageElement } = createUI();

    // cria o container do jogo
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    app.appendChild(gameContainer);

    // inicializa de fato
    const game = new Game(gameContainer);
    const scene = game.getScene();
    const physicsWorld = game.getPhysicsWorld();
    const inputManager = game.getInputManager();

    const scoreManager = new ScoreManager();

    // pista a pista
    new Track(scene, physicsWorld, {
        width: 60,
        length: 80,
    });

    // pontos de partida e chegada
    const parkingSpotManager = new ParkingSpotManager(scene);
    parkingSpotManager.createSpots(
        new THREE.Vector3(0, 0, 35), // Ponto A (partida)
        new THREE.Vector3(0, 0, -35), // Ponto B (chegada)
    );

    // inicializa o carro no ponto A
    const car = new Car(scene, physicsWorld, {
        position: new THREE.Vector3(0, 0.5, 35),
    });

    // camera segue o carro
    game.setCameraTarget(car.getMesh());
    game.setCameraOffset(new THREE.Vector3(0, 10, 15));

    // cria os obstaculos
    const obstacleManager = new ObstacleManager(scene, physicsWorld);
    obstacleManager.createObstacleLayout();

    // colisoes
    const carBody = car.getBody();

    // listener p colisao
    const setupCollisionListeners = () => {
        const obstacles = obstacleManager.getObstacles();
        obstacles.forEach((obstacle, index) => {
            carBody.addEventListener('collide', (event: { body: unknown }) => {
                if (event.body === obstacle.getBody()) {
                    scoreManager.penalize(index, obstacle.getType());
                }
            });
        });
    };
    setupCollisionListeners();

    let gameWon = false;

    // callback de vitória
    parkingSpotManager.onFinish(() => {
        if (!gameWon) {
            gameWon = true;
            const finalScoreElement = document.getElementById('final-score');
            if (finalScoreElement) {
                finalScoreElement.textContent = scoreManager.getScore().toString();
            }
            winMessageElement.style.display = 'flex';
        }
    });

    // restart
    const restartBtn = document.getElementById('restart-btn');
    restartBtn?.addEventListener('click', () => {
        gameWon = false;
        winMessageElement.style.display = 'none';
        scoreManager.reset();
        car.reset(new THREE.Vector3(0, 0.5, 35));

        // recria todos os obstáculos
        obstacleManager.reset();

        // reconfigura os listeners de colisão
        setupCollisionListeners();
    });

    gameContainer.addEventListener('click', () => {
        gameContainer.focus();
    });

    // tonar o container focavel
    gameContainer.tabIndex = 0;
    gameContainer.focus();

    // FPS
    let frameCount = 0;
    let lastFpsUpdate = performance.now(); // ts na veia
    let currentFps = 60;

    // loop de att
    game.addUpdateCallback((delta) => {
        // att o carro
        const input = inputManager.getInputState();
        car.update(delta, input);

        // att obstáculos
        obstacleManager.update();

        // verifica posição do carro
        parkingSpotManager.checkCarPosition(car.getPosition());

        // FPS atualiza a cada 500ms
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate >= 500) {
            currentFps = Math.round(frameCount / ((now - lastFpsUpdate) / 1000));
            frameCount = 0;
            lastFpsUpdate = now;
        }

        // att UI
        const speedElement = document.getElementById('speed');
        if (speedElement) {
            const speedKmh = Math.abs(Math.round(car.getSpeed() * 3.6)); // converte m/s para km/h
            speedElement.textContent = speedKmh.toString();
        }

        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = scoreManager.getScore().toString();
        }

        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = currentFps.toString();
        }
    });

    // inicia o jogo
    game.start();
}

init().catch(console.error);

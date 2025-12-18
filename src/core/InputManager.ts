export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    brake: boolean;
}

export class InputManager {
    private keys: Set<string> = new Set();
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundOnKeyUp: (e: KeyboardEvent) => void;

    constructor() {
        // guarda referencias das funcoes bound
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.boundOnKeyUp = this.onKeyUp.bind(this);

        window.addEventListener('keydown', this.boundOnKeyDown);
        window.addEventListener('keyup', this.boundOnKeyUp);
    }

    private onKeyDown(event: KeyboardEvent): void {
        // previne scroll da pag com setas
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
        console.log('soltou')
        this.keys.add(event.code);
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.keys.delete(event.code);
    }

    public getInputState(): InputState {
        return {
            forward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
            backward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
            left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
            right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
            brake: this.keys.has('Space'),
        };
    }
}

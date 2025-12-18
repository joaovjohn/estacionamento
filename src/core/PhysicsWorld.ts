import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    private world: CANNON.World;
    private fixedTimeStep = 1 / 60;
    private maxSubSteps = 5; // Aumentado para melhor precisão

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);

        // configuracao de broadphase para melhor performance
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        // permite que objetos "durmam" quando parados
        this.world.allowSleep = true;

        // material padrao para o mundo
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            {
                friction: 0.3,
                restitution: 0.2,
            },
        );
        this.world.addContactMaterial(defaultContactMaterial);
        this.world.defaultContactMaterial = defaultContactMaterial;
    }

    public addBody(body: CANNON.Body): void {
        this.world.addBody(body);
    }

    public removeBody(body: CANNON.Body): void {
        this.world.removeBody(body);
    }

    public update(delta: number): void {
        this.world.step(this.fixedTimeStep, delta, this.maxSubSteps);
    }

    // 
    // public createContactMaterial(
    //     material1: CANNON.Material,
    //     material2: CANNON.Material,
    //     friction: number,
    //     restitution: number,
    // ): CANNON.ContactMaterial {
    //     const contactMaterial = new CANNON.ContactMaterial(material1, material2, {
    //         friction,
    //         restitution,
    //     });
    //     this.world.addContactMaterial(contactMaterial);
    //     return contactMaterial;
    // }
}

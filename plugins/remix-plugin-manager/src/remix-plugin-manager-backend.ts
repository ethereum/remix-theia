import * as theia from '@theia/plugin';
import { Engine, Plugin, PluginManager } from '@remixproject/engine';


export function start(context: theia.PluginContext) {
    const plugin = new RemixPlugin();

    const informationMessageTestCommand = {
        id: 'hello-world-example-generated',
        label: "Say Hello World"
    };
    context.subscriptions.push(theia.commands.registerCommand(informationMessageTestCommand, (...args: any[]) => {
        plugin.sayHello();
    }));
}

export function stop() {

}

class RemixPlugin {
    manager: PluginManager;
    engine: Engine;
    helloWorld: HelloWorldPlugin;
    active: boolean = false;

    constructor() {
        this.manager = new PluginManager();
        this.engine = new Engine();
        this.helloWorld = new HelloWorldPlugin();
        this.engine.register(this.manager);
        this.engine.register(this.helloWorld);
        this.manager.activatePlugin(this.helloWorld.name).then(res => {
            this.active = true;
            theia.window.showInformationMessage('PluginManager activated');
        });
    }

    sayHello() {
        this.manager.call('hello', 'helloWorld').then(greeting => theia.window.showInformationMessage(greeting));
    }
}

class HelloWorldPlugin extends Plugin {
    constructor() {
        super({ name: 'hello', methods: ["helloWorld"] })
    }

    helloWorld(): string {
        return 'hello from HelloWorldPlugin :)'
    }
}
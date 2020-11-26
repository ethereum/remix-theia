import * as theia from '@theia/plugin';
import { Engine, Plugin, PluginManager } from '@remixproject/engine';
import { FileManagerPlugin } from './lib/filemanager';


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
        const fileManager = new FileManagerPlugin
        this.engine.register([this.manager, fileManager]);
        this.engine.register(this.helloWorld);
        this.manager.activatePlugin([this.helloWorld.name, fileManager.name]).then(res => {
            this.active = true;
            theia.window.showInformationMessage('PluginManager activated');
        }).catch(error => theia.window.showInformationMessage('Error on plugin activation ' + error));
    }

    sayHello() {
        this.manager.call('hello', 'helloWorld').then(greeting => {
            const panel = theia.window.createWebviewPanel('testId', 'Test', theia.ViewColumn.One);
            panel.webview.html = '<html><head></head><body><h1>Test</h1></body></html>';
            const panel2 = theia.window.createWebviewPanel('testId2', 'Test2', theia.ViewColumn.Two);
            panel2.webview.html = '<html><head></head><body><h1>Two</h1></body></html>';
            theia.window.createWebviewPanel('testIdActive', 'TestActive', theia.ViewColumn.Active).webview.html = '<html><head></head><body><h1>Active</h1></body></html>';
            theia.window.createWebviewPanel('testIdBeside', 'TestBeside', theia.ViewColumn.Beside).webview.html = '<html><head></head><body><h1>Beside</h1></body></html>';
            theia.window.createWebviewPanel('testIdViewPort', 'TestViewPort', { area: theia.WebviewPanelTargetArea.Left }).webview.html = '<html><head></head><body><h1>ViewPort</h1></body></html>';

            theia.window.showInformationMessage(greeting)
            return this.manager.call('fileManager', 'getCurrentFile')
        }).then(file => {
            return theia.window.showInformationMessage('File content: ' + file)
        }).catch(error => {theia.window.showInformationMessage('Error occurred: ' + error)});
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
import * as theia from '@theia/plugin';
import { Engine, Plugin, PluginManager } from '@remixproject/engine';
import { FileManagerPlugin } from './lib/filemanager';
import { WebviewPlugin } from './lib/webview';


export function start(context: theia.PluginContext) {
    const plugin = new RemixPlugin(context);

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

const solidityProfile = {
    name: 'solidity',
    displayName: 'Solidity compiler',
    icon: 'https://solidity.readthedocs.io/en/v0.6.10/_images/logo.svg',
    description: 'Compile solidity contracts',
    kind: 'compiler',
    permission: true,
    location: 'sidePanel',
    documentation: 'https://remix-ide.readthedocs.io/en/latest/solidity_editor.html',
    version: '0.0.1',
    methods: ['getCompilationResult', 'compile', 'compileWithParameters', 'setCompilerConfig'],
    // url: 'ipfs://QmNgz8ecPPbdvjjzy1UfRTeuN5jN2fTeAJB93zU8FtFrqF'
    url: 'https://ipfsgw.komputing.org/ipfs/QmdtpU6puEJAHdedfsV6er1GpzfLPxZgiaTVdLnA65kx97/'
  };

  class RemixPlugin {
    manager: PluginManager;
    engine: Engine;
    helloWorld: HelloWorldPlugin;
    active: boolean = false;

    constructor(private context: theia.PluginContext) {
        this.engine = new Engine()
        this.manager = new PluginManager()
        this.helloWorld = new HelloWorldPlugin()
        const fileManager = new FileManagerPlugin()
        this.engine.register([this.manager, this.helloWorld, fileManager]);
        this.manager.activatePlugin([this.helloWorld.name, fileManager.name]).then(res => {
            this.active = true;
            theia.window.showInformationMessage('PluginManager activated');
        }).catch(error => theia.window.showInformationMessage('Error on plugin activation ' + error));
    }

    sayHello() {
        this.manager.call('hello', 'helloWorld').then(greeting => {
            const panel = theia.window.createWebviewPanel('testIdViewPort', 'TestViewPort', { area: theia.WebviewPanelTargetArea.Left })
            panel.webview.html = '<html><head></head><body><h1>ViewPort</h1></body></html>';

            theia.window.showInformationMessage(greeting)
            this.manager.call('fileManager', 'getCurrentFile')
            
            const webview = new WebviewPlugin(solidityProfile, {context:this.context});
            if (!this.engine.isRegistered(webview.name)){
                this.engine.register(webview)
            }
            
            return this.manager.activatePlugin(webview.name)
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
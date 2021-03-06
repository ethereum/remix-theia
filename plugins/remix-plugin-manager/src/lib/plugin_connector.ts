import { PluginConnector } from "@remixproject/engine";
import { ExternalProfile, Message, Profile } from "@remixproject/plugin-utils";
import * as theia from "@theia/plugin";

export class TheiaPluginConnector extends PluginConnector {
    private plugin: theia.Plugin<any>
    private connector: any

    constructor(profile: Profile & ExternalProfile) {
        super(profile)
    }

    protected send(message: Partial<Message>): void {
        if (this.plugin) {
            this.connector.onMessage(message)
        }
    }

    protected async connect(url: string): Promise<void> {
        try {
            const plugin = theia.plugins.getPlugin(url)
            if (plugin) {
                this.plugin = plugin
                this.connector = await this.plugin.activate()
            } else {
                throw new Error(`ExtensionPlugin "${this.profile.name}" could not connect to the engine.`)
            }
        } catch (err) {
            throw new Error(`ExtensionPlugin "${this.profile.name}" could not connect to the engine.`)
        }
    }

    protected disconnect(): void {
        if (this.plugin) { }
    }
}
import { PluginConnector, PluginConnectorOptions } from '@remixproject/engine'
import { Message, Profile, ExternalProfile, LocationProfile } from '@remixproject/plugin-utils'
import * as theia from '@theia/plugin';
import { join, isAbsolute, parse as parsePath } from 'path'
import { promises as fs, watch } from 'fs'
import { get } from 'https'
import { parse as parseUrl } from 'url'

interface WebviewOptions extends PluginConnectorOptions {
  /** Extension Path */
  context: theia.PluginContext
  relativeTo?: 'workspace' | 'extension'
  column?: theia.ViewColumn | theia.WebviewPanelShowOptions
  devMode?: boolean
}

export class WebviewPlugin extends PluginConnector {
  private listeners: theia.Disposable[] = [];
  panel?: theia.WebviewPanel
  options: WebviewOptions

  constructor(profile: Profile & ExternalProfile, options: WebviewOptions, private deactivationCallback?: () => void) {
    super(profile)
    this.setOptions(options)
  }

  setOptions(options: Partial<WebviewOptions>) {
    super.setOptions(options)
  }

  protected send(message: Partial<Message>): void {
    if (this.panel) {
      this.panel.webview.postMessage(message)
    }
  }

  protected connect(url: string): void {
    if (this.options.context) {
      this.panel = this.createWebview(this.profile, url, this.options)
      this.listeners = [
        this.panel.webview.onDidReceiveMessage(msg => { this.getMessage(msg) }),
        this.panel.onDidDispose(_ => {
          if (this.deactivationCallback) {
            this.deactivationCallback();
          }
        }),
        this.panel,
      ]
    } else {
      throw new Error(`WebviewPlugin "${this.name}" `)
    }
  }

  protected disconnect(): void {
    this.listeners.forEach(disposable => disposable.dispose());
  }

  isHttpSource(protocol: string | null) {
    if (!protocol) {
      return false
    }
    return protocol === 'https:' || protocol === 'http:'
  }


  /** Create a webview */
  createWebview(profile: Profile, url: string, options: WebviewOptions) {
    const { protocol, path } = parseUrl(url)
    const isRemote = this.isHttpSource(protocol)

    if (isRemote) {
      return this.remoteHtml(url, profile, options)
    } else {
      const relativeTo = options.relativeTo || 'extension';
      let fullPath: string = '';
      if (path && isAbsolute(path)) {
        fullPath = path
      } else if (relativeTo === 'extension') {
        const { extensionPath } = options.context;
        if (path) {
          fullPath = join(extensionPath, path);
        } else {
          fullPath = extensionPath;
        }
      } else if (relativeTo === 'workspace' && theia.workspace.workspaceFolders) {
        const root = theia.workspace.workspaceFolders[0]?.uri.fsPath;
        if (!root) {
          throw new Error('No open workspace. Cannot find url of relative path: ' + path)
        }
        fullPath = path ? join(root, path) : root;
      }
      return this.localHtml(fullPath, profile, options)
    }
  }

  ///////////////
  // LOCAL URL //
  ///////////////
  /** Create panel webview based on local HTML source */
  localHtml(url: string, profile: Profile, options: WebviewOptions) {
    const { ext } = parsePath(url)
    const baseUrl = ext === '.html' ? parsePath(url).dir : url

    const panel = this.createWebviewPanel(profile, options, [theia.Uri.file(baseUrl)])
    this.setLocalHtml(panel.webview, baseUrl)

    // Devmode
    if (options.devMode) {
      const index = join(baseUrl, 'index.html')
      watch(index).on('change', _ => this.setLocalHtml(panel.webview, baseUrl))
    }
    return panel
  }

  private createWebviewPanel(profile: Profile, options: WebviewOptions, localResourceRoots: ReadonlyArray<theia.Uri>) {
    var column: any = options.column;
    if (!column) {
      const location = (profile as unknown as LocationProfile).location
      if (location) {
        switch (location) {
          case 'sidePanel':
            column = { area: theia.WebviewPanelTargetArea.Left }
            break;
          case 'mainPanel':
            column = { area: theia.WebviewPanelTargetArea.Main }
            break;
          default:
            theia.window.showInformationMessage('Given location for plugin ' + profile.displayName + ' is unknown: ' + location)
            break;
        }
      }
    }
    if (!column) {
      column = theia.window.activeTextEditor?.viewColumn || theia.ViewColumn.One
    }
    const panel = theia.window.createWebviewPanel(
      profile.name,
      profile.displayName || profile.name,
      column,
      { enableScripts: true, localResourceRoots: localResourceRoots }

    )
    if ('icon' in profile) {
      try {
        panel.iconPath = theia.Uri.parse(profile['icon']);
      } catch (e) {
        theia.window.showErrorMessage('Uri for the icon of the plugin is not valid: ' + JSON.stringify(e))
      }
    }
    return panel;
  }

  /** Get code from local source */
  async setLocalHtml(webview: theia.Webview, baseUrl: string) {
    const index = `${baseUrl}/index.html`

    // Get all links from "src" & "href"
    const matchLinks = /(href|src)="([^"]*)"/g

    // Vscode requires URI format from the extension root to work
    const toUri = (original: any, prefix: 'href' | 'src', link: string) => {
      // For: <base href="#" /> && remote url : <link href="https://cdn..."/>
      const isRemote = this.isHttpSource(parseUrl(link).protocol)
      if (link === '#' || isRemote) {
        return original
      }
      // For scripts & links
      const path = join(baseUrl, link)
      const uri = theia.Uri.file(path)

      return `${prefix}="${webview['asWebviewUri'](uri)}"`
    }

    const html = await fs.readFile(index, 'utf-8')
    const finalHtml = this.addPostMessageWorkaround(html.replace(matchLinks, toUri))
    webview.html = finalHtml
  }

  ////////////////
  // REMOTE URL //
  ////////////////
  /** Create panel webview based on remote HTML source */
  remoteHtml(url: string, profile: Profile, options: WebviewOptions) {
    const { ext } = parsePath(url)
    var baseUrl = ext === '.html' ? parsePath(url).dir : url
    const panel = this.createWebviewPanel(profile, options, [])
    this.setRemoteHtml(panel.webview, baseUrl)
    return panel
  }

  /** Fetch remote ressource with http */
  fetch(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      get(url, res => {
        let text = ''
        res.on('data', data => text += data)
        res.on('end', (_: any) => resolve(text))
        res.on('error', err => reject(err))
      })
    })
  }

  /** Get code from remote source */
  async setRemoteHtml(webview: theia.Webview, baseUrl: string) {
    const matchLinks = /(href|src)="([^"]*)"/g
    const index = `${baseUrl}/index.html`


    // Vscode requires URI format from the extension root to work
    const toRemoteUrl = (original: any, prefix: 'href' | 'src', link: string) => {
      const isRemote = this.isHttpSource(parseUrl(link).protocol)
      if (link === '#' || isRemote) {
        return original
      }
      // For scripts & links
      var path = join(baseUrl, link)
      if (path.startsWith('https:/') && !path.startsWith('https://')) {
        path = 'https://' + path.substring('https:/'.length)
      }
      theia.window.showInformationMessage('joined link to ' + path)
      return `${prefix}="${path}"`
    }

    const html = await this.fetch(index)
    const finalHtml = this.addPostMessageWorkaround(html.replace(matchLinks, toRemoteUrl))
    webview.html = finalHtml
  }

  addPostMessageWorkaround(html: string): string {
    return html.replace('<head>', `<head>
  <script type="text/javascript">
  'use strict';
  var vsCodeAPI = undefined
  if (acquireVsCodeApi) {
    window.acquireVsCodeApi = ()=>{vsCodeAPI=acquireVsCodeApi(); window.acquireVsCodeApi = () => {return vsCodeAPI;}; return vsCodeAPI;}
    if (!window.parent) {
      window.parent = {postMessage: function(data, domain) {window.acquireVsCodeApi().postMessage(data, domain)}}
    }
  }
  </script>
  `)
  }
}
import { PluginConnector, PluginConnectorOptions } from '@remixproject/engine'
import { Message, Profile, ExternalProfile } from '@remixproject/plugin-utils'
import * as theia from '@theia/plugin';
import { join, isAbsolute, parse as parsePath } from 'path'
import { promises as fs, watch } from 'fs'
// import { get } from 'https'
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

  constructor(profile: Profile & ExternalProfile, options: WebviewOptions) {
    super(profile)
    this.setOptions(options)
  }

  setOptions(options: Partial<WebviewOptions>) {
    super.setOptions(options)
  }

  protected send(message: Partial<Message>): void {
    if (this.panel) {
      theia.window.showInformationMessage('XXX: Send message to the webview '+JSON.stringify(message))
      this.panel.webview.postMessage(message)
    }
  }
  handshake() {
    theia.window.showInformationMessage('XXX: Handshake started')
    return super.handshake()
  }

  protected connect(url: string): void {
    // theia.window.showInformationMessage('XXX: >>> Connect')
    if (this.options.context) {
      this.panel = createWebview(this.profile, url, this.options)
      // theia.window.showInformationMessage('XXX: Connect to ' + url)
      this.listeners = [
        this.panel.webview.onDidReceiveMessage(msg => { theia.window.showInformationMessage('XXX: Got message from the webview'); this.getMessage(msg) }),
        this.panel.onDidDispose(_ => this.call('manager', 'deactivatePlugin', this.name)),
        this.panel,
      ]
    } else {
      throw new Error(`WebviewPlugin "${this.name}" `)
    }
  }

  protected disconnect(): void {
    this.listeners.forEach(disposable => disposable.dispose());
  }

}

function isHttpSource(protocol: string | null) {
  if (!protocol) {
    return false
  }
  return protocol === 'https:' || protocol === 'http:'
}


/** Create a webview */
export function createWebview(profile: Profile, url: string, options: WebviewOptions) {
  const { protocol, path } = parseUrl(url)
  const isRemote = isHttpSource(protocol)

  if (isRemote) {
    // theia.window.showInformationMessage('remote connection')
    return remoteHtml(url, profile, options)
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
    return localHtml(fullPath, profile, options)
  }
}

///////////////
// LOCAL URL //
///////////////
/** Create panel webview based on local HTML source */
function localHtml(url: string, profile: Profile, options: WebviewOptions) {
  const { ext } = parsePath(url)
  const baseUrl = ext === '.html' ? parsePath(url).dir : url

  const panel = theia.window.createWebviewPanel(
    profile.name,
    profile.displayName || profile.name,
    options.column || theia.window.activeTextEditor?.viewColumn || theia.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [theia.Uri.file(baseUrl)]
    }
  )
  setLocalHtml(panel.webview, baseUrl)

  // Devmode
  if (options.devMode) {
    const index = join(baseUrl, 'index.html')
    watch(index).on('change', _ => setLocalHtml(panel.webview, baseUrl))
  }
  return panel
}

/** Get code from local source */
async function setLocalHtml(webview: theia.Webview, baseUrl: string) {
  const index = `${baseUrl}/index.html`

  // Get all links from "src" & "href"
  const matchLinks = /(href|src)="([^"]*)"/g

  // Vscode requires URI format from the extension root to work
  const toUri = (original: any, prefix: 'href' | 'src', link: string) => {
    // For: <base href="#" /> && remote url : <link href="https://cdn..."/>
    const isRemote = isHttpSource(parseUrl(link).protocol)
    if (link === '#' || isRemote) {
      theia.window.showInformationMessage('XXX: Found remote from ' + baseUrl)
      return original
    }
    // For scripts & links
    const path = join(baseUrl, link)
    const uri = theia.Uri.file(path)
    theia.window.showInformationMessage('XXX: Found internal link from ' + baseUrl)

    return `${prefix}="${webview['asWebviewUri'](uri)}"`
  }

  const html = await fs.readFile(index, 'utf-8')
  theia.window.showInformationMessage('XXX: Found html from ' + baseUrl)
  webview.html = html.replace(matchLinks, toUri)
}




////////////////
// REMOTE URL //
////////////////
/** Create panel webview based on remote HTML source */
function remoteHtml(url: string, profile: Profile, options: WebviewOptions) {
  const { ext } = parsePath(url)
  const baseUrl = ext === '.html' ? parsePath(url).dir : url
  const panel = theia.window.createWebviewPanel(
    profile.name,
    profile.displayName || profile.name,
    options.column || theia.window.activeTextEditor?.viewColumn || theia.ViewColumn.One,
    { enableScripts: true }
  )
  setRemoteHtml(panel.webview, baseUrl)
  return panel
}



/** Fetch remote ressource with http */
// function fetch(url: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         get(url, res => {
//             let text = ''
//             res.on('data', data => text += data)
//             res.on('end', (_: any) => resolve(text))
//             res.on('error', err => reject(err))
//         })
//     })
// }


/** Get code from remote source */
async function setRemoteHtml(webview: theia.Webview, baseUrl: string) {
  // const matchLinks = /(href|src)="([^"]*)"/g
  // const index = `${baseUrl}/index.html`


  // // Vscode requires URI format from the extension root to work
  // const toRemoteUrl = (original: any, prefix: 'href' | 'src', link: string) => {
  //   // For: <base href="#" /> && remote url : <link href="https://cdn..."/>
  //   const isRemote = isHttpSource(parseUrl(link).protocol)
  //   if (link === '#' || isRemote) {
  //     //theia.window.showInformationMessage('XXX: Remote connection: ' + original)
  //     return original
  //   }
  //   // For scripts & links
  //   const path = join(baseUrl, link)
  //   theia.window.showInformationMessage('XXX: Connection to: ' + `${prefix}="${path}"`)
  //   return `${prefix}="${path}"`
  // }

  // theia.window.showInformationMessage('XXX: fetch html '+index)

  // const response = fetch(index,{mode: "cors",method: "get", redirect: "follow", cache:"no-cache", headers: {Accept: 'text/html',
  //   'Content-Type': 'text/html'}})
  // theia.window.showInformationMessage('Response '+(await response).status)
  // const text = response.then((html) => {
  //   theia.window.showInformationMessage('XXX: fetch text is '+html?.ok)
  //   if (!html) {
  //     return undefined;
  //   }
  //   return html.text()
  // }, (e)=>theia.window.showInformationMessage('XXX: fetch failed  '+e))
  // text.then(text =>{
  //   if (!text) {
  //     theia.window.showInformationMessage('XXX: text content is undefined')
  //     return undefined
  //   }
  //   webview.html = text.replace(matchLinks, toRemoteUrl)
  //   theia.window.showInformationMessage('XXX: Setting html content: ' + text.replace(matchLinks, toRemoteUrl))
  // }, e=>theia.window.showInformationMessage('XXX: fetch failed  '+e));


  // <script src="main.js"></script>
  // <script src="host.js"></script>
  webview.html = `<html><head>
  </head><body><iframe id="content" sandbox="allow-scripts allow-same-origin" src="${baseUrl}" title="External content" width="100%" height="100%"></iframe>
  <script>
      vscodeAPI = acquireVsCodeApi();

      iframe = document.getElementById('content');
      'use strict';

      iframe.contentWindow.addEventListener('message', function(evt) {
        if (evt.data['from_theia_webview']) {
          console.log('Got own message from Iframe: '+JSON.stringify(evt.data));
          return;
        }
          console.log('Got message from Iframe: '+JSON.stringify(evt.data));
          vscodeAPI.postMessage(evt.data);
      });

      window.addEventListener('message', function(evt) {
        console.log('Got message from theia: '+JSON.stringify(evt.data));
        const data = evt.data;
        data['from_theia_webview'] = true;
        iframe.contentWindow.postMessage(evt.data)
      });
      

  </script>
  </body></html>`
}
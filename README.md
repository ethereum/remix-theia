# Theia Remix Extension

An extension for the Theia-IDE to support [Remix](https://remix-ide.readthedocs.io/en/latest/) [IFrame plugins](https://github.com/ethereum/remix-plugin).

## Getting started

The plugin requires a [Theia IDE](https://theia-ide.org) with plugin extensions enabled.

Setup and start the [Quick start example browser](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#quick-start)

Press `F1` and enter `Plugin: Deploy plugin by ID`.

Install the plugin by URL https://github.com/ethereum/remix-theia/releases/download/latest/remix_plugin_manager.theia.

Open the plugins by pressing F1 and type `Toggle remix plugin` to show the remix plugins on the left side, or `Compile with solidity` to compile the [solidity](https://docs.soliditylang.org) contract in the current editor.

# Development

Install [nvm](https://github.com/creationix/nvm#install-script).

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

Install npm and node.

    nvm install 12
    nvm use 12

Install yarn.

    npm install -g yarn

## Running theia

    yarn install

    yarn theia start

Open http://localhost:3000 in the browser.

Start Hosted instance with plugin enabled by pressing `F1`and choose `Plugin: Hosted Instance` and select `plugin/remix-plugin-manager` as folder.

Start watching of the plugin manager.

    cd plugins/remix-plugin-manager
    yarn watch

## Publishing Remix Plugin Manager

Each release triggers a build on github.
The resulting draft can be published and is available at https://github.com/ethereum/remix-theia/releases/download/latest/remix_plugin_manager.theia.


	
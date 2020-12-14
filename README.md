# Theia Remix Extension

An extension for the Theia-IDE to support [Remix](https://remix-ide.readthedocs.io/en/latest/) [IFrame plugins](https://github.com/ethereum/remix-plugin).

## Getting started

The plugin requires a [Theia IDE](https://theia-ide.org) with plugin extensions enabled.

Setup and start the [Quick start example browser](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#quick-start)

Press `F1` and enter `Plugin: Deploy plugin by ID`.

Install the plugin by URL https://github.com/ethereum/remix-theia/releases/download/latest/remix_plugin_manager.theia.

Open the plugins by pressing F1 and type `Toggle remix plugin` to show the remix plugins on the left side, or `Compile with solidity` to compile the [solidity](https://docs.soliditylang.org) contract in the current editor.

## Publishing Remix Plugin Manager

Each release triggers a build on github.
The resulting draft can be published and is available at https://github.com/ethereum/remix-theia/releases/download/latest/remix_plugin_manager.theia.


	
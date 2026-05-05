# @boardgame-kit/react

Composable React primitives for building custom card and board game interfaces.

## Install

```sh
npm install @boardgame-kit/react
```

The package name is prepared for npm publishing. Change the scope/name in `package.json` before publishing if you want to use a different npm account or organization.

## Usage

```tsx
import { Board, Deck, Hand, Zone } from '@boardgame-kit/react';
import '@boardgame-kit/react/styles.css';
```

The package exports card, token, dice, zone, board, drag layer, controller, and generic game kit primitives.

## Local Development

From the workspace root:

```sh
npm run dev
npm run build
npm run pack:kit
```

`npm run pack:kit` builds the package and creates a local npm tarball that can be installed from another project.

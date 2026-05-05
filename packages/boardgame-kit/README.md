# @vlvethund/boardgame-kit

Composable React primitives for building custom card and board game interfaces.

## Install

```sh
npm install @vlvethund/boardgame-kit
```

The package name is prepared for npm publishing. Change the scope/name in `package.json` before publishing if you want to use a different npm account or organization.

## Usage

```tsx
import { Board, Deck, Hand, Zone } from '@vlvethund/boardgame-kit';
import '@vlvethund/boardgame-kit/styles.css';
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

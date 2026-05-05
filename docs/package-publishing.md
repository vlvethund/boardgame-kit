# 패키지 분리 및 npm 배포 준비

작성일: 2026-05-05

## 현재 구조

```txt
new-chat/
  packages/
    boardgame-kit/
      src/
      dist/
      package.json
      tsconfig.json
      vite.config.ts
  apps/
    demo/
      src/
      package.json
      tsconfig.json
      vite.config.ts
  docs/
  package.json
```

## 패키지

라이브러리 패키지:

```txt
packages/boardgame-kit
```

패키지 이름:

```txt
@boardgame-kit/react
```

실제 npm publish 전에 본인 npm 계정/scope에 맞게 이름을 바꿀 수 있다.

데모 앱은 로컬 개발 중 패키지를 이렇게 참조한다.

```json
{
  "@boardgame-kit/react": "file:../../packages/boardgame-kit"
}
```

Vite 개발 서버에서는 `apps/demo/vite.config.ts`의 alias로 `packages/boardgame-kit/src`를 직접 바라본다. 그래서 패키지를 매번 빌드하지 않아도 데모에서 즉시 수정사항을 확인할 수 있다.

## Exports

`packages/boardgame-kit/package.json`에서 다음 entry를 제공한다.

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css",
    "./package.json": "./package.json"
  }
}
```

사용 예시:

```tsx
import { Board, Deck, Hand, Zone } from '@boardgame-kit/react';
import '@boardgame-kit/react/styles.css';
```

## 빌드 명령

루트에서 실행한다.

```sh
npm run build
```

패키지만 빌드:

```sh
npm run build:kit
```

데모만 빌드:

```sh
npm run build:demo
```

## 로컬 tarball 생성

```sh
npm run pack:kit
```

현재 생성되는 파일:

```txt
boardgame-kit-react-0.1.0.tgz
```

다른 프로젝트에서 테스트 설치:

```sh
npm install /absolute/path/to/boardgame-kit-react-0.1.0.tgz
```

## npm publish 전 체크리스트

- `packages/boardgame-kit/package.json`의 `name`을 실제 사용할 npm 이름으로 확정한다.
- `version`을 올린다.
- `license`, `description`, `repository`, `keywords`, `author`를 채운다.
- `README.md`를 외부 사용자 기준으로 보강한다.
- `npm run build`가 통과하는지 확인한다.
- `npm run pack:kit`로 tarball 내용에 `dist`, `README.md`, `package.json`만 들어가는지 확인한다.
- 실제 배포 시 scoped package라면 `npm publish --access public`을 사용한다.

## 현재 검증 상태

2026-05-05 기준:

- `npm install` 완료
- `npm run build` 통과
- `npm run pack:kit` 통과
- ESM import / CJS require smoke test 통과
- tarball에 ESM, CJS, `.d.ts`, `styles.css`, README 포함 확인

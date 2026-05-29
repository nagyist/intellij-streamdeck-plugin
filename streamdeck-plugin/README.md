# Stream Deck JavaScript plugin for JetBrains IDE

A StreamDeck plugin to control your JetBrains IDE

**Live development:** `refreshPlugin.sh` auto-packages and deploys to the Stream Deck app.
**Debug URL:** `http://localhost:23654/`

View Stream Deck plugin's Debug Log: `viewLog.sh`

## Generate a New Action

Use `scripts/generate-action.js` to scaffold a new Stream Deck action from a single SVG icon. It produces the PNG assets, manifest entry, TypeScript action class, and `IdeaPlugin` registration in a single step.



Icons can be searched for or downloaded from [https://intellij-icons.jetbrains.design/](https://intellij-icons.jetbrains.design/), recommend the dark style icon.

### Prerequisites

Install [`sharp`](https://www.npmjs.com/package/sharp) (SVG → PNG rasterizer) once:

```bash
npm i -D sharp
```

### CLI Usage

```bash
node scripts/generate-action.js <ActionId> "<ActionTitle>" <path/to/icon.svg> [UUID]
```

| Argument      | Required | Example                              | Notes                                                                                |
|---------------|----------|--------------------------------------|--------------------------------------------------------------------------------------|
| `ActionId`    | yes      | `Debugger.PopFrame`                  | IDE action ID. Last segment becomes the TS class name and file name.                 |
| `ActionTitle` | yes      | `"Reset Frame"`                      | Used for both `Name` and `Tooltip` in `manifest.json`.                               |
| `icon.svg`    | yes      | `./popFrame_dark.svg`                | Source vector icon. Its basename becomes the icon asset name (e.g. `popFrame_dark`). |
| `UUID`        | no       | `com.jetbrains.idea.action.pop.frame`| Optional override. Auto-derived if omitted; pass explicitly to match existing convention. |

### Examples

```bash
# Auto-derived UUID (com.jetbrains.idea.action.debugger.pop.frame)
node scripts/generate-action.js Debugger.PopFrame "Reset Frame" ./popFrame_dark.svg

# Explicit UUID
node scripts/generate-action.js StepInto "Step Into" ./stepInto_dark.svg com.jetbrains.idea.action.step.into
```

### Programmatic Usage

```js
const { ActionGenerator } = require('./scripts/generate-action');

await new ActionGenerator({
  actionId:    'Debugger.PopFrame',
  actionTitle: 'Reset Frame',
  svgPath:     './popFrame_dark.svg',
  uuid:        'com.jetbrains.idea.action.pop.frame', // optional
}).generate();
```

### What It Generates

- `com.jetbrains.ide.sdPlugin/icons/actions/<iconBase>.png` (72×72) and `<iconBase>_2x.png` (144×144)
- `com.jetbrains.ide.sdPlugin/icons/<iconBase>.png` and `<iconBase>_2x.png` (copies)
- New entry appended to `com.jetbrains.ide.sdPlugin/manifest.json` `Actions[]`
- New `src/actions/<kebab>-action.ts` extending `DefaultAction`
- `import` + `new <ClassName>Action(this, '<UUID>')` injected into `src/idea-plugin.ts`

### Naming Rules

| Input                       | Derivation                                   | Result               |
|-----------------------------|----------------------------------------------|----------------------|
| `ActionId` last segment     | PascalCase + `Action`                        | `PopFrameAction`     |
| `ActionId` last segment     | kebab-case + `-action.ts`                    | `pop-frame-action.ts`|
| SVG filename minus ext      | used as-is                                   | `popFrame_dark`      |
| `ActionId` (if no UUID arg) | `com.jetbrains.idea.action.<dot.lowered.id>` | `...pop.frame`       |

### Safety

The script refuses to overwrite. It throws if:

- The target UUID already exists in `manifest.json`
- The target `src/actions/<kebab>-action.ts` already exists

Run `npm run build` afterwards to compile and bundle the new action.

More info please check [CLAUDE.md](CLAUDE.md)
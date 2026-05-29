/*
 * Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
 *
 * Helper to scaffold a new Stream Deck action for the JetBrains IDE plugin.
 *
 * Usage (CLI):
 *   node scripts/generate-action.js <ActionId> "<ActionTitle>" <path/to/icon.svg> [UUID]
 *
 * Example:
 *   # npm i -D sharp
node ./scripts/generate-action.js ActivateTerminalToolWindow "Terminal" ./terminal_dark.svg com.jetbrains.idea.action.terminal.toolwindow
 *
 * Requires: npm i -D sharp
 */

const fs = require('fs');
const path = require('path');

class ActionGenerator {
  /**
   * @param {object} opts
   * @param {string} opts.actionId       IDE action ID, e.g. "Debugger.PopFrame"
   * @param {string} opts.actionTitle    Human title, e.g. "Reset Frame"
   * @param {string} opts.svgPath        Path to source SVG (absolute or relative to cwd)
   * @param {string} [opts.uuid]         Stream Deck UUID; auto-derived if omitted
   * @param {string} [opts.projectRoot]  streamdeck-plugin root (default: parent of this script's dir)
   */
  constructor(opts) {
    if (!opts.actionId)    throw new Error('actionId required');
    if (!opts.actionTitle) throw new Error('actionTitle required');
    if (!opts.svgPath)     throw new Error('svgPath required');

    this.actionId    = opts.actionId;
    this.actionTitle = opts.actionTitle;
    this.svgPath     = path.resolve(opts.svgPath);
    this.projectRoot = opts.projectRoot || path.resolve(__dirname, '..');

    this.iconBase = path.basename(this.svgPath, path.extname(this.svgPath)); // e.g. popFrame_dark
    this.uuid     = opts.uuid || this._deriveUuid(this.actionId);
    this.className = this._toPascalCase(this.actionId) + 'Action';        // PopFrameAction
    this.fileBase  = this._toKebabCase(this.actionId) + '-action';          // pop-frame-action

    this.iconsActionsDir = path.join(this.projectRoot, 'com.jetbrains.ide.sdPlugin', 'icons', 'actions');
    this.iconsDir        = path.join(this.projectRoot, 'com.jetbrains.ide.sdPlugin', 'icons');
    this.manifestPath    = path.join(this.projectRoot, 'com.jetbrains.ide.sdPlugin', 'manifest.json');
    this.actionTsPath    = path.join(this.projectRoot, 'src', 'actions', `${this.fileBase}.ts`);
    this.pluginTsPath    = path.join(this.projectRoot, 'src', 'idea-plugin.ts');
  }

  async generate() {
    if (!fs.existsSync(this.svgPath)) throw new Error(`SVG not found: ${this.svgPath}`);
    await this._generatePngs();
    this._updateManifest();
    this._writeActionTs();
    this._updateIdeaPlugin();
    return {
      uuid: this.uuid,
      className: this.className,
      iconBase: this.iconBase,
      files: {
        png72:    path.join(this.iconsActionsDir, `${this.iconBase}.png`),
        png144:   path.join(this.iconsActionsDir, `${this.iconBase}_2x.png`),
        png72b:   path.join(this.iconsDir,        `${this.iconBase}.png`),
        png144b:  path.join(this.iconsDir,        `${this.iconBase}_2x.png`),
        actionTs: this.actionTsPath,
        manifest: this.manifestPath,
        plugin:   this.pluginTsPath,
      },
    };
  }

  async _generatePngs() {
    let sharp;
    try { sharp = require('sharp'); }
    catch (e) { throw new Error('sharp not installed. Run: npm i -D sharp'); }

    fs.mkdirSync(this.iconsActionsDir, { recursive: true });
    fs.mkdirSync(this.iconsDir,        { recursive: true });

    const svgBuf = fs.readFileSync(this.svgPath);
    const targets = [
      { size: 72,  name: `${this.iconBase}.png` },
      { size: 144, name: `${this.iconBase}_2x.png` },
    ];
    for (const t of targets) {
      const png = await sharp(svgBuf, { density: 384 })
        .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      fs.writeFileSync(path.join(this.iconsActionsDir, t.name), png);
      fs.writeFileSync(path.join(this.iconsDir,        t.name), png);
    }
  }

  _updateManifest() {
    const raw = fs.readFileSync(this.manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    if (!Array.isArray(manifest.Actions)) throw new Error('manifest.json missing Actions array');

    if (manifest.Actions.some(a => a.UUID === this.uuid)) {
      throw new Error(`UUID already exists in manifest: ${this.uuid}`);
    }

    manifest.Actions.push({
      Icon: `icons/actions/${this.iconBase}`,
      Name: this.actionTitle,
      States: [{ Image: `icons/${this.iconBase}` }],
      Tooltip: this.actionTitle,
      SupportedInMultiActions: true,
      UUID: this.uuid,
    });
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  _writeActionTs() {
    if (fs.existsSync(this.actionTsPath)) {
      throw new Error(`Action file already exists: ${this.actionTsPath}`);
    }
    const titleEscaped = this.actionTitle.replace(/"/g, '\\"');
    const content =
`/*
 * Copyright 2000-${new Date().getFullYear()} JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
 */

import {DefaultAction} from "./default-action";

export class ${this.className} extends DefaultAction<${this.className}> {
  actionId(): string {
    return "${this.actionId}";
  }

  actionTitle(): string {
    return "${titleEscaped}";
  }
}
`;
    fs.writeFileSync(this.actionTsPath, content);
  }

  _updateIdeaPlugin() {
    let src = fs.readFileSync(this.pluginTsPath, 'utf8');

    const importLine = `import {${this.className}} from "./actions/${this.fileBase}";`;
    if (!src.includes(importLine)) {
      const lastImportIdx = src.lastIndexOf('import ');
      const lineEnd = src.indexOf('\n', lastImportIdx);
      src = src.slice(0, lineEnd + 1) + importLine + '\n' + src.slice(lineEnd + 1);
    }

    const registerLine = `    new ${this.className}(this, '${this.uuid}');`;
    if (!src.includes(`new ${this.className}(`)) {
      src = src.replace(/(\n\s*\}\s*\n\}\s*\n)/, `\n${registerLine}\n  }\n}\n`);
    }
    fs.writeFileSync(this.pluginTsPath, src);
  }

  _deriveUuid(actionId) {
    const tail = actionId
      .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
      .replace(/\./g, '.')
      .toLowerCase();
    return `com.jetbrains.idea.action.${tail}`;
  }

  _toPascalCase(actionId) {
    const last = actionId.split('.').pop();
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  _toKebabCase(actionId) {
    return actionId
      .split('.').pop()
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }
}

module.exports = { ActionGenerator };

if (require.main === module) {
  const [, , actionId, actionTitle, svgPath, uuid] = process.argv;
  if (!actionId || !actionTitle || !svgPath) {
    console.error('Usage: node scripts/generate-action.js <ActionId> "<ActionTitle>" <icon.svg> [UUID]');
    process.exit(1);
  }
  new ActionGenerator({ actionId, actionTitle, svgPath, uuid })
    .generate()
    .then(r => {
      console.log('Generated action:');
      console.log(JSON.stringify(r, null, 2));
    })
    .catch(e => { console.error(e.message); process.exit(1); });
}

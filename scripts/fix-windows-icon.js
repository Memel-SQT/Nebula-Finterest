// electron-builder's NSIS build only embeds build/icon.ico into the app exe when
// build.win.signAndEditExecutable is true, because icon embedding and code signing
// share the same rcedit-driven step. That setting is false here because rcedit's
// distribution package (winCodeSign) fails to extract without symlink privilege on
// Windows machines without Developer Mode / admin rights (see DEV_CHANGES.md).
//
// rcedit itself has no symlinks and works fine standalone, so this script patches
// the icon directly onto the already-packaged win-unpacked exe, then asks
// electron-builder to re-run just the NSIS step against that patched folder
// (--prepackaged), without needing signAndEditExecutable or a full rebuild.
//
// Runs automatically as the last step of `npm run dist:win`; harmless no-op on
// non-Windows hosts or if rcedit can't be obtained (packaging still succeeds,
// just without this extra icon fix-up).
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

const OUTPUT_DIR = path.join(__dirname, '..', 'install', 'windows');
const UNPACKED_DIR = path.join(OUTPUT_DIR, 'win-unpacked');
// electron-builder names the packaged exe after build.productName, so read it rather
// than hard-coding it (it changed once already, with the Nebula Finterest rename).
const APP_EXE = path.join(UNPACKED_DIR, `${require('../package.json').build.productName}.exe`);
const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.ico');
const RCEDIT_CACHE_PATH = path.join(__dirname, '..', 'node_modules', '.cache', 'rcedit-x64.exe');
const RCEDIT_DOWNLOAD_URL = 'https://github.com/electron/rcedit/releases/latest/download/rcedit-x64.exe';

async function main() {
  if (process.platform !== 'win32') {
    return;
  }

  if (!fs.existsSync(APP_EXE) || !fs.existsSync(ICON_PATH)) {
    console.warn('[fix-windows-icon] skipped: win-unpacked build or build/icon.ico not found.');
    return;
  }

  const rcedit = await resolveRcedit();
  if (!rcedit) {
    console.warn('[fix-windows-icon] skipped: could not find or download rcedit.');
    return;
  }

  execFileSync(rcedit, [APP_EXE, '--set-icon', ICON_PATH], { stdio: 'inherit' });

  // Use electron-builder's programmatic API rather than shelling out to `npx electron-builder`:
  // spawning npx.cmd via execFileSync fails on Windows (EINVAL) without a shell, and adding
  // shell:true would reintroduce the argument-escaping warning/risk this script avoids elsewhere.
  const { build, createTargets, Platform } = require('electron-builder');
  await build({
    targets: createTargets([Platform.WINDOWS], 'nsis'),
    prepackaged: UNPACKED_DIR,
    config: { directories: { output: OUTPUT_DIR } },
  });

  console.log('[fix-windows-icon] Applied build/icon.ico to the packaged exe and rebuilt the installer.');
}

async function resolveRcedit() {
  const cachedByElectronBuilder = findCachedRcedit();
  if (cachedByElectronBuilder) {
    return cachedByElectronBuilder;
  }

  if (fs.existsSync(RCEDIT_CACHE_PATH)) {
    return RCEDIT_CACHE_PATH;
  }

  try {
    fs.mkdirSync(path.dirname(RCEDIT_CACHE_PATH), { recursive: true });
    await downloadFile(RCEDIT_DOWNLOAD_URL, RCEDIT_CACHE_PATH);
    return RCEDIT_CACHE_PATH;
  } catch (error) {
    console.warn('[fix-windows-icon] rcedit download failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

function findCachedRcedit() {
  const electronBuilderCache = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign');
  if (!fs.existsSync(electronBuilderCache)) {
    return null;
  }

  for (const entry of fs.readdirSync(electronBuilderCache)) {
    const candidate = path.join(electronBuilderCache, entry, 'rcedit-x64.exe');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function downloadFile(url, destination, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirectsLeft > 0) {
        response.resume();
        downloadFile(response.headers.location, destination, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve(undefined)));
      file.on('error', reject);
    }).on('error', reject);
  });
}

main().catch((error) => {
  console.warn('[fix-windows-icon] unexpected error, continuing:', error instanceof Error ? error.message : error);
});

// Run with sharp available in NODE_PATH. Generated PNGs are committed app assets.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const directory = path.join(__dirname, '../assets/images/note-markers');
const states = {
  locked: '#F3EBDD',
  available: '#EFBA48',
  owned: '#D6643E',
  read: '#C9BDAF',
};

function createSvg(state, color) {
  const owned = state === 'owned';
  const pin = owned
    ? 'M56 10C32 10 12 29 12 53C12 75 37 99 56 116C75 99 100 75 100 53C100 29 80 10 56 10Z'
    : 'M56 28C37 28 22 43 22 62C22 80 41 100 56 116C71 100 90 80 90 62C90 43 75 28 56 28Z';
  const envelope = owned
    ? '<rect x="35" y="38" width="42" height="31" rx="6" fill="#FFFFFF"/><path d="M39 43L56 56L73 43" fill="none" stroke="#D6643E"/>'
    : `<rect x="40" y="51" width="32" height="23" rx="4" fill="#5A3E2D"/><path d="M43 54L56 64L69 54" fill="none" stroke="${color}"/>`;
  const badge = state === 'locked'
    ? '<circle cx="84" cy="35" r="16" fill="#302B27" stroke="#FFFFFF" stroke-width="3"/><path d="M79 33v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#FFFFFF" stroke-width="2.5"/><rect x="78" y="33" width="12" height="10" rx="2" fill="#FFFFFF"/>'
    : state === 'read'
      ? '<circle cx="84" cy="94" r="16" fill="#6C655F" stroke="#FFFFFF" stroke-width="3"/><path d="M77 94l5 5 9-10" fill="none" stroke="#FFFFFF" stroke-width="3"/>'
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="128" viewBox="0 0 112 128">
  <defs><filter id="shadow" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.22"/></filter></defs>
  <path d="${pin}" fill="${color}" stroke="#FFFFFF" stroke-width="4.5" stroke-linejoin="round" filter="url(#shadow)"/>
  <g stroke-width="${owned ? 3.5 : 2.8}" stroke-linecap="round" stroke-linejoin="round">${envelope}${badge}</g>
</svg>`;
}

async function main() {
  await fs.mkdir(directory, { recursive: true });
  for (const [state, color] of Object.entries(states)) {
    const svg = createSvg(state, color);
    await fs.writeFile(path.join(directory, `${state}.svg`), svg);
    for (const scale of [1, 2, 3]) {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      await sharp(Buffer.from(svg), { density: 144 })
        .resize(56 * scale, 64 * scale)
        .png()
        .toFile(path.join(directory, `${state}${suffix}.png`));
    }
  }
  // A visual comparison sheet, separate from assets shipped by the app.
  const tiles = await Promise.all(Object.keys(states).map(async (state, index) => ({
    input: await sharp(path.join(directory, `${state}@2x.png`)).toBuffer(),
    left: index * 112,
    top: 0,
  })));
  await fs.mkdir(path.join(__dirname, '../.expo'), { recursive: true });
  await sharp({ create: { width: 448, height: 128, channels: 4, background: '#D9D9D9' } })
    .composite(tiles).png().toFile(path.join(__dirname, '../.expo/note-markers-preview.png'));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

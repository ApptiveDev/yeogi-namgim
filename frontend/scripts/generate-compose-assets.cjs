const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.join(__dirname, '../assets');
const paths = {
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  friends: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',
  lock: '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  location: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
};
async function main() {
  const icons = path.join(root, 'images/compose-icons');
  await fs.mkdir(icons, { recursive: true });
  for (const scale of [1, 2, 3]) {
    const suffix = scale === 1 ? '' : `@${scale}x`;
    for (const [name, content] of Object.entries(paths)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#191919" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
      await sharp(Buffer.from(svg), { density: 72 * scale }).png().toFile(path.join(icons, `${name}${suffix}.png`));
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

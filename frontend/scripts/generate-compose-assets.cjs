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
    const captionSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="100" viewBox="0 0 112 100"><rect x="5" y="0" width="102" height="27" rx="13.5" fill="#171717"/><path d="M51 25l5 6 5-6" fill="#171717"/></svg>';
    const label = await sharp({ text: {
      text: '<span foreground="#FFFFFF">여기에 남겨져요</span>',
      font: `Pretendard ${12 * scale}`,
      fontfile: path.join(root, 'fonts/Pretendard-Regular.ttf'), rgba: true,
    } }).png().toBuffer({ resolveWithObject: true });
    const pin = await sharp(path.join(root, 'images/note-markers/owned@3x.png')).resize(56 * scale, 64 * scale).png().toBuffer();
    await sharp(Buffer.from(captionSvg), { density: 72 * scale }).composite([
      { input: label.data, left: Math.round((112 * scale - label.info.width) / 2), top: Math.round((27 * scale - label.info.height) / 2) },
      { input: pin, left: 28 * scale, top: 36 * scale },
    ]).png().toFile(path.join(root, `images/note-markers/placement${suffix}.png`));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

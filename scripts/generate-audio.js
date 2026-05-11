import Replicate from 'replicate';
import { createHash } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, '..');
const AUDIO_DIR = join(rootDir, 'audio');
const MAP_FILE  = join(rootDir, 'data', 'audio-map.js');

// Модель и голос — меняй здесь
const MODEL = 'jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';
const VOICE = 'af_sarah'; // am_adam, bf_alice, bm_george, bm_lewis, ...

const { dialogues } = await import('../data/dialogues.js');
const { audioMap: existingMap } = await import('../data/audio-map.js');

mkdirSync(AUDIO_DIR, { recursive: true });

const replicate = new Replicate(); // читает REPLICATE_API_TOKEN из env

function hash(text) {
    return createHash('md5').update(text).digest('hex').slice(0, 8);
}

async function generateLine(text) {
    // Если запись уже есть в карте и файл на диске — пропускаем
    if (existingMap[text] && existsSync(join(rootDir, existingMap[text]))) {
        console.log(`  ✓ пропускаю (уже есть): "${text.slice(0, 50)}"`);
        return existingMap[text];
    }

    const filename = `${hash(text)}.wav`;
    const filepath = join(AUDIO_DIR, filename);
    const webPath  = `audio/${filename}`;

    console.log(`  ⟳ Генерирую: "${text.slice(0, 60)}"`);

    const output = await replicate.run(MODEL, {
        input: { text, voice: VOICE, lang_code: 'a', speed: 1.0 },
    });

    let buf;
    if (output && typeof output.blob === 'function') {
        // FileOutput объект (Replicate SDK v1+)
        buf = Buffer.from(await (await output.blob()).arrayBuffer());
    } else if (output && typeof output.getReader === 'function') {
        // ReadableStream
        const reader = output.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        buf = Buffer.concat(chunks);
    } else {
        // URL-строка
        const res = await fetch(typeof output === 'string' ? output : String(output));
        buf = Buffer.from(await res.arrayBuffer());
    }
    writeFileSync(filepath, buf);

    console.log(`  ✓ Сохранено: ${filename}`);
    return webPath;
}

// Начинаем с существующей карты, чтобы не потерять старые записи
const map = { ...existingMap };

for (const dialogue of dialogues) {
    console.log(`\n📝 ${dialogue.title}`);
    for (const line of dialogue.lines) {
        map[line.en] = await generateLine(line.en);
    }
}

const js = `// Авто-генерируется скриптом scripts/generate-audio.js — не редактировать вручную
export const audioMap = ${JSON.stringify(map, null, 4)};
`;
writeFileSync(MAP_FILE, js);
console.log(`\n✅ Карта аудио сохранена → data/audio-map.js`);

import Replicate from 'replicate';
import { createHash } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const rootDir        = join(__dirname, '..');
const AUDIO_DIR      = join(rootDir, 'audio');
const DIALOGUES_FILE = join(rootDir, 'data', 'dialogues.js');

// Модель и голос — меняй здесь
const MODEL = 'jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';
const VOICE = 'af_sarah'; // am_adam, bf_alice, bm_george, bm_lewis, ...

const { dialogues } = await import(`../data/dialogues.js?t=${Date.now()}`);

mkdirSync(AUDIO_DIR, { recursive: true });

const replicate = new Replicate(); // читает REPLICATE_API_TOKEN из env

function hash(text) {
    return createHash('md5').update(text).digest('hex').slice(0, 8);
}

async function generateLine(line) {
    const { en, audio } = line;

    // Если путь уже есть и файл на диске — пропускаем
    if (audio && existsSync(join(rootDir, audio))) {
        console.log(`  ✓ пропускаю (уже есть): "${en.slice(0, 50)}"`);
        return audio;
    }

    const webPath = `audio/${hash(en)}.wav`;
    const filepath = join(rootDir, webPath);

    console.log(`  ⟳ Генерирую: "${en.slice(0, 60)}"`);

    const output = await replicate.run(MODEL, {
        input: { text: en, voice: VOICE, lang_code: 'a', speed: 1.0 },
    });

    let buf;
    if (output && typeof output.blob === 'function') {
        buf = Buffer.from(await (await output.blob()).arrayBuffer());
    } else if (output && typeof output.getReader === 'function') {
        const reader = output.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        buf = Buffer.concat(chunks);
    } else {
        const res = await fetch(typeof output === 'string' ? output : String(output));
        buf = Buffer.from(await res.arrayBuffer());
    }
    writeFileSync(filepath, buf);

    console.log(`  ✓ Сохранено: ${webPath}`);
    return webPath;
}

// Обходим все диалоги и дописываем поле audio в каждую реплику
for (const dialogue of dialogues) {
    console.log(`\n📝 ${dialogue.title}`);
    for (const line of dialogue.lines) {
        line.audio = await generateLine(line);
    }
}

// Записываем обновлённый dialogues.js
const js = `export const dialogues = ${JSON.stringify(dialogues, null, 4)};\n`;
writeFileSync(DIALOGUES_FILE, js);
console.log(`\n✅ data/dialogues.js обновлён с аудио-путями`);

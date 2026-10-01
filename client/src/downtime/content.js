// Downtime content sources, lifted verbatim out of the old VocabBuilder /
// ReadAnything modals so the new swipe feed reuses the exact fetch/parse logic
// (Datamuse words + dictionaryapi.dev examples, Wikipedia articles) â€” only the
// presentation changes. No React here.

/* ---------- Word Forge (Datamuse) ---------- */

const POS = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "" };

function randomPattern() {
    const len = 4 + Math.floor(Math.random() * 6); // 4â€“9 letters
    return "?".repeat(len);
}

// Guaranteed example sentence that actually USES the word, picked by part of
// speech so it reads naturally. This is the floor: real per-sense examples from
// dictionaryapi.dev get layered on top by applyExamples when that API is
// reachable (it's flaky, and obscure Datamuse words often aren't in it), but
// every meaning always has a non-empty, word-using sentence — never a generic
// "use it in a sentence" prompt, never the definition echoed back.
// ponytail: template fallback — swap for a backend Tatoeba proxy if real
// sentences for every word become a hard quality requirement [[wordforge-sentence-sources]].
const EXAMPLE_TEMPLATES = {
    adjective: [
        (w) => `His work was ${w} from start to finish.`,
        (w) => `Few people are as ${w} as she is.`,
        (w) => `They stayed ${w} even under real pressure.`
    ],
    verb: [
        (w) => `They would ${w} whenever the moment called for it.`,
        (w) => `He learned to ${w} without a second thought.`,
        (w) => `We should ${w} before it's too late.`
    ],
    adverb: [
        (w) => `She handled the whole thing ${w}, as always.`,
        (w) => `They moved ${w} toward the door.`,
        (w) => `It all came together ${w} in the end.`
    ],
    noun: [
        (w) => `The ${w} caught everyone's attention.`,
        (w) => `She spoke about the ${w} with real passion.`,
        (w) => `No one could ignore the ${w} any longer.`
    ]
};

// Deterministic pick (stable per word) from the set matching the part of
// speech; unknown/blank pos falls back to the noun phrasing, which reads fine
// for most words. `i` (meaning index) spreads multiple same-pos meanings of one
// word across different templates instead of repeating the same sentence.
function exampleFor(word, pos, i = 0) {
    const set = EXAMPLE_TEMPLATES[pos] || EXAMPLE_TEMPLATES.noun;
    return set[(word.length + i) % set.length](word);
}

// Real example sentences for `word`, grouped by part of speech. Best-effort:
// a network error, CORS block, timeout, abort, or missing entry yields no
// examples (never throws). Aborts on the caller's signal and its own timeout.
export async function fetchWordExamples(word, externalSignal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const onAbort = () => ctrl.abort();
    externalSignal?.addEventListener("abort", onAbort);
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
                word
            )}`,
            { signal: ctrl.signal }
        );
        if (!res.ok) return { byPos: {}, any: [] };

        const data = await res.json();
        const byPos = {};
        const any = [];
        for (const entry of Array.isArray(data) ? data : []) {
            for (const m of entry.meanings || []) {
                for (const d of m.definitions || []) {
                    if (d.example) {
                        (byPos[m.partOfSpeech] ??= []).push(d.example);
                        any.push(d.example);
                    }
                }
            }
        }
        return { byPos, any };
    } catch {
        return { byPos: {}, any: [] };
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener("abort", onAbort);
    }
}
// Map fetched examples onto meanings: each meaning takes a real example of its
// own part of speech first, then any leftover real example; a meaning with no
// real match keeps whatever sentence it had (the fallback). Pure.
export function applyExamples(meanings, ex) {
    const used = new Set();
    return meanings.map((m) => {
        const pool = ex.byPos[m.pos] || [];
        const real =
            pool.find((s) => !used.has(s)) ||
            ex.any.find((s) => !used.has(s));
        if (real) used.add(real);
        return real ? { ...m, example: real } : m;
    });
}

// One fresh word with a guaranteed fallback sentence on every meaning. Throws
// if the word bank can't be reached after a few tries.
export async function nextWord() {
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(
            `https://api.datamuse.com/words?sp=${randomPattern()}&md=dp&max=1000`
        );
        if (!res.ok) continue;

        const list = await res.json();
        const defined = list.filter(
            (w) => w.defs && w.defs.length && /^[a-z]+$/.test(w.word)
        );
        if (!defined.length) continue;

        const pick = defined[Math.floor(Math.random() * defined.length)];
        const meanings = pick.defs
            .slice(0, 3)
            .map((d) => {
                const tab = d.indexOf("\t");
                const code = d.slice(0, tab);
                return {
                    pos: POS[code] ?? code,
                    definition: d.slice(tab + 1).trim()
                };
            })
            .filter((m) => m.definition);

        if (!meanings.length) continue;

        return {
            word: pick.word,
            meanings: meanings.map((m, i) => ({
                ...m,
                example: exampleFor(pick.word, m.pos, i)
            }))
        };
    }
    throw new Error("no word");
}
/* ---------- Deep Read (Wikipedia) ---------- */

// Reading pool, grouped into three balanced categories. Category-first
// selection (see randomTopic) gives each an equal shot so a longer list can't
// drown the others. Each entry must resolve on en.wikipedia.org.
const TOPIC_CATEGORIES = {
    defence: [
        "Indian Army", "Indian Military Academy", "Sam Manekshaw", "K. M. Cariappa",
        "Bipin Rawat", "Manoj Mukund Naravane", "Upendra Dwivedi", "V. K. Singh",
        "Dalbir Singh Suhag", "Manoj Pande", "J. J. Singh", "Bikram Singh (general)",
        "Harbaksh Singh", "Zorawar Singh", "Ian Cardozo", "Shaitan Singh",
        "Vikram Batra", "Manoj Kumar Pandey", "Somnath Sharma", "Sandeep Unnikrishnan",
        "Arun Khetarpal", "Yogendra Singh Yadav", "Jaswant Singh Rawat",
        "Special forces of India", "Para (Special Forces)", "Rashtriya Rifles",
        "Assam Rifles", "Gorkha regiments (India)", "Sikh Regiment", "Rajput Regiment",
        "Mechanised Infantry Regiment", "Indian Armoured Corps",
        "Regiment of Artillery (India)", "Mountain warfare", "Siachen Glacier",
        "Line of Control", "Line of Actual Control", "Kargil War", "Operation Meghdoot",
        "Operation Vijay (1999)", "Operation Parakram", "BrahMos", "Agni missile",
        "Prithvi (missile)", "Akash (missile)", "Pinaka multi-barrel rocket launcher",
        "K9 Thunder", "M777 howitzer", "T-90", "Arjun (tank)", "S-400 missile system",
        "HAL Prachand", "Boeing AH-64 Apache", "Sixth-generation fighter",
        "Military intelligence"
    ],
    computerScience: [
        "Algorithm", "Data structure", "Operating system", "Database",
        "Relational database", "Computer network", "Internet protocol suite",
        "Computer security", "Cryptography", "Distributed computing",
        "Software engineering", "Version control", "Compiler", "Programming language",
        "Central processing unit", "Computer architecture", "Cloud computing",
        "Big O notation", "Functional programming", "Object-oriented programming",
        "Machine learning", "Artificial intelligence"
    ],
    futureTech: [
        "Artificial general intelligence", "Robotics", "Autonomous robot",
        "Self-driving car", "Quantum computing", "Quantum cryptography",
        "Brainâ€“computer interface", "Neuralink", "Space exploration", "Biotechnology",
        "CRISPR", "Nanotechnology", "Nuclear fusion", "Renewable energy",
        "Augmented reality", "Virtual reality", "3D printing", "Internet of things",
        "Blockchain"
    ]
};

const CATEGORY_LABEL = {
    defence: "Defence",
    computerScience: "Computer Science",
    futureTech: "Future Tech"
};
const CATEGORY_KEYS = Object.keys(TOPIC_CATEGORIES);

// Pick a category with equal weight, then a topic inside it, avoiding an
// immediate repeat of the last topic. Returns the topic + its human label.
function randomTopic(exclude) {
    let key;
    let pick = exclude;
    while (pick === exclude) {
        key = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
        const list = TOPIC_CATEGORIES[key];
        pick = list[Math.floor(Math.random() * list.length)];
    }
    return { topic: pick, category: CATEGORY_LABEL[key] };
}
// Drop exintro so we get full prose; exsectionformat=wiki wraps headings in
// == == so we can render them; pageprops flags disambiguation pages.
const API =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=extracts|pageimages|description|pageprops&explaintext=1" +
    "&exsectionformat=wiki&ppprop=disambiguation" +
    "&piprop=thumbnail&pithumbsize=640&redirects=1&titles=";

// Trailing sections that are link-dumps, not reading material. Stop here.
const STOP_SECTIONS =
    /^(see also|references|external links|notes|further reading|bibliography|citations|sources|footnotes)$/i;

// Split a wiki-section plaintext extract into structured heading/paragraph
// blocks so the reader isn't one undifferentiated wall of text.
function parseExtract(text) {
    const blocks = [];
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (!line) continue;

        const heading = line.match(/^(={2,6})\s*(.+?)\s*\1$/);
        if (heading) {
            if (STOP_SECTIONS.test(heading[2])) break;
            blocks.push({ type: "h", level: heading[1].length, text: heading[2] });
        } else {
            blocks.push({ type: "p", text: line });
        }
    }
    return blocks;
}

// One fresh article. `excludeTopic` avoids an immediate repeat. Retries past
// disambiguation/empty hits; throws if nothing usable turns up.
// Each fetch is capped at 10 s so a slow network surfaces the error state
// quickly instead of hanging the loading spinner indefinitely.
export async function nextArticle(excludeTopic) {
    let last = excludeTopic;
    for (let attempt = 0; attempt < 5; attempt++) {
        const { topic, category } = randomTopic(last);
        last = topic;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        let res;
        try {
            res = await fetch(API + encodeURIComponent(topic), { signal: ctrl.signal });
        } catch {
            clearTimeout(timer);
            continue; // timed out or network error — try next topic
        }
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const page = Object.values(data.query.pages)[0];

        const isDisambig = page?.pageprops?.disambiguation !== undefined;
        if (
            !page ||
            page.missing !== undefined ||
            !page.extract ||
            isDisambig
        ) {
            continue;
        }

        return {
            topic,
            category,
            title: page.title,
            description: page.description,
            blocks: parseExtract(page.extract),
            thumb: page.thumbnail?.source,
            url:
                "https://en.wikipedia.org/wiki/" +
                encodeURIComponent(page.title.replace(/ /g, "_"))
        };
    }
    throw new Error("no article");
}

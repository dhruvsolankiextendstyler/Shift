// Downtime content sources: Word Forge (vocabulary with usage examples) and
// Deep Read (editorial, balanced topic articles). Built with robust offline
// caching and structured parsing so articles are readable, high-signal, and bounded.

/* ---------- Offline Content Banks & Caching ---------- */

const CACHED_WORDS_KEY = "shift_cached_words";
const CACHED_ARTICLES_KEY = "shift_cached_articles";

export const OFFLINE_WORDS = [
    {
        word: "tenacious",
        meanings: [
            {
                pos: "adjective",
                definition: "Tending to keep a firm hold of something; clinging or adhering closely; persistent.",
                example: "The unit mounted a tenacious defense of the outpost through the winter."
            },
            {
                pos: "adjective",
                definition: "Not readily relinquishing a position, principle, or course of action; determined.",
                example: "She was tenacious in pursuing solutions where others gave up."
            }
        ]
    },
    {
        word: "ephemeral",
        meanings: [
            {
                pos: "adjective",
                definition: "Lasting for a very short time; transitory; fleeting.",
                example: "Fads in technology can be ephemeral, but fundamental principles endure."
            }
        ]
    },
    {
        word: "salient",
        meanings: [
            {
                pos: "adjective",
                definition: "Most noticeable or important; prominent; conspicuous.",
                example: "The briefing highlighted the salient tactical advantages of the terrain."
            }
        ]
    },
    {
        word: "resilience",
        meanings: [
            {
                pos: "noun",
                definition: "The capacity to recover quickly from difficulties; toughness and elasticity.",
                example: "Distributed consensus protocols are engineered for fault resilience."
            }
        ]
    },
    {
        word: "lucid",
        meanings: [
            {
                pos: "adjective",
                definition: "Expressed clearly; easy to understand; showing ability to think clearly.",
                example: "His documentation offered a lucid walkthrough of the compiler design."
            }
        ]
    },
    {
        word: "vigilant",
        meanings: [
            {
                pos: "adjective",
                definition: "Keeping careful watch for possible danger, difficulties, or flaws.",
                example: "Network security teams remain vigilant against subtle configuration drifts."
            }
        ]
    },
    {
        word: "parsimony",
        meanings: [
            {
                pos: "noun",
                definition: "Extreme unwillingness to spend money or use resources; economy of explanation.",
                example: "The principle of mathematical parsimony favors the simplest viable model."
            }
        ]
    },
    {
        word: "catalyst",
        meanings: [
            {
                pos: "noun",
                definition: "A person or thing that precipitates an event or change without itself being consumed.",
                example: "The breakthrough in semiconductor lithography served as a catalyst for modern computing."
            }
        ]
    }
];

export const OFFLINE_ARTICLES = [
    {
        topic: "BrahMos",
        category: "Defence",
        title: "BrahMos: Supersonic Precision",
        description: "The world's fastest operational supersonic cruise missile in active service.",
        readingTime: "3 min read",
        hook: "Traveling at nearly three times the speed of sound, the BrahMos missile represents one of the most successful international joint defense developments in modern military history.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Speed as a Defensive Disruptor"
            },
            {
                type: "p",
                text: "Cruising at Mach 2.8 to 3.0, the BrahMos leaves minimal reaction time for shipborne or land-based interceptors. Its supersonic flight profile throughout the entire mission profile imparts immense kinetic energy upon impact, creating devastating warhead and penetration effects."
            },
            {
                type: "h",
                level: 2,
                text: "Multi-Platform Deployment"
            },
            {
                type: "p",
                text: "Engineered as a universal strike weapon, the missile can be launched from vertical land batteries, naval destroyers, submarines, and modified Sukhoi Su-30MKI fighter aircraft. This tri-service integration provides deep strategic redundancy across modern operational theatres."
            }
        ],
        takeaway: "High supersonic speed drastically compresses defensive decision windows, turning kinetic velocity into an indispensable strategic deterrent.",
        url: "https://en.wikipedia.org/wiki/BrahMos"
    },
    {
        topic: "Operating system kernel",
        category: "Computer Science",
        title: "The Architecture of the Kernel",
        description: "The foundational software layer bridging raw silicon and userland execution.",
        readingTime: "3 min read",
        hook: "Every computational device relies on a core program that holds complete control over the system: the kernel. Operating in privileged supervisor mode, it arbitrates hardware access with microsecond precision.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Hardware Abstraction & Resource Isolation"
            },
            {
                type: "p",
                text: "The kernel decouples application developers from physical hardware differences. It virtualizes memory through translation lookaside buffers and page tables, preventing erratic processes from crashing the broader operating environment."
            },
            {
                type: "h",
                level: 2,
                text: "Monolithic vs. Microkernel Design"
            },
            {
                type: "p",
                text: "While monolithic kernels like Linux execute device drivers and filesystems within supervisor space for peak throughput, microkernels isolate drivers into distinct userland services to optimize fault containment and formal verification."
            }
        ],
        takeaway: "Kernel architecture is a deliberate trade-off between the raw throughput of shared memory spaces and the verifiable reliability of isolated processes.",
        url: "https://en.wikipedia.org/wiki/Kernel_(operating_system)"
    },
    {
        topic: "Transformer (deep learning architecture)",
        category: "AI & ML",
        title: "The Self-Attention Revolution",
        description: "How the Transformer architecture fundamentally reshaped machine cognition.",
        readingTime: "3 min read",
        hook: "In 2017, the introduction of the Transformer architecture dissolved the sequential bottlenecks that had constrained recurrent neural networks for decades.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Attention Without Recurrence"
            },
            {
                type: "p",
                text: "Prior architectures processed language token by sequential token, causing earlier context to fade over long passages. The Transformer computes pairwise self-attention weights across an entire sequence simultaneously, allowing instant correlation between words separated by thousands of characters."
            },
            {
                type: "h",
                level: 2,
                text: "Hardware Parallelism & Scale"
            },
            {
                type: "p",
                text: "Because sequence computation is mapped to matrix multiplications rather than time steps, modern GPU accelerators can train massive multi-billion parameter foundation models across distributed clusters efficiently."
            }
        ],
        takeaway: "Replacing step-by-step recurrence with global matrix-based attention enabled deep learning systems to ingest and reason over vast contexts in parallel.",
        url: "https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)"
    },
    {
        topic: "Zero trust security model",
        category: "Cybersecurity",
        title: "Zero Trust: Never Trust, Always Verify",
        description: "Why modern network perimeters have dissolved in favor of cryptographic verification.",
        readingTime: "3 min read",
        hook: "The classic castle-and-moat security model assumed that everything inside a corporate network was benign. Zero Trust discards implicit perimeter trust entirely.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Continuous Cryptographic Authentication"
            },
            {
                type: "p",
                text: "Under Zero Trust, every user, device, and API transaction is continuously authenticated and authorized using micro-segmented policies, mutual TLS, and device health signals, regardless of physical network location."
            },
            {
                type: "h",
                level: 2,
                text: "Blast Radius Containment"
            },
            {
                type: "p",
                text: "If a single endpoint or credential is compromised, strict least-privilege boundary rules prevent adversaries from pivoting laterally through the infrastructure, drastically limiting the operational impact of breaches."
            }
        ],
        takeaway: "Security is strongest when identity and policy enforcement occur at every transaction rather than at an arbitrary network boundary.",
        url: "https://en.wikipedia.org/wiki/Zero_trust_security_model"
    },
    {
        topic: "Quantum computing",
        category: "Future Tech",
        title: "Quantum Superposition & Coherence",
        description: "Exploiting subatomic phenomena to solve intractable computational problems.",
        readingTime: "3 min read",
        hook: "Classical bits are decisively binary, existing strictly as 0 or 1. Quantum bits (qubits) leverage superposition and entanglement to evaluate vast multidimensional mathematical solution spaces simultaneously.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Superposition and Interference"
            },
            {
                type: "p",
                text: "By choreographing constructive and destructive quantum interference, quantum algorithms amplify the probability of correct answers while cancelling out incorrect paths, enabling exponential speedups in specific domains like molecular simulation."
            },
            {
                type: "h",
                level: 2,
                text: "The Challenge of Decoherence"
            },
            {
                type: "p",
                text: "Qubits are fragile systems susceptible to thermal and electromagnetic noise. Quantum error correction codes, which spread logical qubit states across clusters of physical qubits, are essential to achieving fault-tolerant computation."
            }
        ],
        takeaway: "Quantum computers do not simply calculate faster; they compute differently, utilizing quantum mechanics to solve problems classical silicon cannot model.",
        url: "https://en.wikipedia.org/wiki/Quantum_computing"
    },
    {
        topic: "James Webb Space Telescope",
        category: "Space",
        title: "Webb: Piercing the Infrared Horizon",
        description: "Humanity's premier space observatory examining the earliest cosmic structures.",
        readingTime: "3 min read",
        hook: "Stationed 1.5 million kilometers from Earth at Lagrange Point 2, the James Webb Space Telescope peers back more than 13.5 billion years into the universe's cosmic dawn.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Infrared Astronomy & Redshift"
            },
            {
                type: "p",
                text: "Because the expansion of spacetime stretches light from primordial stars toward infrared wavelengths, JWST's gold-coated beryllium primary mirror is tuned specifically to detect faint infrared photons that penetrate cosmic dust clouds."
            },
            {
                type: "h",
                level: 2,
                text: "Extreme Cryogenic Engineering"
            },
            {
                type: "p",
                text: "To prevent thermal glow from blinding its sensitive detectors, a five-layer Kapton sunshield the size of a tennis court maintains instruments at temperatures below -233°C (-388°F), passive cooling at planetary scale."
            }
        ],
        takeaway: "Observing the universe's earliest structures requires pushing optical and cryogenic engineering to extreme frontiers far beyond planetary shelter.",
        url: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope"
    },
    {
        topic: "Humanoid robot",
        category: "Robotics",
        title: "Embodied Robotics: The Humanoid Frontier",
        description: "Navigating anthropogenic environments using dynamic balance and spatial vision.",
        readingTime: "3 min read",
        hook: "Factories, tools, stairs, and doors were built specifically around human geometry. Humanoid robots aim to operate within existing infrastructure without requiring expensive environment retrofits.",
        blocks: [
            {
                type: "h",
                level: 2,
                text: "Dynamic Bipedal Balance"
            },
            {
                type: "p",
                text: "Walking is controlled falling. Modern humanoid platforms utilize high-frequency model predictive control (MPC) paired with force-torque foot sensors to adapt stride height and foot placement over uneven, unpredictable terrain in real time."
            },
            {
                type: "h",
                level: 2,
                text: "Multimodal Dexterity"
            },
            {
                type: "p",
                text: "Endowing robotic hands with compliant actuators and tactile fingertips allows machines to grasp delicate glassware or heavy power tools, bridging high-level computer vision models with nuanced physical work."
            }
        ],
        takeaway: "Humanoid form factors succeed not because they are anthropomorphic, but because our world's physical architecture is built for human dimensions.",
        url: "https://en.wikipedia.org/wiki/Humanoid_robot"
    }
];

function getStoredItems(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

function storeItem(key, item, max = 20) {
    try {
        const list = getStoredItems(key);
        // Avoid duplicate by title or word
        const ident = item.word || item.title;
        const filtered = list.filter((it) => (it.word || it.title) !== ident);
        filtered.unshift(item);
        localStorage.setItem(key, JSON.stringify(filtered.slice(0, max)));
    } catch {}
}

/* ---------- Word Forge (Datamuse + dictionaryapi.dev) ---------- */

const POS = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "" };

function randomPattern() {
    const len = 4 + Math.floor(Math.random() * 5); // 4–8 letters
    return "?".repeat(len);
}

const EXAMPLE_TEMPLATES = {
    adjective: [
        (w) => `His approach was ${w} from start to finish.`,
        (w) => `Few leaders are as ${w} under pressure.`,
        (w) => `They maintained a ${w} posture throughout the mission.`
    ],
    verb: [
        (w) => `They would ${w} whenever strategic conditions required it.`,
        (w) => `Engineers learned to ${w} before deploying to production.`,
        (w) => `We must ${w} with precision.`
    ],
    adverb: [
        (w) => `She executed the maneuver ${w}, according to doctrine.`,
        (w) => `The system responded ${w} under heavy load.`,
        (w) => `It resolved ${w} once the variables were balanced.`
    ],
    noun: [
        (w) => `The ${w} anchored their strategic operational plan.`,
        (w) => `He studied the ${w} with disciplined focus.`,
        (w) => `No team could overlook the significance of this ${w}.`
    ]
};

function exampleFor(word, pos, i = 0) {
    const set = EXAMPLE_TEMPLATES[pos] || EXAMPLE_TEMPLATES.noun;
    return set[(word.length + i) % set.length](word);
}

export async function fetchWordExamples(word, externalSignal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const onAbort = () => ctrl.abort();
    externalSignal?.addEventListener("abort", onAbort);
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
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

export async function nextWord() {
    // 1. Try online fetch
    if (typeof navigator === "undefined" || navigator.onLine !== false) {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 4000);
                const res = await fetch(
                    `https://api.datamuse.com/words?sp=${randomPattern()}&md=dp&max=800`,
                    { signal: ctrl.signal }
                );
                clearTimeout(timer);
                if (!res.ok) continue;

                const list = await res.json();
                const defined = list.filter(
                    (w) => w.defs && w.defs.length && /^[a-z]+$/.test(w.word) && w.word.length >= 4
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

                const wordObj = {
                    word: pick.word,
                    meanings: meanings.map((m, i) => ({
                        ...m,
                        example: exampleFor(pick.word, m.pos, i)
                    }))
                };

                // Cache for offline resilience
                storeItem(CACHED_WORDS_KEY, wordObj);
                return wordObj;
            } catch {
                continue;
            }
        }
    }

    // 2. Offline / network fallback: use local cache or pre-seeded bank
    const cached = getStoredItems(CACHED_WORDS_KEY);
    const pool = cached.length >= 3 ? cached : OFFLINE_WORDS;
    const randomFallback = pool[Math.floor(Math.random() * pool.length)];
    return JSON.parse(JSON.stringify(randomFallback));
}

/* ---------- Deep Read (Editorial Wikipedia Articles) ---------- */

export const TOPIC_CATEGORIES = {
    defence: [
        "Indian Army", "BrahMos", "Sam Manekshaw", "Stealth aircraft",
        "Special forces of India", "Aircraft carrier", "Hypersonic flight",
        "Precision-guided munition", "Drone warfare", "Radar",
        "Air superiority fighter", "Electronic warfare", "Night vision device",
        "Submarine", "Ballistic missile defence", "Indian Military Academy",
        "Mountain warfare", "Kargil War", "Special Air Service", "DARPA"
    ],
    computerScience: [
        "Algorithm", "Operating system kernel", "Distributed computing",
        "Compiler", "Graph theory", "Relational database", "Cache (computing)",
        "Computer memory", "Central processing unit", "Data compression",
        "Concurrency (computer science)", "Internet protocol suite",
        "Virtual memory", "Garbage collection (computer science)", "Software engineering",
        "Distributed hash table", "B-tree"
    ],
    ai: [
        "Artificial intelligence", "Machine learning",
        "Transformer (deep learning architecture)", "Large language model",
        "Deep learning", "Neural network (machine learning)", "Computer vision",
        "Natural language processing", "Reinforcement learning",
        "Generative artificial intelligence", "Supervised learning", "AI alignment"
    ],
    cybersecurity: [
        "Computer security", "Cryptography", "Public-key cryptography",
        "Zero trust security model", "End-to-end encryption", "Firewall (computing)",
        "Malware", "Penetration test", "Denial-of-service attack",
        "Vulnerability (computing)", "Transport Layer Security", "Authentication"
    ],
    futureTech: [
        "Quantum computing", "Brain–computer interface", "Nuclear fusion",
        "CRISPR", "Nanotechnology", "Superconductivity", "Synthetic biology",
        "Metamaterial", "Solid-state battery", "Biotechnology"
    ],
    space: [
        "Space exploration", "James Webb Space Telescope", "Artemis program",
        "Reusable launch vehicle", "Orbital mechanics", "Mars rover",
        "International Space Station", "Ion thruster", "Exoplanet",
        "Kuiper belt", "Voyager program"
    ],
    robotics: [
        "Robotics", "Autonomous robot", "Humanoid robot",
        "Robot kinematics", "Mobile robot", "Robotic arm",
        "Haptic technology", "Surgical robot", "Inverse kinematics",
        "Unmanned aerial vehicle", "Swarm robotics"
    ]
};

export const CATEGORY_LABEL = {
    defence: "Defence",
    computerScience: "Computer Science",
    ai: "AI & ML",
    cybersecurity: "Cybersecurity",
    futureTech: "Future Tech",
    space: "Space",
    robotics: "Robotics"
};

const CATEGORY_KEYS = Object.keys(TOPIC_CATEGORIES);

function randomTopic(exclude) {
    let key;
    let pick = exclude;
    let guard = 0;
    while ((pick === exclude || guard === 0) && guard < 10) {
        key = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
        const list = TOPIC_CATEGORIES[key];
        pick = list[Math.floor(Math.random() * list.length)];
        guard++;
    }
    return { topic: pick, category: CATEGORY_LABEL[key] || "Technology" };
}

const WIKI_API =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=extracts|pageimages|description|pageprops&explaintext=1" +
    "&exsectionformat=wiki&ppprop=disambiguation" +
    "&piprop=thumbnail&pithumbsize=640&redirects=1&titles=";

const STOP_SECTIONS =
    /^(see also|references|external links|notes|further reading|bibliography|citations|sources|footnotes|awards|honors|gallery|publications|reception|in popular culture)$/i;

// Parse Wikipedia text extract into structured, clean editorial content
function parseStructuredArticle(text, fallbackTitle) {
    const rawLines = text.split("\n");
    const introParagraphs = [];
    const sections = [];
    let currentSection = null;

    for (const raw of rawLines) {
        const line = raw.trim();
        if (!line) continue;

        // Skip citation bracket artifacts like [1], [edit]
        const cleanLine = line.replace(/\[\d+\]/g, "").replace(/\[edit\]/g, "").trim();
        if (!cleanLine) continue;

        const headingMatch = cleanLine.match(/^(={2,6})\s*(.+?)\s*\1$/);
        if (headingMatch) {
            const headingText = headingMatch[2].trim();
            if (STOP_SECTIONS.test(headingText)) {
                break; // Stop at reference/link-dump sections
            }

            // Finish previous section
            if (currentSection && currentSection.paragraphs.length > 0) {
                sections.push(currentSection);
            }

            currentSection = {
                title: headingText,
                level: headingMatch[1].length,
                paragraphs: []
            };
        } else {
            // Paragraph line
            if (currentSection) {
                if (currentSection.paragraphs.length < 3 && cleanLine.length > 40) {
                    currentSection.paragraphs.push(cleanLine);
                }
            } else {
                if (introParagraphs.length < 2 && cleanLine.length > 40) {
                    introParagraphs.push(cleanLine);
                }
            }
        }
    }

    if (currentSection && currentSection.paragraphs.length > 0) {
        sections.push(currentSection);
    }

    // Lead hook is the first strong intro paragraph
    const hook = introParagraphs[0] || (sections[0]?.paragraphs[0] ?? `${fallbackTitle} explores critical foundational advancements in modern engineering.`);

    // Take 2-3 logical body sections
    const selectedSections = sections.slice(0, 3);
    const blocks = [];

    // Add additional intro if present
    if (introParagraphs.length > 1) {
        blocks.push({ type: "p", text: introParagraphs[1] });
    }

    for (const sec of selectedSections) {
        blocks.push({ type: "h", level: 2, text: sec.title });
        for (const p of sec.paragraphs) {
            blocks.push({ type: "p", text: p });
        }
    }

    // Estimate word count & reading time
    const allText = [hook, ...blocks.map((b) => b.text)].join(" ");
    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.min(5, Math.ceil(wordCount / 180)));
    const readingTime = `${minutes} min read`;

    // Useful concise takeaway: from the last section's last paragraph or synthesis
    const lastParagraph = blocks.filter((b) => b.type === "p").slice(-1)[0]?.text;
    const takeaway = lastParagraph
        ? lastParagraph.length > 160
            ? lastParagraph.slice(0, 157).replace(/[,;]\s*$/, "") + "..."
            : lastParagraph
        : `Understanding ${fallbackTitle} provides key operational insight into contemporary technology and defense architectures.`;

    return {
        hook,
        blocks,
        takeaway,
        readingTime
    };
}

export async function nextArticle(excludeTopic) {
    // 1. Try online fetch
    if (typeof navigator === "undefined" || navigator.onLine !== false) {
        let last = excludeTopic;
        for (let attempt = 0; attempt < 4; attempt++) {
            const { topic, category } = randomTopic(last);
            last = topic;

            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 6000);
            try {
                const res = await fetch(WIKI_API + encodeURIComponent(topic), {
                    signal: ctrl.signal
                });
                clearTimeout(timer);
                if (!res.ok) continue;

                const data = await res.json();
                const page = Object.values(data.query.pages)[0];

                const isDisambig = page?.pageprops?.disambiguation !== undefined;
                if (!page || page.missing !== undefined || !page.extract || isDisambig) {
                    continue;
                }

                const structured = parseStructuredArticle(page.extract, page.title);

                const articleObj = {
                    topic,
                    category,
                    title: page.title,
                    description: page.description || `${category} briefing`,
                    readingTime: structured.readingTime,
                    hook: structured.hook,
                    blocks: structured.blocks,
                    takeaway: structured.takeaway,
                    thumb: page.thumbnail?.source,
                    url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"))
                };

                // Cache for offline resilience
                storeItem(CACHED_ARTICLES_KEY, articleObj);
                return articleObj;
            } catch {
                clearTimeout(timer);
                continue;
            }
        }
    }

    // 2. Offline / network fallback: use local cache or pre-seeded bank
    const cached = getStoredItems(CACHED_ARTICLES_KEY);
    const pool = cached.length >= 2 ? cached : OFFLINE_ARTICLES;
    const filtered = pool.filter((a) => a.topic !== excludeTopic);
    const pickFrom = filtered.length > 0 ? filtered : pool;
    const randomPick = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    return JSON.parse(JSON.stringify(randomPick));
}

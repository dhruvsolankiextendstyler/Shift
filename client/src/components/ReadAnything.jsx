import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal";
import { logActivity } from "../services/activity";

// Reading pool, grouped into three balanced categories. Each entry must
// resolve on en.wikipedia.org (used as the query title; redirects are followed
// server-side). Category-first selection (see randomTopic) gives each category
// an equal shot, so a longer list can't drown the others — Deep Read surfaces
// Army/Defence, Computer Science and Future Tech evenly instead of leaning on
// whichever list happens to be biggest.
const TOPIC_CATEGORIES = {
    defence: [
        "Indian Army",
        "Indian Military Academy",
        "Sam Manekshaw",
        "K. M. Cariappa",
        "Bipin Rawat",
        "Manoj Mukund Naravane",
        "Upendra Dwivedi",
        "V. K. Singh",
        "Dalbir Singh Suhag",
        "Manoj Pande",
        "J. J. Singh",
        "Bikram Singh (general)",
        "Harbaksh Singh",
        "Zorawar Singh",
        "Ian Cardozo",
        "Shaitan Singh",
        "Vikram Batra",
        "Manoj Kumar Pandey",
        "Somnath Sharma",
        "Sandeep Unnikrishnan",
        "Arun Khetarpal",
        "Yogendra Singh Yadav",
        "Jaswant Singh Rawat",
        "Special forces of India",
        "Para (Special Forces)",
        "Rashtriya Rifles",
        "Assam Rifles",
        "Gorkha regiments (India)",
        "Sikh Regiment",
        "Rajput Regiment",
        "Mechanised Infantry Regiment",
        "Indian Armoured Corps",
        "Regiment of Artillery (India)",
        "Mountain warfare",
        "Siachen Glacier",
        "Line of Control",
        "Line of Actual Control",
        "Kargil War",
        "Operation Meghdoot",
        "Operation Vijay (1999)",
        "Operation Parakram",
        "BrahMos",
        "Agni missile",
        "Prithvi (missile)",
        "Akash (missile)",
        "Pinaka multi-barrel rocket launcher",
        "K9 Thunder",
        "M777 howitzer",
        "T-90",
        "Arjun (tank)",
        "S-400 missile system",
        "HAL Prachand",
        "Boeing AH-64 Apache",
        "Sixth-generation fighter",
        "Military intelligence"
    ],
    computerScience: [
        "Algorithm",
        "Data structure",
        "Operating system",
        "Database",
        "Relational database",
        "Computer network",
        "Internet protocol suite",
        "Computer security",
        "Cryptography",
        "Distributed computing",
        "Software engineering",
        "Version control",
        "Compiler",
        "Programming language",
        "Central processing unit",
        "Computer architecture",
        "Cloud computing",
        "Big O notation",
        "Functional programming",
        "Object-oriented programming",
        "Machine learning",
        "Artificial intelligence"
    ],
    futureTech: [
        "Artificial general intelligence",
        "Robotics",
        "Autonomous robot",
        "Self-driving car",
        "Quantum computing",
        "Quantum cryptography",
        "Brain–computer interface",
        "Neuralink",
        "Space exploration",
        "Biotechnology",
        "CRISPR",
        "Nanotechnology",
        "Nuclear fusion",
        "Renewable energy",
        "Augmented reality",
        "Virtual reality",
        "3D printing",
        "Internet of things",
        "Blockchain"
    ]
};

const CATEGORY_KEYS = Object.keys(TOPIC_CATEGORIES);

// Pick a category with equal weight, then a topic inside it, avoiding an
// immediate repeat of the last topic.
function randomTopic(exclude) {
    let pick = exclude;
    while (pick === exclude) {
        const cat =
            CATEGORY_KEYS[
                Math.floor(Math.random() * CATEGORY_KEYS.length)
            ];
        const list = TOPIC_CATEGORIES[cat];
        pick = list[Math.floor(Math.random() * list.length)];
    }
    return pick;
}

// Drop exintro so we get the full article prose (extracts already strips
// references/infoboxes). exsectionformat=wiki wraps headings in == == so we
// can render them as real headings. pageprops flags disambiguation pages.
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

// Full-screen in-app reader — pulls a random topic from the pool. Controlled
// by the parent (ToolsMenu owns open/close); mounted alongside its sibling
// tools so all slides can share one downtime FAB.
function ReadAnything({ open, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [article, setArticle] = useState(null);

    const load = useCallback(async (exclude) => {
        setLoading(true);
        setError("");
        let lastPick = exclude;
        try {
            // Retry a few times so a disambiguation/empty hit rolls to a
            // real article instead of surfacing to the reader.
            for (let attempt = 0; attempt < 4; attempt++) {
                const topic = randomTopic(lastPick);
                lastPick = topic;

                const res = await fetch(API + encodeURIComponent(topic));
                if (!res.ok) throw new Error("fetch failed");
                const data = await res.json();
                const page = Object.values(data.query.pages)[0];

                const isDisambig =
                    page?.pageprops?.disambiguation !== undefined;
                if (
                    !page ||
                    page.missing !== undefined ||
                    !page.extract ||
                    isDisambig
                ) {
                    continue;
                }

                setArticle({
                    topic,
                    title: page.title,
                    description: page.description,
                    blocks: parseExtract(page.extract),
                    thumb: page.thumbnail?.source,
                    url:
                        "https://en.wikipedia.org/wiki/" +
                        encodeURIComponent(
                            page.title.replace(/ /g, "_")
                        )
                });
                return;
            }
            throw new Error("no content");
        } catch {
            setError("Couldn't reach the library. Try another.");
            setArticle(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // First open pulls a topic; reopening keeps the last read.
    useEffect(() => {
        if (open && !article && !loading && !error) load(null);
    }, [open, article, loading, error, load]);

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                labelledBy="read-title"
                variant="sheet"
            >
                <div className="read-sheet">
                    <div className="read-topbar">
                        <p className="eyebrow read-eyebrow">
                            ✦ DEEP READ
                        </p>
                        <button
                            className="read-close"
                            aria-label="Close reader"
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>

                    <div className="read-scroll">
                        {loading && (
                            <p className="message read-status">
                                Pulling something worth your minutes...
                            </p>
                        )}

                        {error && !loading && (
                            <p className="message read-status">{error}</p>
                        )}

                        {article && !loading && (
                            <article className="read-body">
                                {article.thumb && (
                                    <img
                                        className="read-thumb"
                                        src={article.thumb}
                                        alt=""
                                    />
                                )}
                                <h1
                                    id="read-title"
                                    className="read-heading"
                                >
                                    {article.title}
                                </h1>
                                {article.description && (
                                    <p className="read-desc">
                                        {article.description}
                                    </p>
                                )}
                                <div className="read-extract">
                                    {article.blocks.map((b, i) =>
                                        b.type === "h" ? (
                                            <h2
                                                key={i}
                                                className={
                                                    b.level >= 3
                                                        ? "read-h read-h-sub"
                                                        : "read-h"
                                                }
                                            >
                                                {b.text}
                                            </h2>
                                        ) : (
                                            <p
                                                key={i}
                                                className="read-p"
                                            >
                                                {b.text}
                                            </p>
                                        )
                                    )}
                                </div>
                                {article.url && (
                                    <a
                                        className="read-more"
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Read the full thing ↗
                                    </a>
                                )}
                            </article>
                        )}
                    </div>

                    <div className="read-actions">
                        <button
                            className="secondary-button"
                            onClick={() => {
                                logActivity("read");
                                onClose();
                            }}
                        >
                            Done
                        </button>
                        <button
                            className="shift-button read-another"
                            onClick={() => load(article?.topic)}
                            disabled={loading}
                        >
                            {loading ? "..." : "Another →"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default ReadAnything;

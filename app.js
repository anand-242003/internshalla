/**
 * Internshala auto-apply bot.
 *
 * SETUP
 *   npm install
 *   cp env.example .env        # edit values, add GROQ_API_KEY
 *   edit profile.txt            # your bio / background, used to generate answers
 *   put a logged-in cookies.json next to this script (use get-cookies.js)
 *
 * RUN
 *   node app.js
 *
 * SAFETY
 *   Set DRY_RUN=true in .env for your first run. The bot will fill every field
 *   using the AI and print what it *would* submit, but will not click Submit.
 *   Only flip DRY_RUN to false once you've checked a few generated answers.
 */

const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const path = require("path");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

puppeteer.use(StealthPlugin());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// CONFIG — everything here is overridable via .env
// ---------------------------------------------------------------------------

function listFromEnv(name, fallback) {
    const raw = process.env[name];
    return (raw && raw.trim().length ? raw : fallback)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

const CONFIG = {
    TARGET_ROLE_KEYWORDS: listFromEnv(
        "TARGET_ROLE_KEYWORDS",
        "backend,node,software engineer,developer,software,web,frontend,fullstack,react,python,javascript,engineer,full-stack,front-end,back-end,data analytics,data science,machine learning,ai,ml",
    ),
    TARGET_CATEGORIES: listFromEnv(
        "TARGET_CATEGORIES",
        "software-development,full-stack-development,web-development",
    ),
    NEGATIVE_KEYWORDS: listFromEnv(
        "NEGATIVE_KEYWORDS",
        "marketing,sales,hr,content writing,graphic design,video,social media,seo,customer support",
    ),
    MIN_STIPEND: process.env.MIN_STIPEND || "4000",
    MAX_APPLICATIONS: parseInt(process.env.MAX_APPLICATIONS || "15", 10),
    DRY_RUN: (process.env.DRY_RUN || "true").toLowerCase() === "true",
    HEADLESS: (process.env.HEADLESS || "false").toLowerCase() === "true",
    PROFILE_PATH: process.env.PROFILE_PATH || path.join(__dirname, "profile.txt"),
    COOKIES_PATH: process.env.COOKIES_PATH || path.join(__dirname, "cookies.json"),
    PER_INTERNSHIP_DELAY_MS: parseInt(
        process.env.PER_INTERNSHIP_DELAY_MS || "2000",
        10,
    ),
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GROQ_MODEL: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
};

// ---------------------------------------------------------------------------
// Profile loading — reads profile.txt, falls back to a stub
// ---------------------------------------------------------------------------

const DEFAULT_USER_BIO = `
You are an AI assistant generating personalized application answers.
Use only information contained in this profile and the internship details
provided to you. Never invent employers, titles, years of experience,
metrics, or achievements. Give the strongest truthful answer supported by
the profile. Keep answers concise, natural, and professional. No emojis,
no meta-commentary, no mention that an AI generated the answer.

(No profile.txt found next to the script — create one with your real
background. See profile.txt for the format this script expects.)
`;

function loadUserBio() {
    if (fs.existsSync(CONFIG.PROFILE_PATH)) {
        console.log(`Profile loaded from ${CONFIG.PROFILE_PATH}`);
        return fs.readFileSync(CONFIG.PROFILE_PATH, "utf8");
    }
    console.warn(
        `⚠ No profile found at ${CONFIG.PROFILE_PATH} — using a bare-bones fallback. ` +
            `Create profile.txt with your real background for meaningful answers.`,
    );
    return DEFAULT_USER_BIO;
}

const USER_BIO = loadUserBio();

// ---------------------------------------------------------------------------
// Dual-provider AI: Groq (primary) + Gemini (fallback)
// When Groq is rate-limited, instantly falls back to Gemini instead of waiting.
// ---------------------------------------------------------------------------

const ANTI_SLOP_INSTRUCTION = [
    "STRICT WRITING RULES (violating any makes the answer unusable):",
    "- NEVER use em dashes or en dashes. Use commas, periods, semicolons, or rewrite.",
    "- Hyphens (-) are fine only inside compound words like 'full-stack'.",
    '- Avoid these phrases entirely: "passionate about", "leverage my skills",',
    '  "cutting-edge", "innovative solutions", "dynamic environment", "synergy",',
    '  "results-driven", "highly motivated", "thrilled", "excited to",',
    '  "I would love to", "Furthermore", "Moreover", "In conclusion",',
    '  "It\'s worth noting", "I believe that", "delve", "utilize",',
    '  "In today\'s", "landscape", "foster", "streamline", "spearheaded",',
    '  "orchestrated", "pivotal", "transformative", "holistic", "seamlessly",',
    '  "robust", "dive deep", "deep dive", "honed", "aligns with".',
    "- Write like a real human college student, not a corporate press release.",
    "- Keep sentences short. No filler. No fluff.",
    "- Use plain, direct English. Prefer simple words over fancy ones.",
    "- Output ONLY plain text. No JSON, no code blocks, no curly braces, no markdown.",
].join("\n");

// Track which provider is currently preferred to avoid hammering a dead one
let preferredProvider = "groq"; // "groq" or "gemini"
let groqBackoffUntil = 0;

function validateAIKeys() {
    if (!CONFIG.GROQ_API_KEY && !CONFIG.GEMINI_API_KEY) {
        throw new Error(
            "No AI API key configured. Set at least one of:\n" +
                "  GROQ_API_KEY   (https://console.groq.com/keys)\n" +
                "  GEMINI_API_KEY (https://aistudio.google.com/app/apikey)",
        );
    }
    const providers = [];
    if (CONFIG.GROQ_API_KEY) providers.push(`Groq (${CONFIG.GROQ_MODEL})`);
    if (CONFIG.GEMINI_API_KEY) providers.push(`Gemini (${CONFIG.GEMINI_MODEL})`);
    console.log(`AI providers: ${providers.join(" + ")}`);
}

/**
 * Post-process AI output: strip JSON wrappers, markdown fences, unicode dashes,
 * and normalize whitespace so the output is plain text suitable for form fields.
 */
function cleanAIOutput(text) {
    let cleaned = text;

    // Strip markdown code fences
    cleaned = cleaned.replace(/```[\w]*\n?/g, "").replace(/```/g, "");

    // If the AI returned a JSON object, try to extract the text value
    const jsonMatch = cleaned.match(/^\s*\{[\s\S]*\}\s*$/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(cleaned);
            const values = Object.values(parsed).filter((v) => typeof v === "string");
            if (values.length > 0) cleaned = values.join(" ");
        } catch (_) {
            cleaned = cleaned.replace(/^\s*\{/, "").replace(/\}\s*$/, "");
        }
    }

    cleaned = cleaned.replace(/[{}]/g, "");
    cleaned = cleaned.replace(/[\u2013\u2014\u2015\u2012\u2011]/g, "-");
    cleaned = cleaned
        .replace(/\s+-\s+-\s+/g, ", ")
        .replace(/\s+-\s+/g, ", ")
        .replace(/,\s*,/g, ",")
        .replace(/\.\s*,/g, ".")
        .replace(/\s{2,}/g, " ")
        .trim();

    return cleaned;
}

// --- Groq provider ---

async function callGroq(prompt) {
    const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: CONFIG.GROQ_MODEL,
            messages: [
                { role: "system", content: ANTI_SLOP_INSTRUCTION },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
        },
        {
            headers: {
                Authorization: `Bearer ${CONFIG.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        },
    );
    return res.data?.choices?.[0]?.message?.content || "";
}

// --- Gemini provider ---

let geminiModel = null;

function getGeminiModel() {
    if (geminiModel) return geminiModel;
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
        model: CONFIG.GEMINI_MODEL,
        systemInstruction: ANTI_SLOP_INSTRUCTION,
    });
    return geminiModel;
}

async function callGemini(prompt) {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// --- Main askAI with per-provider retries ---

async function askAI(prompt) {
    // Build provider order
    const providers = [];
    if (CONFIG.GROQ_API_KEY && Date.now() >= groqBackoffUntil) {
        providers.push("groq");
    }
    if (CONFIG.GEMINI_API_KEY) {
        providers.push("gemini");
    }
    // If groq was skipped due to cooldown, add it as last resort
    if (CONFIG.GROQ_API_KEY && Date.now() < groqBackoffUntil && !providers.includes("groq")) {
        providers.push("groq");
    }

    if (providers.length === 0) return "";

    for (const provider of providers) {
        const maxRetries = CONFIG.AI_MAX_RETRIES;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                let text;
                if (provider === "groq") {
                    text = await callGroq(prompt);
                } else {
                    text = await callGemini(prompt);
                }
                console.log(`  [${provider}] OK`);
                return cleanAIOutput(text);
            } catch (err) {
                const status = err.response?.status || err.status;
                const msg = err.response?.data?.error?.message || err.message || String(err);
                const retryAfter = err.response?.headers?.["retry-after"];

                // Groq rate limited — set long cooldown, break to next provider
                if (provider === "groq" && (status === 429 || status === 503)) {
                    const waitSec = retryAfter ? Math.min(parseFloat(retryAfter), 120) : 60;
                    groqBackoffUntil = Date.now() + waitSec * 1000;
                    console.warn(
                        `  [groq] Rate limited. Cooldown ${Math.ceil(waitSec)}s. Switching to fallback.`,
                    );
                    break; // exit retry loop, try next provider
                }

                // Gemini 503 (high demand) or 429 — wait and retry THIS provider
                if (provider === "gemini" && (status === 429 || status === 503 || String(msg).includes("503") || String(msg).includes("429"))) {
                    if (attempt < maxRetries) {
                        const waitSec = retryAfter ? parseFloat(retryAfter) : 15 * attempt;
                        console.warn(
                            `  [gemini] ${status === 503 || String(msg).includes("503") ? "High demand (503)" : "Rate limited (429)"}. Waiting ${Math.ceil(waitSec)}s... (retry ${attempt}/${maxRetries})`,
                        );
                        await sleep(waitSec * 1000);
                        continue; // retry Gemini
                    }
                    console.warn(`  [gemini] Still failing after ${maxRetries} retries.`);
                    break; // move to next provider
                }

                // Other error — log and try next provider
                console.error(`  [${provider}] Error: ${msg}`);
                break;
            }
        }
    }

    console.warn("  All AI providers failed for this prompt.");
    return "";
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

function loadCookies(page) {
    if (!fs.existsSync(CONFIG.COOKIES_PATH)) {
        console.warn(
            `⚠ No cookies file at ${CONFIG.COOKIES_PATH} — you will almost certainly ` +
                `hit a login wall. Export a logged-in session's cookies first (use get-cookies.js).`,
        );
        return Promise.resolve();
    }
    const cookies = JSON.parse(fs.readFileSync(CONFIG.COOKIES_PATH, "utf8"));
    console.log(`Cookies loaded from ${CONFIG.COOKIES_PATH} (${cookies.length} cookies)`);
    return page.setCookie(...cookies);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let applicationsSubmitted = 0;
let shuttingDown = false;

async function main() {
    // Fail fast if no API key is configured
    validateAIKeys();

    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Ctrl+C handler — close browser gracefully instead of hanging
    process.on("SIGINT", async () => {
        console.log("\nCtrl+C received, closing browser...");
        shuttingDown = true;
        try {
            await browser.close();
        } catch (_) {
            /* already closed */
        }
        process.exit(0);
    });

    try {
        const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        );
        await page.setViewport({ width: 1366, height: 768 });
        await loadCookies(page);

        console.log("\n--- Configuration ---");
        console.log(`Target role keywords : ${CONFIG.TARGET_ROLE_KEYWORDS.join(", ")}`);
        console.log(`Categories to search : ${CONFIG.TARGET_CATEGORIES.join(", ")}`);
        console.log(`Max applications     : ${CONFIG.MAX_APPLICATIONS}`);
        console.log(`Dry run              : ${CONFIG.DRY_RUN}`);
        console.log(`AI primary           : Groq (${CONFIG.GROQ_MODEL})`);
        console.log(`AI fallback          : Gemini (${CONFIG.GEMINI_MODEL})`);
        console.log("---------------------\n");

        for (const category of CONFIG.TARGET_CATEGORIES) {
            if (shuttingDown || applicationsSubmitted >= CONFIG.MAX_APPLICATIONS) break;

            console.log(`\n>>> Category: ${category} <<<\n`);
            try {
                await page.goto(
                    `https://internshala.com/internships/work-from-home-${category}-internships/stipend-${CONFIG.MIN_STIPEND}/`,
                    { waitUntil: "networkidle2", timeout: 60000 },
                );

                await page
                    .waitForSelector("[internshipid]", { timeout: 20000 })
                    .catch(() => console.log(`No listings found for ${category}`));

                const internships = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll("[internshipid]")).map(
                        (card) => ({
                            id: card.getAttribute("internshipid"),
                            title:
                                card.querySelector(".job-internship-name")?.innerText || "",
                        }),
                    );
                });

                const matches = internships.filter((item) => {
                    const title = item.title.toLowerCase();
                    return (
                        CONFIG.TARGET_ROLE_KEYWORDS.some((kw) => title.includes(kw)) &&
                        !CONFIG.NEGATIVE_KEYWORDS.some((kw) => title.includes(kw))
                    );
                });

                const skipped = internships.filter(
                    (item) => !matches.some((m) => m.id === item.id),
                );

                console.log(
                    `[${category}] ${matches.length} of ${internships.length} listings match your role keywords.`,
                );

                if (skipped.length > 0) {
                    fs.writeFileSync(
                        "unfiltered.json",
                        JSON.stringify(skipped, null, 2),
                    );
                }

                for (const intern of matches) {
                    if (shuttingDown || applicationsSubmitted >= CONFIG.MAX_APPLICATIONS)
                        break;

                    console.log(`\nProcessing: ${intern.title} (${intern.id})`);
                    try {
                        await handleInternship(page, intern);
                    } catch (err) {
                        console.error(`Error processing ${intern.id}:`, err.message);
                    }

                    await sleep(
                        CONFIG.PER_INTERNSHIP_DELAY_MS +
                            Math.floor(Math.random() * 1500),
                    );
                }
            } catch (err) {
                console.error(`Error in category ${category}:`, err.message);
            }
        }

        console.log(
            `\nDone. ${applicationsSubmitted} application(s) ${
                CONFIG.DRY_RUN ? "would have been" : "were"
            } submitted this run.`,
        );
    } finally {
        if (!shuttingDown) {
            await browser.close();
        }
    }
}

// ---------------------------------------------------------------------------
// Per-internship handler
// ---------------------------------------------------------------------------

async function handleInternship(page, intern) {
    // Scroll to the card and click it
    await page.evaluate((id) => {
        document.querySelector(`[internshipid="${id}"]`)?.scrollIntoView();
    }, intern.id);

    await page.click(`[internshipid="${intern.id}"]`);

    // Wait for the application form to appear
    await page
        .waitForSelector("#assessment_questions_container", { timeout: 10000 })
        .catch(() => null);

    const formInfo = await page.evaluate(() => {
        const container = document.querySelector("#assessment_questions_container");
        if (!container) return null;

        const questions = [];
        container
            .querySelectorAll(".questions-container .form-group")
            .forEach((group) => {
                const label = group
                    .querySelector(".assessment_question label")
                    ?.innerText.trim();
                if (!label) return;

                const textarea = group.querySelector("textarea");
                if (textarea) {
                    questions.push({
                        type: "text",
                        label,
                        name: textarea.getAttribute("name"),
                        id: textarea.getAttribute("id"),
                    });
                    return;
                }

                const numericInput = group.querySelector("input[type='number']");
                if (numericInput) {
                    questions.push({
                        type: "numeric",
                        label,
                        name: numericInput.getAttribute("name"),
                        id: numericInput.getAttribute("id"),
                    });
                    return;
                }

                const rangeSelect = group.querySelector(
                    ".custom_question_range_container select",
                );
                if (rangeSelect) {
                    const options = Array.from(
                        rangeSelect.querySelectorAll("option"),
                    )
                        .filter((opt) => opt.value !== "")
                        .map((opt) => ({
                            value: opt.value,
                            label: opt.innerText.trim(),
                        }));
                    questions.push({
                        type: "dropdown",
                        label,
                        name: rangeSelect.getAttribute("name"),
                        id: rangeSelect.getAttribute("id"),
                        options,
                    });
                    return;
                }

                const mcqContainer = group.querySelector(
                    ".custom_question_mcq_container, .check_group, .custom_question_boolean_container",
                );
                if (mcqContainer) {
                    const options = Array.from(
                        mcqContainer.querySelectorAll(
                            ".checkbox, .radio, .form-check",
                        ),
                    )
                        .map((cb) => {
                            const input = cb.querySelector("input");
                            if (!input) return null;
                            const labelEl = cb.querySelector("label");
                            return {
                                value: input.getAttribute("value"),
                                label:
                                    labelEl?.innerText.trim() ||
                                    input.getAttribute("value"),
                                id: input.getAttribute("id"),
                            };
                        })
                        .filter((o) => o && o.id);

                    if (options.length > 0) {
                        questions.push({ type: "mcq", label, options });
                    }
                }
            });

        return {
            questions,
            hasCoverLetter: !!document.querySelector("#cover_letter_holder"),
            company:
                document.querySelector(".company_name")?.innerText ||
                "Unknown company",
            description:
                document.querySelector(".job_description")?.innerText || "",
        };
    });

    if (!formInfo) {
        console.log(`Could not find application form for ${intern.id}, skipping.`);
        return;
    }

    console.log(
        `Form found — ${formInfo.questions.length} question(s), ` +
            `cover letter: ${formInfo.hasCoverLetter ? "yes" : "no"}`,
    );

    const context = `
${USER_BIO}
----------
INTERNSHIP DETAILS:
Company: ${formInfo.company}
Role: ${intern.title}
Description: ${formInfo.description}
    `;

    let fieldsFilled = 0;
    const totalFields = formInfo.questions.length + (formInfo.hasCoverLetter ? 1 : 0);

    // Fill cover letter
    if (formInfo.hasCoverLetter) {
        const filled = await fillCoverLetter(page, context);
        if (filled) fieldsFilled++;
    }

    // Fill each assessment question
    for (const q of formInfo.questions) {
        const filled = await fillQuestion(page, q, context);
        if (filled) fieldsFilled++;
    }

    // Log fill results
    if (totalFields > 0) {
        if (fieldsFilled === 0) {
            console.warn(
                `Warning: 0/${totalFields} field(s) filled (AI may be rate-limited). Submitting anyway.`,
            );
        } else {
            console.log(`Filled ${fieldsFilled}/${totalFields} field(s).`);
        }
    }

    // DRY RUN — log but don't submit
    if (CONFIG.DRY_RUN) {
        console.log(`[DRY RUN] Would submit application for "${intern.title}".`);
        await closeModal(page);
        return;
    }

    // Actually submit
    console.log("Submitting...");
    await page.evaluate(() =>
        document.querySelector("#submit")?.scrollIntoView(),
    );
    await sleep(500);
    await page.click("#submit");
    await sleep(4000);
    await closeModal(page);

    applicationsSubmitted += 1;
    console.log(
        `✓ Submitted: ${intern.title} (${applicationsSubmitted}/${CONFIG.MAX_APPLICATIONS})`,
    );
}

// ---------------------------------------------------------------------------
// Modal helpers
// ---------------------------------------------------------------------------

async function closeModal(page) {
    // First try clicking the X button or pressing Escape to start closing
    const closeBtn = await page.$(".close");
    if (closeBtn) {
        await closeBtn.click();
    } else {
        await page.keyboard.press("Escape").catch(() => {});
    }
    await sleep(1000);

    // Internshala shows an "Exit application?" confirmation dialog.
    // We need to click the "Exit" button to actually close it.
    try {
        const exitClicked = await page.evaluate(() => {
            // Look for the "Exit" button in the confirmation dialog
            const buttons = document.querySelectorAll(
                ".modal.show button, .modal.in button, .swal2-confirm, .swal2-popup button, button"
            );
            for (const btn of buttons) {
                const text = btn.textContent.trim().toLowerCase();
                if (text === "exit" || text === "yes, exit" || text === "leave") {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        if (exitClicked) {
            console.log("Clicked 'Exit' on confirmation dialog.");
            await sleep(1500);
        }
    } catch (_) {
        /* dialog might not appear, that's fine */
    }
}

// ---------------------------------------------------------------------------
// Cover letter
// ---------------------------------------------------------------------------

async function fillCoverLetter(page, context) {
    const prompt =
        `Write a professional cover letter for the internship using my details. ` +
        `context:${context}. Start directly with the letter and keep it under 150 words.`;

    try {
        const text = await askAI(prompt);
        if (!text) {
            console.warn("AI returned empty cover letter, skipping.");
            return false;
        }
        console.log("Cover letter generated:", text.substring(0, 80) + "...");

        await page.waitForSelector("#cover_letter_holder", { timeout: 15000 });

        const editorHandle = await page.evaluateHandle(() =>
            document
                .querySelector("#cover_letter_holder")
                ?.querySelector(".ql-editor"),
        );
        const el = editorHandle.asElement();
        if (!el) {
            throw new Error(
                "Could not find Quill editor inside #cover_letter_holder",
            );
        }

        await el.evaluate((node) =>
            node.scrollIntoView({ block: "center" }),
        );
        await sleep(1000);

        const box = await el.boundingBox();
        if (box) {
            await page.mouse.click(
                box.x + box.width / 2,
                box.y + box.height / 2,
            );
            await sleep(500);
            await page.keyboard.type(text);
        } else {
            console.warn("Bounding box null, attempting direct type.");
            await el.type(text);
        }
        return true;
    } catch (e) {
        console.error("Error setting cover letter:", e.message);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Question filler
// ---------------------------------------------------------------------------

async function fillQuestion(page, q, context) {
    if (q.type === "text") {
        const prompt =
            `Answer this internship assessment question: "${q.label}". Context: ${context}. ` +
            `Rules: Output ONLY plain text. No JSON, no code blocks, no curly braces, no markdown. ` +
            `If the question asks for a project link, pick the single most relevant project and ` +
            `write a short paragraph about it with the URL included naturally. ` +
            `Keep it concise and professional. Just the answer, no headers or explanations.`;
        try {
            const text = await askAI(prompt);
            if (text) {
                console.log(`[text] "${q.label}" → ${text.substring(0, 60)}...`);
                await page.type(`textarea[name="${q.name}"]`, text);
                return true;
            } else {
                console.warn(`AI returned empty for "${q.label}", skipping.`);
                return false;
            }
        } catch (e) {
            console.error(`Error answering text question "${q.label}":`, e.message);
            return false;
        }
    }

    if (q.type === "numeric") {
        const prompt =
            `Answer this internship assessment question: "${q.label}" with a single numeric ` +
            `value based on my context. Context: ${context}. Only return the number, nothing else.`;
        try {
            const raw = await askAI(prompt);
            const num = raw.replace(/[^\d]/g, "") || "0";
            console.log(`[numeric] "${q.label}" → ${num}`);
            await page.type(`input#${q.id}`, num);
            return true;
        } catch (e) {
            console.error(`Error answering numeric question "${q.label}":`, e.message);
            return false;
        }
    }

    if (q.type === "dropdown" || q.type === "mcq") {
        const optionsStr = q.options
            .map((o, i) => `${i}: ${o.label}`)
            .join("\n");
        const prompt =
            `For the question: "${q.label}", pick the most appropriate option index based on my bio.\n` +
            `Options:\n${optionsStr}\n\nBio context: ${context}\nOnly return the index number, nothing else.`;
        try {
            const raw = await askAI(prompt);
            const index = parseInt(raw.replace(/\D/g, ""), 10);

            if (isNaN(index) || !q.options[index]) {
                console.warn(
                    `Could not resolve an option for "${q.label}" (AI said: "${raw}"), skipping.`,
                );
                return false;
            }

            if (q.type === "dropdown") {
                console.log(
                    `[dropdown] "${q.label}" → option ${index}: ${q.options[index].label}`,
                );
                await page.select(`select#${q.id}`, q.options[index].value);
                await page.evaluate((id) => {
                    document
                        .getElementById(id)
                        ?.dispatchEvent(new Event("change"));
                }, q.id);
            } else {
                console.log(
                    `[mcq] "${q.label}" → option ${index}: ${q.options[index].label}`,
                );
                await page.evaluate((id) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.scrollIntoView({ block: "center" });
                        el.click();
                    }
                }, q.options[index].id);
            }
            return true;
        } catch (e) {
            console.error(
                `Error answering ${q.type} question "${q.label}":`,
                e.message,
            );
            return false;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Entry point — always exits cleanly
// ---------------------------------------------------------------------------

main()
    .catch((err) => console.error("Fatal error:", err.message || err))
    .finally(() => {
        console.log("Exiting.");
        process.exit(0);
    });

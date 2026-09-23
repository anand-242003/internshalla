/**
 * Internshala auto-apply bot.
 *
 * SETUP
 *   npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth dotenv
 *   cp .env.example .env      # edit values
 *   edit profile.txt          # your bio / background, used to generate answers
 *   put a logged-in cookies.json next to this script (export from your browser)
 *
 * RUN
 *   node auto-apply.js
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
const { execFileSync } = require("child_process");

require("dotenv").config();

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// CONFIG — everything here is overridable via .env, nothing else needs editing
// ---------------------------------------------------------------------------

function listFromEnv(name, fallback) {
    const raw = process.env[name];
    return (raw && raw.trim().length ? raw : fallback)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

const CONFIG = {
    // Only titles containing at least one of these words are considered.
    TARGET_ROLE_KEYWORDS: listFromEnv(
        "TARGET_ROLE_KEYWORDS",
        "backend,node,software engineer",
    ),
    // Only these category URLs are visited (must be valid Internshala category slugs).
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
    COPILOT_BIN: process.env.COPILOT_BIN || "copilot",
    PER_INTERNSHIP_DELAY_MS: parseInt(
        process.env.PER_INTERNSHIP_DELAY_MS || "2000",
        10,
    ),
};

// Fallback profile used only if profile.txt is missing, so the script never
// crashes on a fresh checkout. Put your real details in profile.txt instead
// of editing this.
const DEFAULT_USER_BIO = `
You are an AI assistant generating personalized application answers.
Use only information contained in this profile and the internship details
provided to you. Never invent employers, titles, years of experience,
metrics, or achievements. Give the strongest truthful answer supported by
the profile. Keep answers concise, natural, and professional. No emojis,
no meta-commentary, no mention that an AI generated the answer.

(No profile.txt found next to the script — create one with your real
background. See profile.txt.example for the format this script expects.)
`;

function loadUserBio() {
    if (fs.existsSync(CONFIG.PROFILE_PATH)) {
        return fs.readFileSync(CONFIG.PROFILE_PATH, "utf8");
    }
    console.warn(
        `No profile found at ${CONFIG.PROFILE_PATH} — using a bare-bones fallback. ` +
            `Create profile.txt with your real background for meaningful answers.`,
    );
    return DEFAULT_USER_BIO;
}

const USER_BIO = loadUserBio();

// ---------------------------------------------------------------------------
// Copilot CLI wrapper — uses execFileSync (no shell) so untrusted text from
// job descriptions can never be interpreted as shell syntax.
// ---------------------------------------------------------------------------

async function askCopilot(prompt) {
    try {
        const raw = execFileSync(CONFIG.COPILOT_BIN, ["-p", prompt], {
            encoding: "utf8",
            maxBuffer: 1024 * 1024 * 10,
        });
        return raw
            .split("\n")
            .filter((line) => !/^(Changes|Requests|Tokens)\b/.test(line))
            .join("\n")
            .trim();
    } catch (err) {
        console.error("Copilot CLI error:", err.message);
        return "";
    }
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

function loadCookies(page) {
    if (!fs.existsSync(CONFIG.COOKIES_PATH)) {
        console.warn(
            `No cookies file at ${CONFIG.COOKIES_PATH} — you will almost certainly ` +
                `hit a login wall. Export a logged-in session's cookies to this path first.`,
        );
        return Promise.resolve();
    }
    const cookies = JSON.parse(fs.readFileSync(CONFIG.COOKIES_PATH, "utf8"));
    console.log("Cookies loaded from", CONFIG.COOKIES_PATH);
    return page.setCookie(...cookies);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let applicationsSubmitted = 0;
let shuttingDown = false;

async function main() {
    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    process.on("SIGINT", async () => {
        console.log("\nCtrl+C received, closing browser...");
        shuttingDown = true;
        await browser.close();
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

        console.log(`Target role keywords: ${CONFIG.TARGET_ROLE_KEYWORDS.join(", ")}`);
        console.log(`Categories to search: ${CONFIG.TARGET_CATEGORIES.join(", ")}`);
        console.log(`Max applications this run: ${CONFIG.MAX_APPLICATIONS}`);
        console.log(`Dry run: ${CONFIG.DRY_RUN}`);

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

                console.log(
                    `[${category}] ${matches.length} of ${internships.length} listings match your role keywords.`,
                );

                for (const intern of matches) {
                    if (shuttingDown || applicationsSubmitted >= CONFIG.MAX_APPLICATIONS) break;

                    console.log(`\nProcessing: ${intern.title} (${intern.id})`);
                    try {
                        await handleInternship(page, intern);
                    } catch (err) {
                        console.error(`Error processing ${intern.id}:`, err.message);
                    }

                    await sleep(
                        CONFIG.PER_INTERNSHIP_DELAY_MS + Math.floor(Math.random() * 1500),
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

async function handleInternship(page, intern) {
    await page.evaluate((id) => {
        document.querySelector(`[internshipid="${id}"]`)?.scrollIntoView();
    }, intern.id);

    await page.click(`[internshipid="${intern.id}"]`);

    await page
        .waitForSelector("#assessment_questions_container", { timeout: 10000 })
        .catch(() => null);

    const formInfo = await page.evaluate(() => {
        const container = document.querySelector("#assessment_questions_container");
        if (!container) return null;

        const questions = [];
        container.querySelectorAll(".questions-container .form-group").forEach((group) => {
            const label = group.querySelector(".assessment_question label")?.innerText.trim();
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
                const options = Array.from(rangeSelect.querySelectorAll("option"))
                    .filter((opt) => opt.value !== "")
                    .map((opt) => ({ value: opt.value, label: opt.innerText.trim() }));
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
                    mcqContainer.querySelectorAll(".checkbox, .radio, .form-check"),
                )
                    .map((cb) => {
                        const input = cb.querySelector("input");
                        if (!input) return null;
                        const labelEl = cb.querySelector("label");
                        return {
                            value: input.getAttribute("value"),
                            label: labelEl?.innerText.trim() || input.getAttribute("value"),
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
            company: document.querySelector(".company_name")?.innerText || "Unknown company",
            description: document.querySelector(".job_description")?.innerText || "",
        };
    });

    if (!formInfo) {
        console.log(`Could not find application form for ${intern.id}, skipping.`);
        return;
    }

    const context = `
${USER_BIO}
----------
INTERNSHIP DETAILS:
Company: ${formInfo.company}
Role: ${intern.title}
Description: ${formInfo.description}
  `;

    if (formInfo.hasCoverLetter) {
        await fillCoverLetter(page, context);
    }

    for (const q of formInfo.questions) {
        await fillQuestion(page, q, context);
    }

    if (CONFIG.DRY_RUN) {
        console.log(`[DRY RUN] Would submit application for "${intern.title}".`);
        await closeModal(page);
        return;
    }

    console.log("Submitting...");
    await page.evaluate(() => document.querySelector("#submit")?.scrollIntoView());
    await sleep(500);
    await page.click("#submit");
    await sleep(4000);
    await closeModal(page);

    applicationsSubmitted += 1;
    console.log(`Submitted: ${intern.title} (${applicationsSubmitted}/${CONFIG.MAX_APPLICATIONS})`);
}

async function closeModal(page) {
    const closeBtn = await page.$(".close");
    if (closeBtn) {
        await closeBtn.click();
    } else {
        await page.keyboard.press("Escape").catch(() => {});
    }
}

async function fillCoverLetter(page, context) {
    const prompt =
        `Write a professional cover letter for the internship using my details. ` +
        `context:${context}. Start directly with the letter and keep it under 150 words.`;

    try {
        const text = await askCopilot(prompt);
        if (!text) return;
        console.log("Cover letter:", text);

        await page.waitForSelector("#cover_letter_holder", { timeout: 15000 });
        const editorHandle = await page.evaluateHandle(() =>
            document.querySelector("#cover_letter_holder")?.querySelector(".ql-editor"),
        );
        const el = editorHandle.asElement();
        if (!el) throw new Error("Could not find Quill editor inside #cover_letter_holder");

        await el.evaluate((node) => node.scrollIntoView({ block: "center" }));
        await sleep(1000);

        const box = await el.boundingBox();
        if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            await sleep(500);
            await page.keyboard.type(text);
        } else {
            await el.type(text);
        }
    } catch (e) {
        console.error("Error setting cover letter:", e.message);
    }
}

async function fillQuestion(page, q, context) {
    if (q.type === "text") {
        const prompt =
            `Answer this internship assessment question: "${q.label}". Context: ${context}. ` +
            `Keep it concise and professional. Don't include a header or explanation, just the answer.`;
        const text = await askCopilot(prompt);
        if (text) await page.type(`textarea[name="${q.name}"]`, text);
        return;
    }

    if (q.type === "numeric") {
        const prompt =
            `Answer this internship assessment question: "${q.label}" with a single numeric ` +
            `value based on my context. Context: ${context}. Only return the number.`;
        const raw = await askCopilot(prompt);
        const num = raw.replace(/[^\d]/g, "") || "0";
        await page.type(`input#${q.id}`, num);
        return;
    }

    if (q.type === "dropdown" || q.type === "mcq") {
        const optionsStr = q.options.map((o, i) => `${i}: ${o.label}`).join("\n");
        const prompt =
            `For the question: "${q.label}", pick the most appropriate option index based on my bio.\n` +
            `Options:\n${optionsStr}\n\nBio context: ${context}\nOnly return the index number.`;
        const raw = await askCopilot(prompt);
        const index = parseInt(raw.replace(/\D/g, ""), 10);

        if (isNaN(index) || !q.options[index]) {
            console.warn(`Could not resolve an option for "${q.label}", skipping.`);
            return;
        }

        if (q.type === "dropdown") {
            await page.select(`select#${q.id}`, q.options[index].value);
            await page.evaluate((id) => {
                document.getElementById(id)?.dispatchEvent(new Event("change"));
            }, q.id);
        } else {
            await page.evaluate((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ block: "center" });
                    el.click();
                }
            }, q.options[index].id);
        }
    }
}

main()
    .catch((err) => console.error("Fatal error:", err))
    .finally(() => {
        console.log("Exiting.");
        process.exit(0);
    });
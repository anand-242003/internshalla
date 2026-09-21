const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { execSync } = require("child_process");

require("dotenv").config();

puppeteer.use(StealthPlugin());
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const USER_BIO = `
You are an AI assistant generating personalized application answers for Anand Mishra.

IMPORTANT RULES

Use only information contained in this profile and the internship details provided to you.

Never invent employers, job titles, years of experience, users, revenue, salary, achievements, metrics, responsibilities, technologies, certifications, or production experience.

Anand is an early-career undergraduate student. Do not describe him as a senior engineer or claim years of professional experience that are not explicitly provided.

When an answer requires information that is not available, give the strongest truthful answer that can be supported by the profile.

Always try to produce a usable answer rather than refusing unnecessarily.

Keep answers concise, natural, professional, and appropriate for an internship application.

Do not use emojis.

Do not use unnecessary headings, introductions, explanations, or meta-commentary when answering application questions.

Do not mention that an AI generated the answer.

Do not exaggerate projects. Clearly distinguish between projects, prototypes, experiments, open-source work, and verified experience.

When a question asks about a technology, use it only when it is actually supported by the profile.

When a question asks for a numerical value such as years of experience, use the most accurate value supported by the profile. Do not convert project exposure into professional experience.

PERSONAL PROFILE

Name: Anand Mishra

Location: India

Education: Bachelor of Technology in Artificial Intelligence

University: Newton School of Technology, Rishihood University

Degree period: 2024-2028

Current stage: Early-career undergraduate student

Current career direction:
Software Engineering
Backend Engineering
AI Engineering
Machine Learning Engineering
Cloud and Platform Engineering
Developer Tooling
Systems Engineering
Open Source Engineering

TECHNICAL IDENTITY

Anand is an early-career software and AI-focused engineer who is building foundations across computer science, software engineering, backend systems, AI applications, cloud infrastructure, developer tooling, and open source.

His strongest recurring technical interests include:

Software Engineering
Full-stack development
Backend engineering
API design
Databases
Software architecture
System design
Real-time systems
Authentication and authorization
Performance
Reliability
Security

Cloud and Infrastructure
Docker
Kubernetes
AWS
CI/CD
Cloud-native systems
Deployment automation
Observability
Infrastructure

AI and Machine Learning
Python
Machine learning
AI applications
LLM applications
RAG
Agentic systems
LangGraph
Gemini APIs
OpenAI APIs
Data pipelines
Inference systems
AI-powered products

Developer and Systems Engineering
Go
AST manipulation
Compile-time instrumentation
Developer tooling
Execution environments
Code generation
Tooling infrastructure

Open Source
OpenTelemetry
CNCF ecosystem
Go
ASTs
Compile-time instrumentation
CI
Testing
Portability
Error handling
Developer tooling
Production code review

VERIFIED RESUME PROFILE

The current resume presents Anand as a Data Analyst and AI undergraduate.

Relevant skills shown on the current resume include:

Python
SQL
Pandas
NumPy
Matplotlib
Seaborn
Tableau
Looker Studio
Jupyter Notebook
Excel
Google Sheets
Statistics
Data Cleaning
Exploratory Data Analysis
Dashboarding
Agile and Scrum

EDUCATION

Bachelor of Technology in Artificial Intelligence
Newton School of Technology, Rishihood University
2024-2028
GPA: 7.79 / 10.0

ACADEMIC BACKGROUND

Class XII:
New Bombay City School
78.0 percent

Class X:
Podar International School
91.0 percent

PROJECTS AND ENGINEERING WORK

NEXORITHM

Nexorithm is a coding platform and execution-environment project involving:

React
Node.js
Docker
Monaco Editor
Isolated code execution
Resource limits
Execution timeouts
Backend architecture
CI/CD
Production deployment concepts

When discussing Nexorithm, focus on engineering concepts such as isolated execution, resource control, backend architecture, Docker-based execution, and developer tooling.

Do not claim production scale, number of users, revenue, or commercial deployment unless explicitly provided.

NANOREACH

NanoReach is a full-stack influencer marketing and campaign platform involving:

Next.js
TypeScript
PostgreSQL
Prisma
YouTube API
Fraud and engagement detection
Rate limiting
Validation
Deployment automation

When relevant, discuss backend architecture, data handling, API integration, validation, rate limiting, and deployment.

JOB PORTAL

A recruitment platform involving:

React
Node.js
Express
MongoDB
Socket.io
JWT
OAuth
RBAC
Resume and application workflows
Real-time communication

When relevant, emphasize authentication, authorization, real-time communication, backend APIs, database design, and application workflows.

ACADQ / ACADIQ

An AI and ML education-oriented project involving:

Python
Machine learning
Data preprocessing
Classification
Regression
Clustering
RAG
LangGraph
FastAPI
Streamlit
Vector search
Knowledge retrieval
Personalized recommendations
Agentic learning systems

When discussing this project, focus on the actual AI/ML engineering concepts involved rather than making generic claims about artificial intelligence.

EMWARE.AI

An AI travel-planning product involving:

React
Google Gemini
Google Places
Google Maps
Pexels
Personalized itinerary generation
AI integration
Frontend performance

Use this project when an internship involves AI applications, LLM integration, APIs, frontend engineering, or travel/product applications.

LLDSIM / LLD STUDIO

LLDSIM is an interactive developer-learning and productivity project focused on:

Low-level design
Object-oriented design
UML-style modeling
Linting
Scoring
Code generation
Architecture evaluation
Browser-based interactive tooling

The conceptual positioning is:

LeetCode for Object-Oriented Architecture

When relevant, emphasize software architecture, object-oriented design, developer tooling, interactive browser applications, code generation, and evaluation systems.

FUNDPOINT

FundPoint is a fintech and crowdfunding startup concept involving:

Retail investing
Startup funding
Platform economics
Risk mechanisms
Compliance considerations
Investor UX
Startup ecosystem research

Treat FundPoint as a product and startup exploration unless Anand explicitly states that a production version has shipped.

MINI CLOUD PLATFORM

A learning and engineering project involving:

Docker
Node.js
Container orchestration
API-driven container execution
Cloud-platform concepts

Use this when the internship involves cloud, DevOps, infrastructure, containers, backend systems, or platform engineering.

TERMINAL MUSIC PLAYER

A Node.js and VLC-based terminal application and systems-learning project.

Use only when relevant to CLI development, Node.js, systems programming, or application architecture.

OPEN SOURCE

Anand has explored and worked on contributions in production open-source ecosystems, particularly OpenTelemetry and CNCF-related projects.

Relevant areas include:

Go
ASTs
Compile-time instrumentation
CI
Testing
Portability
Error handling
Developer tooling
Production code review

When answering open-source questions, do not describe activity as merely GitHub contributions.

Focus on technical understanding, code review, testing, upstream engineering, developer tooling, and contribution quality when supported by the question.

DATA ANALYTICS PROJECTS

TTC Subway Delay Data Analysis

Technologies:
Python
SQL
Pandas
Tableau

Work included:
Analyzing subway delay data
Identifying peak congestion periods
Identifying high-risk stations
Cleaning and processing datasets
Time-based analysis
Route-level analysis
Building Tableau dashboards
Analyzing operational inefficiencies

Olist E-Commerce Business Insights

Technologies:
Python
Jupyter Notebook
Tableau

Work included:
Analyzing 100K+ orders
Evaluating seller performance
Analyzing delivery efficiency
Defining customer satisfaction and operational metrics
Building dashboards
Analyzing revenue trends
Analyzing geographic sales distribution
Providing logistics and retention recommendations

ACHIEVEMENT

UNESCO Youth Hackathon 2024

Ranked Top 20 globally among 200+ teams across 68 countries.

Use this achievement only when relevant to questions about competitions, problem solving, collaboration, innovation, or extracurricular achievements.

CAREER STAGE

Anand is currently an undergraduate student and should be represented as an early-career candidate.

Do not describe Anand as having 4+ years of professional experience.

Do not describe personal projects as professional employment.

Do not claim that Anand has worked at companies unless that company and role are explicitly present in the provided information.

Do not fabricate internship experience.

APPLICATION POSITIONING

For software engineering internships, emphasize relevant software engineering projects, backend development, APIs, databases, architecture, Docker, real-time systems, authentication, and developer tooling.

For backend internships, emphasize Node.js, Express, databases, APIs, authentication, authorization, Docker, backend architecture, performance, and reliability.

For AI/ML internships, emphasize Python, machine learning, data preprocessing, RAG, LLM applications, LangGraph, vector search, AI integrations, and relevant AI projects.

For data analyst internships, emphasize Python, SQL, Pandas, statistics, EDA, data cleaning, Tableau, dashboards, and the verified analytics projects.

For cloud or DevOps internships, emphasize Docker, Kubernetes, AWS, CI/CD, container execution, deployment automation, observability, and infrastructure concepts when relevant.

For developer tooling or systems internships, emphasize Go, ASTs, compile-time instrumentation, code generation, execution environments, developer tooling, and OpenTelemetry when relevant.

For open-source internships, emphasize OpenTelemetry, CNCF ecosystems, Go, testing, code review, ASTs, compile-time instrumentation, and upstream contribution experience when relevant.

QUESTION ANSWERING RULES

If asked:
"Why should we hire you?"

Connect Anand's actual technical work and learning ability to the requirements of the role. Do not use generic claims.

If asked:
"Tell us about yourself."

Give a concise introduction covering:
Anand's B.Tech AI education
Relevant technical direction
Most relevant projects
Current interest in the specific role

If asked:
"Why do you want this internship?"

Connect the internship's actual requirements to Anand's existing technical interests and projects.

Do not claim knowledge of the company's internal culture or team unless provided in the internship description.

If asked:
"What are your strengths?"

Use evidence-backed strengths such as:
Building technical projects
Learning difficult technical concepts
Working across software and AI
Exploring systems and architecture
Open-source engineering
Data analysis
Problem solving

Only mention a strength when it can be reasonably supported by the profile.

If asked:
"What are your weaknesses?"

Give an honest early-career answer without inventing personal problems.

A reasonable supported theme is that Anand has broad interests across software engineering, AI, cloud, infrastructure, open source, and developer tooling, creating a need to continuously deepen fundamentals and prioritize depth over breadth.

If asked:
"How many years of experience do you have?"

Do not claim 4+ years.

Represent Anand as an undergraduate with project, academic, open-source, and technical experience as appropriate.

If asked:
"What is your expected salary/stipend?"

Do not invent a number unless one is explicitly provided elsewhere.

If asked:
"Are you available for full-time work?"

Do not invent availability. Base the response only on the information supplied in the internship details or explicit user information.

If asked about a technology not listed in this profile, do not claim professional experience with it.

ANSWER STYLE

Answers should sound like a real ambitious undergraduate engineer.

Avoid:
"passionate about technology"
"results-driven professional"
"highly motivated individual"
"dynamic environment"
"leverage my skills"
"cutting-edge solutions"
"synergy"
"innovative thinker"

unless the wording is genuinely necessary.

Prefer concrete technical language.

Instead of:
"I am passionate about building innovative solutions."

Prefer:
"I enjoy building systems where I can understand the underlying architecture, implement the solution, and reason about the engineering trade-offs."

Do not make every answer sound identical.

Adapt every response to:
The internship title
The company
The job description
The assessment question
The required answer format

COVER LETTER RULES

If asked to write a cover letter:

Keep it concise.

Mention only projects and skills relevant to the internship.

Connect the candidate's existing evidence to the role.

Do not list every technology Anand knows.

Do not invent company-specific facts.

Do not claim previous professional experience unless explicitly supported.

ASSESSMENT QUESTION RULES

For text questions:
Answer directly and concisely.

For numeric questions:
Return only the numeric value when a defensible value exists.

For dropdown or multiple-choice questions:
Choose the option that is most factually consistent with Anand's profile.

Never select an answer merely because it appears more impressive if it would be false.

For experience questions:
Distinguish academic/project exposure from professional employment.

For questions about skills:
Select only technologies and capabilities actually supported by this profile.

FORCED PERSONALIZATION

Before answering an internship question, silently determine:

1. What is the internship actually asking for?
2. Which part of Anand's background is most relevant?
3. What concrete evidence supports the answer?
4. What should not be claimed?
5. What is the shortest truthful answer that presents the strongest relevant evidence?

Do not dump the entire profile into every answer.

Use the smallest amount of background necessary to create a strong personalized response.

FINAL PRINCIPLE

Make Anand's applications stronger through accurate personalization, not exaggeration.

The objective is to communicate genuine technical ability clearly and credibly.
`;

async function askCopilot(prompt) {
    try {
        const escapedPrompt = prompt
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");
        const command = `copilot -p "${escapedPrompt}" 2>/dev/null | sed '/^Changes/d;/^Requests/d;/^Tokens/d'`;
        const response = execSync(command, { encoding: "utf8", shell: "/bin/zsh" });
        return response.trim();
    } catch (err) {
        console.error("Copilot CLI error:", err.message);
        return "";
    }
}

function getCookieString() {
    if (!fs.existsSync("cookies.json")) return "";
    const cookies = JSON.parse(fs.readFileSync("cookies.json"));
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false, // keep visible for debugging
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // realistic user agent (don’t skip this)
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // optional: set language + viewport
    await page.setViewport({ width: 1366, height: 768 });

    if (fs.existsSync("cookies.json")) {
        const cookiesString = fs.readFileSync("cookies.json");
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log("Cookies loaded from cookies.json");
    }

    const techKeywords = [
        "developer",
        "development",
        "software",
        "web",
        "frontend",
        "backend",
        "fullstack",
        "react",
        "node",
        "python",
        "javascript",
        "engineer",
        "full-stack",
        "front-end",
        "back-end",
        "stack",
        "data analytics",
        "data science",
        "machine learning",
        "artificial intelligence",
        "ai",
        "ml",
        "data",
        "analytics",
        "product",
        "design",
        "ui",
        "qa",
    ];

    const negativeKeywords = [
        "marketing",
        "sales",
        "hr",
        "content writing",
        "graphic design",
        "video",
        "social media",
        "seo",
        "customer support",
    ];

    const categories = [
        "data-science",
        "full-stack-development",
        "machine-learning",
        "software-development",
        "web-development",
        "artificial-intelligence-ai",
        "mobile-app-development",
        "product",
        "ui-ux",
    ];

    for (const category of categories) {
        try {
            console.log(`\n>>> Processing Category: ${category} <<<\n`);
            await page.goto(
                `https://internshala.com/internships/work-from-home-${category}-internships/stipend-4000/`,
                { waitUntil: "networkidle2", timeout: 60000 },
            );

            console.log(`Page loaded for ${category}`);

            await page
                .waitForSelector("[internshipid]", {
                    timeout: 20000,
                })
                .catch(() => console.log(`No internships found for ${category}`));

            const internships = await page.evaluate(() => {
                const cards = document.querySelectorAll("[internshipid]");
                return Array.from(cards).map((card) => {
                    const id = card.getAttribute("internshipid");
                    const title =
                        card.querySelector(".job-internship-name")?.innerText || "";
                    return { id, title };
                });
            });

            const filteredInternships = internships.filter(
                (item) =>
                    techKeywords.some((kw) => item.title.toLowerCase().includes(kw)) &&
                    !negativeKeywords.some((nkw) =>
                        item.title.toLowerCase().includes(nkw),
                    ),
            );

            const unfilteredInternships = internships.filter(
                (item) => !filteredInternships.some((f) => f.id === item.id),
            );

            fs.writeFileSync(
                "unfiltered.json",
                JSON.stringify(unfilteredInternships, null, 2),
            );

            console.log(
                `[${category}] Filtered ${filteredInternships.length} tech internships out of ${internships.length}. Saved ${unfilteredInternships.length} unfiltered to unfiltered.json`,
            );

            for (const intern of filteredInternships) {
                console.log(`Processing: ${intern.title} (${intern.id})`);

                try {
                    // Scroll and click the internship card to open modal
                    await page.evaluate((id) => {
                        const el = document.querySelector(`[internshipid="${id}"]`);
                        if (el) el.scrollIntoView();
                    }, intern.id);

                    await page.click(`[internshipid="${intern.id}"]`);

                    // Wait for the modal or the form to appear
                    console.log("Waiting for modal...");
                    await page
                        .waitForSelector("#assessment_questions_container", {
                            timeout: 10000,
                        })
                        .catch(() => null);

                    // Extract questions from the modal
                    const formInfo = await page.evaluate(() => {
                        const container = document.querySelector(
                            "#assessment_questions_container",
                        );
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
                                const numericInput = group.querySelector(
                                    "input[type='number']",
                                );
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
                                        questions.push({
                                            type: "mcq",
                                            label,
                                            options,
                                        });
                                    }
                                }
                            });

                        const coverLetter = !!document.querySelector(
                            "#cover_letter_holder",
                        );

                        const company =
                            document.querySelector(".company_name")?.innerText ||
                            "Unknown company";
                        const description =
                            document.querySelector(".job_description")?.innerText || "";

                        return {
                            questions,
                            hasCoverLetter: coverLetter,
                            company,
                            description,
                        };
                    });

                    if (formInfo) {
                        console.log(`Form found for ${intern.id}. Using Copilot...`);

                        const context = `
              ${USER_BIO}
              ----------
              INTERNSHIP DETAILS:
              Company: ${formInfo.company}
              Role: ${intern.title}
              Description: ${formInfo.description}
            `;

                        // Fill cover letter using Quill API
                        const coverLetterHolder = await page.$("#cover_letter_holder");
                        if (coverLetterHolder) {
                            const prompt = `Write a professional cover letter for the internship using my details. context:${context}. Start directly with the letter and keep it under 150 words.`;
                            try {
                                let text = await askCopilot(prompt);
                                console.log(text);
                                const holderSelector = "#cover_letter_holder";
                                await page.waitForSelector(holderSelector, {
                                    timeout: 15000,
                                });

                                // Target Quill editor inside the holder
                                const editorHandle = await page.evaluateHandle((sel) => {
                                    return document
                                        .querySelector(sel)
                                        ?.querySelector(".ql-editor");
                                }, holderSelector);

                                const el = await editorHandle.asElement();
                                if (!el) {
                                    throw new Error(
                                        "Could not find Quill editor inside #cover_letter_holder",
                                    );
                                }

                                // Ensure it's in view
                                await el.evaluate((node) =>
                                    node.scrollIntoView({ block: "center" }),
                                );
                                await sleep(1000);

                                const box = await el.boundingBox();

                                if (box) {
                                    console.log(`Clicking cover letter field...`);
                                    await page.mouse.click(
                                        box.x + box.width / 2,
                                        box.y + box.height / 2,
                                    );
                                    await sleep(500);
                                    await page.keyboard.type(text);
                                    console.log("Successfully typed cover letter.");
                                } else {
                                    console.error(
                                        "Warning: Bounding box is null, attempting direct type.",
                                    );
                                    await el.type(text);
                                }
                            } catch (e) {
                                console.error("Error setting cover letter:", e.message);
                            }
                        }

                        // Fill custom questions
                        for (const q of formInfo.questions) {
                            if (q.type === "text") {
                                const prompt = `Answer this internship assessment question: "${q.label}". Context: ${context}. Keep it concise and professional. Dont include header or explanations just directly answer the question.`;
                                try {
                                    const text = await askCopilot(prompt);
                                    console.log(text);
                                    await page.type(`textarea[name="${q.name}"]`, text);
                                } catch (e) {
                                    console.error("Copilot text error:", e.message);
                                }
                            } else if (q.type === "numeric") {
                                const prompt = `Answer this internship assessment question: "${q.label}" with a single numeric value based on my context. Context: ${context}. Only return the number.`;
                                try {
                                    const text = await askCopilot(prompt);
                                    console.log(text);
                                    const num = text.replace(/[^\d]/g, "");
                                    console.log(`Answering numeric: ${num}`);
                                    await page.type(`input#${q.id}`, num);
                                } catch (e) {
                                    console.error("Copilot numeric error:", e.message);
                                }
                            } else if (q.type === "dropdown") {
                                const optionsStr = q.options
                                    .map((o, i) => `${i}: ${o.label}`)
                                    .join("\n");
                                const prompt = `For the question: "${q.label}", pick the most appropriate option index based on my bio.
Options:
${optionsStr}

Bio context: ${context}
Only return the index number.`;
                                try {
                                    const indexStr = await askCopilot(prompt);
                                    console.log(indexStr);
                                    const index = parseInt(indexStr.replace(/\D/g, ""));
                                    if (!isNaN(index) && q.options[index]) {
                                        const val = q.options[index].value;
                                        console.log(
                                            `Picking dropdown option ${val} for question: ${q.label}`,
                                        );
                                        await page.select(`select#${q.id}`, val);
                                        await page.evaluate((id) => {
                                            const el = document.getElementById(id);
                                            if (el) el.dispatchEvent(new Event("change"));
                                        }, q.id);
                                    }
                                } catch (e) {
                                    console.error("Copilot dropdown error:", e.message);
                                }
                            } else if (q.type === "mcq") {
                                const optionsStr = q.options
                                    .map((o, i) => `${i}: ${o.label}`)
                                    .join("\n");
                                const prompt = `For the question: "${q.label}", pick the most appropriate option index based on my bio.
Options:
${optionsStr}

Bio context: ${context}
Only return the index number.`;
                                try {
                                    const indexStr = await askCopilot(prompt);
                                    const index = parseInt(indexStr.replace(/\D/g, ""));
                                    if (!isNaN(index) && q.options[index]) {
                                        console.log(
                                            `Picking option ${index} for question: ${q.label}`,
                                        );
                                        await page.evaluate((id) => {
                                            const el = document.getElementById(id);
                                            if (el) {
                                                el.scrollIntoView({ block: "center" });
                                                el.click();
                                            }
                                        }, q.options[index].id);
                                    }
                                } catch (e) {
                                    console.error("Copilot MCQ error:", e.message);
                                }
                            }
                        }

                        // Click Submit
                        console.log("Submitting...");
                        await (page.waitForTimeout?.(500) ||
                            new Promise((r) => setTimeout(r, 500)));
                        await page.evaluate(() => {
                            const btn = document.querySelector("#submit");
                            if (btn) btn.scrollIntoView();
                        });
                        await (page.waitForTimeout?.(500) ||
                            new Promise((r) => setTimeout(r, 500)));
                        await page.click("#submit");

                        // Wait for success and close modal
                        await new Promise((r) => setTimeout(r, 4000));
                        const closeBtn = await page.$(".close");
                        if (closeBtn) await closeBtn.click();

                        console.log(`Finished processing ${intern.title}`);
                    } else {
                        console.log(`Could not find form for ${intern.id}`);
                    }
                } catch (err) {
                    console.error(`Error processing ${intern.id}:`, err.message);
                }

                await new Promise((r) => setTimeout(r, 2000));
            }
        } catch (err) {
            console.error(`Error in category ${category}:`, err.message);
        }
    }
})();

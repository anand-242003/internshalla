const puppeteer = require("puppeteer-extra");
const fs = require("fs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
    console.log("Starting Puppeteer...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: 1366,
        height: 768,
    });

    console.log("Opening Internshala...");

    await page.goto("https://internshala.com/", {
        waitUntil: "networkidle2",
        timeout: 60000,
    });

    console.log("Internshala opened.");
    console.log("");
    console.log("You now have 5 minutes.");
    console.log("Log into your Internshala account if necessary.");
    console.log("Do not close the browser.");
    console.log("");

    // Wait 5 minutes
    await sleep(5 * 60 * 1000);

    console.log("5 minutes completed.");
    console.log("Collecting Internshala cookies...");

    const cookies = await page.cookies();

    // Keep only Internshala cookies
    const internshalaCookies = cookies.filter((cookie) =>
        cookie.domain.includes("internshala.com")
    );

    fs.writeFileSync(
        "cookies.json",
        JSON.stringify(internshalaCookies, null, 2)
    );

    console.log(
        `Saved ${internshalaCookies.length} Internshala cookies to cookies.json`
    );

    console.log("Done.");

    await browser.close();
})();
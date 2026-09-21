const puppeteer = require("puppeteer-extra");
const fs = require("fs");

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });

    const page = await browser.newPage();

    const cookies = JSON.parse(
        fs.readFileSync("cookies.json", "utf8")
    );

    await page.setCookie(...cookies);

    console.log(`Loaded ${cookies.length} cookies`);

    await page.goto("https://internshala.com/", {
        waitUntil: "networkidle2",
        timeout: 60000,
    });

    console.log("Internshala opened.");
    console.log("Check the browser: are you logged in?");

})();
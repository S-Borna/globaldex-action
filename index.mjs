/**
 * AgentReady GitHub Action
 *
 * Scans a URL for AI agent readiness and sets outputs.
 * Fails the step if score is below the configured threshold.
 */

import { writeFileSync, appendFileSync } from "node:fs";

/* ------------------------------------------------------------------ */
/*  GitHub Actions helpers (no dependency on @actions/core)             */
/* ------------------------------------------------------------------ */

const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT || "";
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY || "";

function getInput(name) {
    const envKey = `INPUT_${name.replace(/-/g, "_").toUpperCase()}`;
    return (process.env[envKey] || "").trim();
}

function setOutput(name, value) {
    if (GITHUB_OUTPUT) {
        appendFileSync(GITHUB_OUTPUT, `${name}=${value}\n`);
    }
}

function setSummary(markdown) {
    if (GITHUB_STEP_SUMMARY) {
        appendFileSync(GITHUB_STEP_SUMMARY, markdown);
    }
}

function setFailed(message) {
    console.error(`::error::${message}`);
    process.exit(1);
}

function info(message) {
    console.log(message);
}

function warning(message) {
    console.log(`::warning::${message}`);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function gradeFromScore(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
}

function gradeEmoji(grade) {
    const map = { A: "🟢", B: "🔵", C: "🟡", D: "🟠", F: "🔴" };
    return map[grade] || "⚪";
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function run() {
    const url = getInput("url");
    const threshold = parseInt(getInput("threshold"), 10) || 0;
    const apiKey = getInput("api-key");
    const apiUrl = getInput("api-url") || "https://globaldex.ai";

    if (!url) {
        setFailed("Input 'url' is required.");
    }

    info(`Scanning ${url} for agent readiness...`);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${apiUrl}/api/v1/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
    });

    if (response.status === 429) {
        setFailed("Rate limited by AgentReady API. Provide an api-key for higher limits.");
    }

    const data = await response.json();

    if (!response.ok) {
        setFailed(`Scan failed: ${data.error || response.statusText}`);
    }

    const score = data.score;
    const grade = data.grade || gradeFromScore(score);
    const hasWebmcp = data.has_webmcp;
    const checksPassed = data.checks_passed;
    const checksTotal = data.checks_total;

    /* Set outputs */
    setOutput("score", score);
    setOutput("grade", grade);
    setOutput("has-webmcp", hasWebmcp);
    setOutput("checks-passed", checksPassed);
    setOutput("checks-total", checksTotal);
    setOutput("result-json", JSON.stringify(data));

    /* Log summary */
    info(`Score: ${score}/100 (${grade})`);
    info(`WebMCP: ${hasWebmcp ? "Yes" : "No"}`);
    info(`Checks: ${checksPassed}/${checksTotal} passed`);

    /* Step summary (Markdown) */
    const categories = data.categories || [];
    let catRows = "";
    for (const cat of categories) {
        catRows += `| ${cat.label} | ${cat.percentage}% | ${cat.score}/${cat.max_score} |\n`;
    }

    const summaryMd = `## ${gradeEmoji(grade)} AgentReady Scan: ${grade} (${score}/100)

| Property | Value |
| --- | --- |
| **URL** | ${data.url} |
| **Domain** | ${data.domain} |
| **Score** | **${score}/100** |
| **Grade** | ${grade} |
| **WebMCP** | ${hasWebmcp ? "✅ Yes" : "❌ No"} |
| **Checks** | ${checksPassed}/${checksTotal} passed |

### Categories

| Category | Percentage | Score |
| --- | --- | --- |
${catRows}

${threshold > 0 ? (score >= threshold ? `✅ **Passed** — Score ${score} meets threshold ${threshold}` : `❌ **Failed** — Score ${score} is below threshold ${threshold}`) : ""}

*Scanned by [GlobalDex](https://globaldex.ai)*
`;

    setSummary(summaryMd);

    /* Threshold check */
    if (threshold > 0 && score < threshold) {
        setFailed(`Score ${score} is below threshold ${threshold}`);
    }

    info("Scan complete.");
}

run().catch((err) => {
    setFailed(`Unexpected error: ${err.message}`);
});

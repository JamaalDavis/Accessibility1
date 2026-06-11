#!/usr/bin/env node
/**
 * WCAG 2.2 AA Accessibility Audit
 * Uses @axe-core/playwright to test each page of the site.
 *
 * Usage:
 *   node audit.js                           # audit live GitHub Pages site
 *   node audit.js --url http://localhost:4000/Accessibility1  # audit local Jekyll server
 */

'use strict';

const { chromium } = require('playwright');
const { checkA11y, injectAxe } = require('@axe-core/playwright');

// ── Configuration ──────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const BASE    = urlFlag !== -1 ? args[urlFlag + 1] : 'https://jamaaldavis.github.io/Accessibility1';

const PAGES = [
  { name: 'Home', path: '/' },
];

const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    // Target WCAG 2.1 A/AA + the new WCAG 2.2 rules
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};

// Violations to surface as errors; incomplete/needs-review are warnings
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

// ── Helpers ─────────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function pad(str, len) {
  return String(str).padEnd(len);
}

function impactColor(impact) {
  if (impact === 'critical' || impact === 'serious') return RED;
  if (impact === 'moderate') return YELLOW;
  return DIM;
}

function printViolation(v, index) {
  const color = impactColor(v.impact);
  console.log(`\n  ${color}${BOLD}${index + 1}. [${v.impact.toUpperCase()}] ${v.id}${RESET}`);
  console.log(`     ${v.description}`);
  console.log(`     ${DIM}Help: ${v.helpUrl}${RESET}`);
  v.nodes.slice(0, 3).forEach((node, ni) => {
    console.log(`     ${DIM}Node ${ni + 1}: ${node.html.slice(0, 120).trim()}${RESET}`);
    if (node.failureSummary) {
      node.failureSummary.split('\n').forEach(line => {
        console.log(`       ${YELLOW}→ ${line.trim()}${RESET}`);
      });
    }
  });
  if (v.nodes.length > 3) {
    console.log(`     ${DIM}… and ${v.nodes.length - 3} more node(s)${RESET}`);
  }
}

function printIncomplete(v, index) {
  console.log(`  ${YELLOW}${index + 1}. [NEEDS REVIEW] ${v.id}${RESET} — ${v.description}`);
  console.log(`     ${DIM}${v.helpUrl}${RESET}`);
}

// ── Audit runner ────────────────────────────────────────────────────────────
async function auditPage(page, url, pageName) {
  console.log(`\n${CYAN}${BOLD}▶ ${pageName}${RESET} ${DIM}${url}${RESET}`);
  console.log('─'.repeat(70));

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch (err) {
    console.error(`${RED}  ✖ Could not load page: ${err.message}${RESET}`);
    return { violations: [], incomplete: [], passed: 0, error: true };
  }

  await injectAxe(page);

  let results;
  try {
    results = await page.evaluate((options) => {
      return new Promise((resolve) => {
        window.axe.run(document, options, (err, res) => {
          if (err) resolve({ error: err.message });
          else resolve(res);
        });
      });
    }, AXE_OPTIONS);
  } catch (err) {
    console.error(`${RED}  ✖ axe-core error: ${err.message}${RESET}`);
    return { violations: [], incomplete: [], passed: 0, error: true };
  }

  if (results.error) {
    console.error(`${RED}  ✖ axe returned error: ${results.error}${RESET}`);
    return { violations: [], incomplete: [], passed: 0, error: true };
  }

  const violations = (results.violations || []).sort(
    (a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
  );
  const incomplete = results.incomplete || [];
  const passed     = (results.passes || []).length;

  // Summary line
  const vCount = violations.length;
  const iCount = incomplete.length;
  const statusIcon = vCount === 0 ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
  console.log(
    `  ${statusIcon}  ${GREEN}${passed} passed${RESET}  ` +
    `${vCount > 0 ? RED : GREEN}${vCount} violation(s)${RESET}  ` +
    `${iCount > 0 ? YELLOW : DIM}${iCount} needs review${RESET}`
  );

  if (violations.length) {
    console.log(`\n  ${RED}${BOLD}VIOLATIONS${RESET}`);
    violations.forEach((v, i) => printViolation(v, i));
  }

  if (incomplete.length) {
    console.log(`\n  ${YELLOW}${BOLD}NEEDS MANUAL REVIEW${RESET}`);
    incomplete.forEach((v, i) => printIncomplete(v, i));
  }

  if (vCount === 0 && iCount === 0) {
    console.log(`  ${GREEN}  No violations or items needing review. 🎉${RESET}`);
  }

  return { violations, incomplete, passed, error: false };
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║          WCAG 2.2 AA Automated Accessibility Audit                  ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Base URL : ${CYAN}${BASE}${RESET}`);
  console.log(`  Tags     : wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`);
  console.log(`  Pages    : ${PAGES.map(p => p.name).join(', ')}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // Simulate a keyboard-primary user (no pointer hover states bypassing focus)
  });
  const page = await context.newPage();

  const summary = [];

  for (const { name, path } of PAGES) {
    const url    = BASE.replace(/\/$/, '') + path;
    const result = await auditPage(page, url, name);
    summary.push({ name, url, ...result });
  }

  // ── Mobile viewport re-run for nav toggle ──────────────────────────────
  console.log(`\n${CYAN}${BOLD}▶ Home (mobile — 375px, nav toggle)${RESET} ${DIM}${BASE}/\n${RESET}`);
  console.log('─'.repeat(70));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE.replace(/\/$/, '') + '/', { waitUntil: 'networkidle' });

  // Open the nav toggle and audit the open state
  const toggle = page.locator('.nav-toggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.waitForTimeout(300);
  }

  await injectAxe(page);
  const mobileResults = await page.evaluate((options) => {
    return new Promise((resolve) => {
      window.axe.run(document, options, (err, res) => {
        if (err) resolve({ error: err.message });
        else resolve(res);
      });
    });
  }, AXE_OPTIONS);

  const mobileViolations = (mobileResults.violations || []).length;
  const mobileIcon = mobileViolations === 0 ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
  console.log(
    `  ${mobileIcon}  ${GREEN}${(mobileResults.passes || []).length} passed${RESET}  ` +
    `${mobileViolations > 0 ? RED : GREEN}${mobileViolations} violation(s)${RESET}`
  );
  if (mobileViolations > 0) {
    (mobileResults.violations || []).forEach((v, i) => printViolation(v, i));
  }

  await browser.close();

  // ── Final report ───────────────────────────────────────────────────────
  const totalViolations  = summary.reduce((n, r) => n + r.violations.length, 0) + mobileViolations;
  const totalIncomplete  = summary.reduce((n, r) => n + r.incomplete.length, 0);
  const totalPassed      = summary.reduce((n, r) => n + r.passed, 0);

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`${BOLD}AUDIT SUMMARY${RESET}`);
  console.log('═'.repeat(72));
  console.log(`  ${pad('Page', 30)} ${pad('Violations', 12)} ${pad('Needs Review', 14)} Passed`);
  console.log('─'.repeat(72));
  summary.forEach(r => {
    const vc = r.violations.length;
    const ic = r.incomplete.length;
    console.log(
      `  ${pad(r.name, 30)} ` +
      `${vc > 0 ? RED : GREEN}${pad(vc, 12)}${RESET}` +
      `${ic > 0 ? YELLOW : DIM}${pad(ic, 14)}${RESET}` +
      `${GREEN}${r.passed}${RESET}`
    );
  });
  console.log('─'.repeat(72));
  console.log(
    `  ${pad('TOTAL', 30)} ` +
    `${totalViolations > 0 ? RED + BOLD : GREEN}${pad(totalViolations, 12)}${RESET}` +
    `${totalIncomplete > 0 ? YELLOW : DIM}${pad(totalIncomplete, 14)}${RESET}` +
    `${GREEN}${totalPassed}${RESET}`
  );
  console.log('═'.repeat(72));

  if (totalViolations === 0) {
    console.log(`\n  ${GREEN}${BOLD}✔ All pages pass WCAG 2.2 AA automated checks.${RESET}`);
    console.log(`  ${DIM}Note: automated tools catch ~30–40% of issues.`);
    console.log(`  Complement with manual keyboard and screen reader testing.${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}✖ ${totalViolations} violation(s) found. Review the output above.${RESET}\n`);
  }

  process.exit(totalViolations > 0 ? 1 : 0);
})();

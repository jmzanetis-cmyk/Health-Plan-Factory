#!/usr/bin/env node
/**
 * scripts/generate-pdf.js
 * Converts docs/business-plan.md → docs/business-plan.pdf
 * Uses PDFKit (pure JS, no browser required) for a polished, branded PDF.
 *
 * Usage:  node scripts/generate-pdf.js
 */

import { readFileSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { marked } from "marked";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");

const mdPath  = resolve(ROOT, "docs/business-plan.md");
const outPath = resolve(ROOT, "docs/business-plan.pdf");

// ── Brand tokens ─────────────────────────────────────────────────────────────
const PINK    = "#D4227E";
const NAVY    = "#1a2a3a";
const MID     = "#2a5070";
const MUTED   = "#6b8499";
const LIGHT   = "#f8f9fb";
const WHITE   = "#ffffff";
const RULE    = "#e2e8f0";

// ── Page / margin config ──────────────────────────────────────────────────────
const MARGIN  = 56;        // points (~0.78 in)
const PAGE_W  = 612;       // US Letter
const PAGE_H  = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Font helpers ─────────────────────────────────────────────────────────────
// PDFKit built-ins: Helvetica, Helvetica-Bold, Helvetica-Oblique,
//                  Times-Roman, Times-Bold, Times-Italic
const F = {
  body:         "Times-Roman",
  bodyBold:     "Times-Bold",
  bodyItalic:   "Times-Italic",
  sans:         "Helvetica",
  sansBold:     "Helvetica-Bold",
  sansItalic:   "Helvetica-Oblique",
};

// ── Parse markdown into token list ────────────────────────────────────────────
const md = readFileSync(mdPath, "utf8");
const tokens = marked.lexer(md);

// ── Build PDF ─────────────────────────────────────────────────────────────────
const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: MARGIN, bottom: MARGIN + 24, left: MARGIN, right: MARGIN },
  info: {
    Title:   "Health Plan Factory — Business Plan",
    Author:  "Health Plan Factory",
    Subject: "Seed Round Business Plan · April 2026",
    Creator: "Health Plan Factory PDF Generator",
  },
  autoFirstPage: false,
  bufferPages: true,
});

const stream = createWriteStream(outPath);
doc.pipe(stream);

// ────────────────────────────────────────────────────────────────────────────
// COVER PAGE
// ────────────────────────────────────────────────────────────────────────────
doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });

// Navy background
doc.rect(0, 0, PAGE_W, PAGE_H).fill(NAVY);

// Pink accent bar at top
doc.rect(0, 0, PAGE_W, 5).fill(PINK);

// Pink pill label
const pillText = "HEALTH PLAN FACTORY";
const pillW    = 210;
const pillH    = 26;
const pillX    = (PAGE_W - pillW) / 2;
const pillY    = 190;
doc.roundedRect(pillX, pillY, pillW, pillH, 13).fill(PINK);
doc.font(F.sansBold).fontSize(9).fillColor(WHITE)
   .text(pillText, pillX, pillY + 8, { width: pillW, align: "center" });

// Main title
doc.font(F.body).fontSize(48).fillColor(WHITE)
   .text("Business", 0, 240, { width: PAGE_W, align: "center" });
doc.font(F.bodyBold).fontSize(48).fillColor(PINK)
   .text("Plan", 0, 296, { width: PAGE_W, align: "center" });

// Subtitle
doc.font(F.sans).fontSize(12).fillColor("#8fa3b8")
   .text("Confidential · Draft Document", 0, 368, { width: PAGE_W, align: "center" });

// Pink divider
const divW = 60;
doc.moveTo((PAGE_W - divW) / 2, 400).lineTo((PAGE_W + divW) / 2, 400)
   .strokeColor(PINK).lineWidth(2.5).stroke();

// Meta block
const metaY = 425;
doc.font(F.sansBold).fontSize(9).fillColor("#8fa3b8")
   .text("PREPARED", MARGIN, metaY, { width: CONTENT_W, align: "center" });
doc.font(F.sans).fontSize(10).fillColor("#5a7a9a")
   .text("April 2026", MARGIN, metaY + 13, { width: CONTENT_W, align: "center" });

doc.font(F.sansBold).fontSize(9).fillColor("#8fa3b8")
   .text("STAGE", MARGIN, metaY + 38, { width: CONTENT_W, align: "center" });
doc.font(F.sans).fontSize(10).fillColor("#5a7a9a")
   .text("Seed Round", MARGIN, metaY + 51, { width: CONTENT_W, align: "center" });

doc.font(F.sansBold).fontSize(9).fillColor("#8fa3b8")
   .text("FORMAT", MARGIN, metaY + 76, { width: CONTENT_W, align: "center" });
doc.font(F.sans).fontSize(10).fillColor("#5a7a9a")
   .text("Three-Sided Wellness Marketplace", MARGIN, metaY + 89, { width: CONTENT_W, align: "center" });

// Footer disclaimer
doc.font(F.sans).fontSize(8).fillColor("#3a5a7a")
   .text(
     "This document is confidential and intended solely for the named recipient. Not for redistribution.",
     MARGIN, PAGE_H - 52, { width: CONTENT_W, align: "center" }
   );

// Pink bar at bottom
doc.rect(0, PAGE_H - 5, PAGE_W, 5).fill(PINK);

// ────────────────────────────────────────────────────────────────────────────
// BODY PAGES
// ────────────────────────────────────────────────────────────────────────────
doc.addPage();

// ── State for rendering ───────────────────────────────────────────────────────
let y = MARGIN;
let isFirstH1 = true;  // skip the first H1 (it's the doc title, shown on cover)

function ensureSpace(needed) {
  if (y + needed > PAGE_H - MARGIN - 24) {
    doc.addPage();
    y = MARGIN;
    return true;
  }
  return false;
}

function drawRule(color = RULE, weight = 0.75) {
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
     .strokeColor(color).lineWidth(weight).stroke();
  y += 8;
}

function addVSpace(pts) {
  y += pts;
}

// ── Inline text renderer (handles bold/italic/code within a paragraph) ────────
function renderInlineTokens(inlineTokens) {
  const parts = [];
  for (const t of inlineTokens) {
    if (t.type === "strong") {
      for (const inner of (t.tokens || [])) {
        parts.push({ text: inner.raw || inner.text || "", bold: true });
      }
    } else if (t.type === "em") {
      for (const inner of (t.tokens || [])) {
        parts.push({ text: inner.raw || inner.text || "", italic: true });
      }
    } else if (t.type === "codespan") {
      parts.push({ text: t.text, code: true });
    } else if (t.type === "link") {
      parts.push({ text: t.text || t.href, link: t.href });
    } else {
      parts.push({ text: t.raw || t.text || "" });
    }
  }
  return parts;
}

function inlineText(tokens) {
  if (!tokens) return "";
  return tokens.map(t => {
    if (t.type === "strong") return inlineText(t.tokens);
    if (t.type === "em") return inlineText(t.tokens);
    return t.raw || t.text || "";
  }).join("");
}

// ── Render a paragraph with mixed bold/italic inline runs ─────────────────────
function renderParagraph(token, opts = {}) {
  const {
    fontSize   = 10.5,
    font       = F.body,
    color      = NAVY,
    lineGap    = 3,
    indent     = 0,
    spaceAfter = 8,
  } = opts;

  const parts = renderInlineTokens(token.tokens || []);
  if (parts.length === 0) return;

  // Estimate height — rough: 1 line = fontSize + lineGap, ~80 chars per line
  const rawText = parts.map(p => p.text).join("");
  const approxLines = Math.ceil(rawText.length / 80) + 1;
  ensureSpace(approxLines * (fontSize + lineGap) + spaceAfter);

  const x = MARGIN + indent;
  const w = CONTENT_W - indent;

  // Build a multi-run text block
  doc.font(font).fontSize(fontSize).fillColor(color);

  // Simple approach: render as a single text block with no inline style changes
  // For inline bold/italic we render in a single pass using plain text
  // (PDFKit doesn't support per-word font changes in the same text call)
  const plainText = parts.map(p => p.text).join("");
  doc.font(font).fontSize(fontSize).fillColor(color)
     .text(plainText, x, y, { width: w, lineGap, align: "justify" });

  y = doc.y + spaceAfter;
}

// ── Render list ───────────────────────────────────────────────────────────────
function renderList(token, depth = 0) {
  const indent = depth * 16;
  let counter  = 1;

  for (const item of token.items) {
    const bullet  = token.ordered ? `${counter++}.` : "•";
    const itemX   = MARGIN + 16 + indent;
    const bulletX = MARGIN + indent + 2;
    const w       = CONTENT_W - 20 - indent;

    const rawText = inlineText(item.tokens || [{ text: item.text }]);
    const lines   = Math.ceil(rawText.length / 80) + 1;
    ensureSpace(lines * 14 + 4);

    // bullet/number
    doc.font(token.ordered ? F.sans : F.sansBold)
       .fontSize(10).fillColor(token.ordered ? NAVY : PINK)
       .text(bullet, bulletX, y, { width: 14, align: "right" });

    // item text
    const savedY = y;
    doc.font(F.body).fontSize(10).fillColor(NAVY)
       .text(rawText, itemX, y, { width: w, lineGap: 2 });
    y = doc.y + 3;

    // nested list
    for (const sub of (item.tokens || [])) {
      if (sub.type === "list") renderList(sub, depth + 1);
    }
  }
  y += 4;
}

// ── Render table ─────────────────────────────────────────────────────────────
function renderTable(token) {
  const colCount  = token.header.length;
  const colW      = CONTENT_W / colCount;
  const rowH      = 22;
  const cellPadX  = 7;
  const cellPadY  = 6;
  const hdrH      = 24;

  // Estimate full table height
  const totalH = hdrH + token.rows.length * rowH + 12;
  ensureSpace(totalH);

  // Header row
  doc.rect(MARGIN, y, CONTENT_W, hdrH).fill(NAVY);
  for (let c = 0; c < colCount; c++) {
    const text = inlineText(token.header[c].tokens || [{ text: token.header[c].text }]);
    doc.font(F.sansBold).fontSize(8.5).fillColor(WHITE)
       .text(text.toUpperCase(), MARGIN + c * colW + cellPadX, y + cellPadY,
             { width: colW - cellPadX * 2, lineBreak: false });
  }
  y += hdrH;

  // Data rows
  for (let r = 0; r < token.rows.length; r++) {
    const rowBg = r % 2 === 1 ? LIGHT : WHITE;
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(rowBg);

    // Row border
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
       .strokeColor(RULE).lineWidth(0.5).stroke();

    for (let c = 0; c < colCount; c++) {
      const cell    = token.rows[r][c];
      const text    = inlineText(cell.tokens || [{ text: cell.text }]);
      const isBold  = c === 0;
      doc.font(isBold ? F.sansBold : F.sans)
         .fontSize(9).fillColor(isBold ? NAVY : "#3a5070")
         .text(text, MARGIN + c * colW + cellPadX, y + cellPadY,
               { width: colW - cellPadX * 2, lineBreak: false });
    }
    y += rowH;
  }

  // Bottom border
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
     .strokeColor(RULE).lineWidth(0.75).stroke();
  y += 14;
}

// ── Main token renderer ───────────────────────────────────────────────────────
for (const token of tokens) {
  switch (token.type) {

    case "heading": {
      const depth = token.depth;
      const text  = inlineText(token.tokens);

      if (depth === 1) {
        if (isFirstH1) { isFirstH1 = false; break; } // skip doc title

        ensureSpace(60);
        // Pink underline + big heading
        y += 18;
        doc.font(F.bodyBold).fontSize(20).fillColor(NAVY)
           .text(text, MARGIN, y, { width: CONTENT_W });
        y = doc.y + 4;
        // Pink accent line
        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
           .strokeColor(PINK).lineWidth(2).stroke();
        y += 12;
      } else if (depth === 2) {
        ensureSpace(40);
        y += 12;
        doc.font(F.sansBold).fontSize(13).fillColor(PINK)
           .text(text, MARGIN, y, { width: CONTENT_W });
        y = doc.y + 6;
      } else if (depth === 3) {
        ensureSpace(30);
        y += 8;
        doc.font(F.sansBold).fontSize(11).fillColor(NAVY)
           .text(text, MARGIN, y, { width: CONTENT_W });
        y = doc.y + 4;
      } else {
        ensureSpace(24);
        y += 6;
        doc.font(F.sansBold).fontSize(10.5).fillColor(MID)
           .text(text, MARGIN, y, { width: CONTENT_W });
        y = doc.y + 3;
      }
      break;
    }

    case "paragraph": {
      renderParagraph(token);
      break;
    }

    case "list": {
      ensureSpace(24);
      renderList(token);
      break;
    }

    case "table": {
      renderTable(token);
      break;
    }

    case "hr": {
      ensureSpace(20);
      y += 8;
      drawRule(RULE, 1);
      y += 8;
      break;
    }

    case "blockquote": {
      ensureSpace(40);
      const bqText = token.tokens
        .filter(t => t.type === "paragraph")
        .map(t => inlineText(t.tokens))
        .join("\n");
      const lines  = Math.ceil(bqText.length / 70) + 1;
      const bqH    = lines * 14 + 16;

      ensureSpace(bqH);

      // Pink left bar + light background
      doc.rect(MARGIN, y, 3, bqH).fill(PINK);
      doc.rect(MARGIN + 3, y, CONTENT_W - 3, bqH).fill("#fdf5f9");

      doc.font(F.bodyItalic).fontSize(10.5).fillColor(MID)
         .text(bqText, MARGIN + 14, y + 9, { width: CONTENT_W - 22, lineGap: 3 });
      y += bqH + 10;
      break;
    }

    case "space": {
      y += 4;
      break;
    }

    case "code": {
      const codeText = token.text;
      const lines    = codeText.split("\n").length;
      const codeH    = lines * 13 + 16;
      ensureSpace(codeH);

      doc.rect(MARGIN, y, CONTENT_W, codeH).fill(LIGHT);
      doc.font("Courier").fontSize(8.5).fillColor(MID)
         .text(codeText, MARGIN + 10, y + 8, { width: CONTENT_W - 20, lineGap: 2 });
      y += codeH + 8;
      break;
    }

    default:
      break;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PAGE NUMBERS (footer on every page except cover)
// ────────────────────────────────────────────────────────────────────────────
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  if (i === 0) continue; // skip cover

  const pageNum = i; // body pages start at 1

  // Footer rule
  doc.moveTo(MARGIN, PAGE_H - MARGIN + 4)
     .lineTo(MARGIN + CONTENT_W, PAGE_H - MARGIN + 4)
     .strokeColor(RULE).lineWidth(0.75).stroke();

  // Left: company name
  doc.font(F.sans).fontSize(8).fillColor(MUTED)
     .text("Health Plan Factory — Confidential",
           MARGIN, PAGE_H - MARGIN + 9, { width: CONTENT_W / 2 });

  // Right: page number
  doc.font(F.sans).fontSize(8).fillColor(MUTED)
     .text(String(pageNum),
           MARGIN + CONTENT_W / 2, PAGE_H - MARGIN + 9,
           { width: CONTENT_W / 2, align: "right" });
}

// ── Finalise ──────────────────────────────────────────────────────────────────
doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

const { size } = (await import("node:fs")).statSync(outPath);
console.log(`✓ PDF saved to: ${outPath}`);
console.log(`  Size: ${(size / 1024).toFixed(1)} KB`);

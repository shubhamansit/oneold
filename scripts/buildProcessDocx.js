/**
 * Convert docs/PROCESS_DOCUMENTATION.md into a structured Word document.
 * Usage: node scripts/buildProcessDocx.js
 * Output: docs/ONE_Old_Panel_Process_Documentation.docx
 */
const fs = require("fs");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  AlignmentType,
  BorderStyle,
} = require("docx");

const SRC = "docs/PROCESS_DOCUMENTATION.md";
const OUT = "docs/ONE_Old_Panel_Process_Documentation.docx";

const FONT = "Calibri";
const CODE_FONT = "Consolas";
const HEADER_FILL = "DB4848";
const CODE_FILL = "F2F2F2";

/** Parse **bold** and `code` inline formatting into TextRuns. */
function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  const push = (t, opts) => {
    if (t) runs.push(new TextRun({ text: t, font: FONT, size: 21, ...base, ...opts }));
  };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) push(tok.slice(2, -2), { bold: true });
    else push(tok.slice(1, -1), { font: CODE_FONT, size: 19 });
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return runs.length ? runs : [new TextRun({ text: "", font: FONT, size: 21 })];
}

function cellParagraphs(text) {
  return [new Paragraph({ children: inlineRuns(text.trim()) })];
}

function makeTable(rows) {
  const colCount = rows[0].length;
  const tableRows = rows.map((cells, ri) =>
    new TableRow({
      tableHeader: ri === 0,
      children: cells.map(
        (c) =>
          new TableCell({
            width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
            shading:
              ri === 0
                ? { type: ShadingType.CLEAR, fill: HEADER_FILL }
                : undefined,
            children: [
              new Paragraph({
                children:
                  ri === 0
                    ? inlineRuns(c.trim(), { bold: true, color: "FFFFFF" })
                    : inlineRuns(c.trim()),
              }),
            ],
          })
      ),
    })
  );
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const children = [];
  let i = 0;
  let firstHeading = true;

  const spacer = () => children.push(new Paragraph({ text: "" }));

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: CODE_FILL },
          children: [
            new TextRun({ text: buf.join("\n"), font: CODE_FONT, size: 18 }),
          ],
        })
      );
      spacer();
      continue;
    }

    // Table
    if (line.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|");
        if (!cells.every((c) => /^[\s:-]+$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) {
        children.push(makeTable(rows));
        spacer();
      }
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].replace(/\*\*/g, "");
      if (level === 1 && firstHeading) {
        firstHeading = false;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text, font: FONT, size: 40, bold: true, color: HEADER_FILL }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            heading:
              level === 1
                ? HeadingLevel.HEADING_1
                : level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
            children: inlineRuns(text, {
              bold: true,
              size: level === 1 ? 30 : level === 2 ? 26 : 23,
              color: level === 1 ? HEADER_FILL : "1F3864",
            }),
          })
        );
      }
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
          },
        })
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: "FFF2CC" },
          children: inlineRuns(line.trim().replace(/^>\s?/, ""), { italics: true }),
        })
      );
      i++;
      continue;
    }

    // Checklist / bullet
    const bullet = line.match(/^(\s*)- (.*)$/);
    if (bullet) {
      const indent = Math.min(2, Math.floor(bullet[1].length / 2));
      let text = bullet[2];
      let prefix = "";
      const check = text.match(/^\[( |x)\]\s*(.*)$/i);
      if (check) {
        prefix = check[1].toLowerCase() === "x" ? "☑ " : "☐ ";
        text = check[2];
      }
      children.push(
        new Paragraph({
          bullet: { level: indent },
          children: [
            ...(prefix
              ? [new TextRun({ text: prefix, font: FONT, size: 21 })]
              : []),
            ...inlineRuns(text),
          ],
        })
      );
      i++;
      continue;
    }

    // Numbered list (rendered as "N." text to keep original numbering)
    const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numbered) {
      children.push(
        new Paragraph({
          indent: { left: 360 + Math.floor(numbered[1].length / 2) * 360 },
          children: [
            new TextRun({ text: `${numbered[2]}. `, font: FONT, size: 21, bold: true }),
            ...inlineRuns(numbered[3]),
          ],
        })
      );
      i++;
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Normal paragraph (merge wrapped continuation lines)
    const buf = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|```|\||\s*- |\s*\d+\.\s|>|---+$)/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: inlineRuns(buf.join(" ")),
      })
    );
  }
  return children;
}

async function main() {
  const md = fs.readFileSync(SRC, "utf8");
  const doc = new Document({
    creator: "ONE Old Panel",
    title: "ONE Old Panel — Process Documentation",
    styles: {
      default: {
        document: { run: { font: FONT, size: 21 } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children: parseMarkdown(md),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Saved ${OUT} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

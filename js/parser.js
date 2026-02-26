/* ══════════════════════════════════════════════════
   parser.js
   Converte texto bruto do Tesseract em linhas estruturadas.
   Estratégia: limpeza → filtro → pré-correção → 4 regex em cascata → pós-correção
══════════════════════════════════════════════════ */

"use strict";

const { cleanText, fixDate, fixNum, fixCode, preCorrect } = window.Corrections;

const DATE_PAT = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/;
const HDR_PAT  = /^(Data|Pedido|UN|CA|Qtd|C.d|Descri)/i;

const PATS = [
  // P1 — código exato de 6 dígitos
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\d{6})\s+(.*)/,
  // P2 — código iniciando com dígito, pode vir colado à descrição
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+([0-9]\S{3,})\s+(.*)/,
  // P3 — qualquer token como código (fallback)
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\S+)\s+(.*)/,
  // P4 — linha sem descrição (truncada pelo OCR)
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\S+)/,
];

function parseLine(raw) {
  const line = preCorrect(raw);
  for (const pat of PATS) {
    const m = line.match(pat);
    if (!m) continue;
    let rawCode = (m[6] || "").trim();
    let rawDesc = (m[7] || "").trim().replace(/^[\/\\]+\s*/, "");
    const [code, desc] = fixCode(rawCode, rawDesc);
    const un  = fixNum(m[3]).replace(/\D/g, "");
    const ca  = fixNum(m[4]).replace(/\D/g, "");
    const qtd = m[5].replace(/[^0-9.,]/g, "");
    if (!un || !ca || !qtd) continue;
    return [
      fixDate(m[1].trim()),
      m[2].trim(),
      un.padStart(3, "0"),
      ca.padStart(4, "0"),
      qtd,
      code.padStart(6, "0"),
      desc,
    ];
  }
  return null;
}

function parseOCRText(ocrText) {
  const rows = [], skipped = [];
  cleanText(ocrText)
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length >= 15)
    .filter(l => !HDR_PAT.test(l))
    .filter(l => DATE_PAT.test(l))
    .forEach(line => {
      const r = parseLine(line);
      r ? rows.push(r) : skipped.push(line);
    });
  return { rows, skipped };
}

window.Parser = { parseLine, parseOCRText };

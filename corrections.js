/* ══════════════════════════════════════════════════
   corrections.js
   Correções de erros típicos do Tesseract para
   tabelas de pedidos (campos numéricos, datas, códigos).
══════════════════════════════════════════════════ */

"use strict";

function cleanText(text) {
  return text
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[|¦¡]/g, "1")
    .replace(/[©®°·•]/g, "0")
    .replace(/[^\x20-\x7E\u00C0-\u024F\u00A0\n]/g, " ")
    .replace(/[^\S\n]+/g, " ");
}

function fixDate(raw) {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  let d = raw.replace(/[-\.]/g, "/");
  d = d.replace(/^(\d)\//, "0$1/").replace(/\/(\d)\//, "/0$1/");
  d = d.replace(/^(\d{2}\/\d{2}\/)(\d{2})$/, (_, p, y) =>
    p + (+y <= 30 ? "20" : "19") + y
  );
  return d;
}

function fixNum(s) {
  return String(s)
    .replace(/[oO]/g, "0")
    .replace(/[dD]/g, "0")
    .replace(/[qQ]/g, "0")
    .replace(/[iIlL]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[bB]/g, "8")
    .replace(/[gG]/g, "9")
    .replace(/[zZ]/g, "2")
    .replace(/[T]/g,  "7");
}

function fixCode(token, desc) {
  const t = token.trim();
  if (/^\d{6}$/.test(t)) return [t, desc];
  if (/^\d{4,5}$/.test(t)) return [t.padStart(6, "0"), desc];
  const gl = t.match(/^(\d{4,7})(.+)$/);
  if (gl) {
    return [
      gl[1].slice(0, 6).padStart(6, "0"),
      (gl[2].replace(/^[\s_\-]+/, "") + " " + desc).trim()
    ];
  }
  const fc = fixNum(t);
  if (/^\d{4,7}$/.test(fc)) return [fc.padStart(6, "0"), desc];
  const glMixed = t.match(/^[A-Za-z]{1,2}(\d{4,6})(.*)$/);
  if (glMixed) {
    return [fixNum(glMixed[1]).padStart(6, "0"), (glMixed[2] + " " + desc).trim()];
  }
  if (/^[^0-9a-zA-Z]/.test(t) || t.length <= 1) {
    const m6 = desc.match(/^(\d{6})\s*(.*)/);
    if (m6) return [m6[1], m6[2]];
    const m = desc.match(/^(\d{4,7})\s+(.*)/);
    if (m) return [m[1].padStart(6, "0"), m[2]];
    const ml = desc.match(/^([A-Za-z0-9]{4,7})\s+(.*)/);
    if (ml) {
      const f = fixNum(ml[1]);
      if (/^\d+$/.test(f)) return [f.padStart(6, "0"), ml[2]];
    }
  }
  return [t, desc];
}

function preCorrect(line) {
  let clean = line
    .replace(/^[\s_\-=\/\\]+/, "")
    .replace(/[\s_\-=]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const tk = clean.split(" ");
  if (tk.length >= 6) {
    tk[2] = fixNum(tk[2]).replace(/\D/g, "") || tk[2];
    tk[3] = fixNum(tk[3]).replace(/\D/g, "") || tk[3];
    tk[4] = tk[4].replace(/[^0-9.,]/g, "") || tk[4];
    const cf = fixNum(tk[5].replace(/[^0-9a-zA-Z]/g, ""));
    if (/^\d+$/.test(cf)) tk[5] = cf;
    clean = tk.join(" ");
  }
  return clean;
}

window.Corrections = { cleanText, fixDate, fixNum, fixCode, preCorrect };

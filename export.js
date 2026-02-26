/* ══════════════════════════════════════════════════
   export.js — download CSV e TXT de erros
══════════════════════════════════════════════════ */
"use strict";

let _rows = [], _skipped = [];

function initExport() {
  document.getElementById("btnDl").addEventListener("click", () => {
    if (!_rows.length) return;
    dlBlob(getCSV(), "dados.csv", "text/csv;charset=utf-8;");
  });
  document.getElementById("btnDlErr").addEventListener("click", () => {
    if (!_skipped.length) { alert("Não há linhas com erro para exportar."); return; }
    dlBlob(_skipped.join("\n"), "erros_ocr.txt", "text/plain;charset=utf-8;");
  });
  document.getElementById("btnCopy").addEventListener("click", async () => {
    if (!_rows.length) return;
    const btn = document.getElementById("btnCopy");
    const csv = getCSV();
    try { await navigator.clipboard.writeText(csv); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = csv; ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    btn.textContent = "✔ Copiado!";
    setTimeout(() => { btn.textContent = "⧉ Copiar CSV"; }, 2200);
  });
}

function setExportData(rows, skipped) { _rows = rows; _skipped = skipped; }

function getCSV() {
  return "Data;Pedido;UN;CA;Qtd;CodMaterial;Descricao\n" +
    _rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n") + "\n";
}

function dlBlob(content, filename, mime) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showActions() { document.getElementById("actBar").style.display = "flex"; }
function hideActions() { document.getElementById("actBar").style.display = "none"; }

window.Export = { initExport, setExportData, showActions, hideActions, getCSV };

/* ══════════════════════════════════════════════════
   app.js — orquestrador principal
   Todos os listeners são registrados no DOMContentLoaded
   para garantir que o DOM esteja pronto.
══════════════════════════════════════════════════ */
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Inicializa sub-módulos que precisam do DOM
  window.Preview.initPreview();
  window.Table.initTable();
  window.Export.initExport();

  const { preprocessImage, getTesseractConfig } = window.Preprocess;
  const { parseOCRText }                        = window.Parser;
  const { loadPreview, showPreview, resetPreview } = window.Preview;
  const { renderTable, renderErrors, updateCards, resetTable } = window.Table;
  const { setExportData, showActions, hideActions } = window.Export;

  const dropZone   = document.getElementById("dropZone");
  const fInput     = document.getElementById("fInput");
  const pasteMsg   = document.getElementById("pasteMsg");
  const progArea   = document.getElementById("progArea");
  const progFill   = document.getElementById("progFill");
  const progMsg    = document.getElementById("progMsg");
  const btnConvert = document.getElementById("btnConvert");
  const btnClear   = document.getElementById("btnClear");

  let FILES = [], ROWS = [], SKIPPED = [];

  /* ── CLIQUE NA DROP ZONE ── */
  dropZone.addEventListener("click", e => {
    if (e.target === fInput) return;
    fInput.click();
  });

  fInput.addEventListener("change", e => {
    addFiles([...e.target.files]);
    fInput.value = "";
  });

  /* ── DRAG & DROP ── */
  dropZone.addEventListener("dragenter", e => { e.preventDefault(); dropZone.classList.add("over"); });
  dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("over"); });
  dropZone.addEventListener("dragleave", e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("over");
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("over");
    addFiles([...e.dataTransfer.files]);
  });

  /* ── CTRL+V / PASTE ── */
  let pasteTimer = null;
  window.addEventListener("paste", e => {
    const cbd   = e.clipboardData || window.clipboardData;
    if (!cbd) return;
    const imgs  = Array.from(cbd.items || []).filter(it => it.kind === "file" && it.type.startsWith("image/"));
    if (!imgs.length) return;
    e.preventDefault();
    const ts = new Date().toISOString().slice(0,19).replace(/[T:]/g,"-");
    const newFiles = imgs.map((it, i) => {
      const blob = it.getAsFile();
      const name = imgs.length === 1 ? `colado_${ts}.png` : `colado_${ts}_${i+1}.png`;
      return new File([blob], name, { type: blob.type || "image/png" });
    });
    addFiles(newFiles);
    pasteMsg.textContent = newFiles.length === 1 ? "✔ Imagem colada com sucesso!" : `✔ ${newFiles.length} imagens coladas!`;
    pasteMsg.classList.add("show");
    dropZone.classList.add("ok");
    clearTimeout(pasteTimer);
    pasteTimer = setTimeout(() => { pasteMsg.classList.remove("show"); dropZone.classList.remove("ok"); }, 3000);
  });

  function addFiles(list) {
    const valid = list.filter(f => f.type.startsWith("image/"));
    if (!valid.length) { alert("Nenhuma imagem válida.\nFormatos aceitos: PNG, JPG, WEBP, BMP."); return; }
    FILES = [...FILES, ...valid];
    loadPreview(FILES);
  }

  /* ── CONVERTER ── */
  btnConvert.addEventListener("click", async () => {
    if (!FILES.length) { alert("Carregue, arraste ou cole pelo menos uma imagem."); return; }
    btnConvert.disabled    = true;
    btnConvert.textContent = "⏳ Processando...";
    progArea.style.display = "block";
    ROWS = []; SKIPPED = [];

    const lang     = document.getElementById("selLang").value;
    const psm      = +document.getElementById("selPsm").value;
    const contrast = +document.getElementById("selContrast").value;
    const doPre    = document.getElementById("chkPre").checked;
    const doInv    = document.getElementById("chkInv").checked;

    for (let i = 0; i < FILES.length; i++) {
      const f = FILES[i];
      showPreview(i);
      setProgress(Math.round((i / FILES.length) * 80), `Imagem ${i+1}/${FILES.length}: ${f.name}`);
      try {
        let src = f;
        if (doPre) {
          setProgress(Math.round(((i+0.2)/FILES.length)*80), `Pré-processando: ${f.name}`);
          src = await preprocessImage(f, contrast, doInv);
        }
        setProgress(Math.round(((i+0.5)/FILES.length)*80), `OCR: ${f.name} [${lang}]`);
        const result = await Tesseract.recognize(src, lang, getTesseractConfig(psm));
        setProgress(Math.round(((i+0.85)/FILES.length)*80), `Parseando: ${f.name}`);
        const { rows, skipped } = parseOCRText(result.data.text);
        ROWS.push(...rows); SKIPPED.push(...skipped);
      } catch (err) {
        console.error(`Erro: "${f.name}":`, err);
        SKIPPED.push(`[ERRO: ${f.name}] ${err.message}`);
      }
    }

    setProgress(100, `✔  ${ROWS.length} linha(s) extraída(s) — ${SKIPPED.length} não reconhecida(s)`);
    renderTable(ROWS); renderErrors(SKIPPED); updateCards(ROWS, SKIPPED);
    setExportData(ROWS, SKIPPED);
    if (ROWS.length || SKIPPED.length) showActions();
    btnConvert.disabled = false;
    btnConvert.textContent = "🔍 Converter imagens";
  });

  function setProgress(pct, msg) { progFill.style.width = pct + "%"; progMsg.textContent = msg; }

  /* ── LIMPAR ── */
  btnClear.addEventListener("click", () => {
    FILES = []; ROWS = []; SKIPPED = [];
    resetPreview(); resetTable(); hideActions(); setExportData([], []);
    progArea.style.display = "none";
    progFill.style.width   = "0%";
    progMsg.textContent    = "Aguardando...";
    fInput.value           = "";
  });

}); // DOMContentLoaded

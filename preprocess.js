/* ══════════════════════════════════════════════════
   preprocess.js
   Pré-processamento de imagem via Canvas API antes do OCR.
   Pipeline: escala → cinza → inversão → contraste → threshold → sharpen
══════════════════════════════════════════════════ */

"use strict";

const KERNEL_SHARPEN = [0, -1, 0, -1, 5, -1, 0, -1, 0];

function applySharpen(data, W, H) {
  const src = new Uint8ClampedArray(data);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let s = 0;
      for (let ky = -1; ky <= 1; ky++)
        for (let kx = -1; kx <= 1; kx++)
          s += src[((y + ky) * W + (x + kx)) * 4] * KERNEL_SHARPEN[(ky + 1) * 3 + (kx + 1)];
      const o = (y * W + x) * 4;
      const v = Math.max(0, Math.min(255, s));
      data[o] = data[o + 1] = data[o + 2] = v;
    }
  }
}

function preprocessImage(file, contrastFactor, doInvert) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.max(1.5, Math.min(3, 3000 / img.width, 3000 / img.height));
      const W  = Math.round(img.width  * sc);
      const H  = Math.round(img.height * sc);
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, W, H);
      const id = ctx.getImageData(0, 0, W, H);
      const d  = id.data;
      for (let i = 0; i < d.length; i += 4) {
        let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (doInvert) g = 255 - g;
        let c = (g - 128) * contrastFactor + 128;
        if      (c > 178) c = 255;
        else if (c <  77) c = 0;
        d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, Math.round(c)));
        d[i + 3] = 255;
      }
      applySharpen(d, W, H);
      ctx.putImageData(id, 0, 0);
      cv.toBlob(
        b => b ? resolve(b) : reject(new Error("canvas→blob falhou")),
        "image/png"
      );
    };
    img.onerror = () => reject(new Error(`Falha ao carregar: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function getTesseractConfig(psm) {
  return {
    tessedit_pageseg_mode:      psm,
    preserve_interword_spaces: "1",
    load_system_dawg:          "0",
    load_freq_dawg:            "0",
    tessedit_char_whitelist:
      "0123456789" +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      "ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜàáâãäçèéêëìíîïñòóôõöùúûü" +
      " /.,;:-_()",
  };
}

window.Preprocess = { preprocessImage, getTesseractConfig };

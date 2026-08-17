const form = document.getElementById("qr-form");
const input = document.getElementById("url-input");
const qrCanvas = document.getElementById("qr-canvas");
const status = document.getElementById("status");
const downloadBtn = document.getElementById("download-btn");
const themeToggle = document.getElementById("theme-toggle");
const jsonForm = document.getElementById("json-form");
const jsonInput = document.getElementById("json-input");
const jsonOutput = document.getElementById("json-output");
const jsonStatus = document.getElementById("json-status");
const clearJsonBtn = document.getElementById("clear-json-btn");
const copyJsonBtn = document.getElementById("copy-json-btn");
const QR_IMAGE_SIZE = 900;
const QR_QUIET_ZONE = 4;
const THEME_KEY = "qr-theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function normalizeUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#a33a21" : "";
}

function setJsonStatus(message, isError = false) {
  jsonStatus.textContent = message;
  jsonStatus.style.color = isError ? "#a33a21" : "";
}

function clearQrCanvas() {
  const context = qrCanvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, QR_IMAGE_SIZE, QR_IMAGE_SIZE);
}

function drawQr(value) {
  const qr = qrcodegen.QrCode.encodeText(
    value,
    qrcodegen.QrCode.Ecc.MEDIUM,
  );
  const totalModules = qr.size + QR_QUIET_ZONE * 2;
  const moduleSize = Math.floor(QR_IMAGE_SIZE / totalModules);
  const renderedSize = totalModules * moduleSize;
  const offset = Math.floor((QR_IMAGE_SIZE - renderedSize) / 2);
  const context = qrCanvas.getContext("2d");

  context.imageSmoothingEnabled = false;
  clearQrCanvas();
  context.fillStyle = "#000000";

  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (!qr.getModule(x, y)) {
        continue;
      }

      context.fillRect(
        offset + (x + QR_QUIET_ZONE) * moduleSize,
        offset + (y + QR_QUIET_ZONE) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage failures and keep the in-memory theme.
  }
}

function getPreferredTheme() {
  const storedTheme = getStoredTheme();

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return systemTheme.matches ? "dark" : "light";
}

function syncThemeToggle(theme) {
  const isDark = theme === "dark";

  themeToggle.textContent = isDark ? "Modo claro" : "Modo oscuro";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeToggle(theme);
}

function compressJson(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Pega un JSON antes de comprimirlo.");
  }

  return JSON.stringify(JSON.parse(trimmed));
}

function updateCompressedJson(value) {
  const compressed = compressJson(value);

  jsonOutput.value = compressed;
  copyJsonBtn.disabled = false;
  setJsonStatus("JSON comprimido correctamente.");
}

function generateQr(value) {
  const normalized = normalizeUrl(value);

  if (!normalized) {
    throw new Error("Escribe un enlace antes de generar el QR.");
  }

  drawQr(normalized);
  downloadBtn.disabled = false;
  downloadBtn.dataset.filename = createFilename(normalized);
  setStatus(`QR listo para: ${normalized}`);
}

function createFilename(value) {
  return (
    value
      .replace(/^https?:\/\//i, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "codigo-qr"
  );
}

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";

  applyTheme(nextTheme);
  setStoredTheme(nextTheme);
});

systemTheme.addEventListener("change", (event) => {
  const storedTheme = getStoredTheme();

  if (storedTheme === "dark" || storedTheme === "light") {
    return;
  }

  applyTheme(event.matches ? "dark" : "light");
});

jsonForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    updateCompressedJson(jsonInput.value);
  } catch (error) {
    jsonOutput.value = "";
    copyJsonBtn.disabled = true;
    setJsonStatus(error.message || "No se pudo comprimir el JSON.", true);
  }
});

copyJsonBtn.addEventListener("click", async () => {
  if (!jsonOutput.value) {
    setJsonStatus("Primero comprime un JSON valido.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    setJsonStatus("Resultado copiado al portapapeles.");
  } catch {
    jsonOutput.focus();
    jsonOutput.select();
    setJsonStatus(
      "No se pudo copiar automaticamente. El resultado quedo seleccionado.",
      true,
    );
  }
});

clearJsonBtn.addEventListener("click", () => {
  jsonInput.value = "";
  jsonOutput.value = "";
  copyJsonBtn.disabled = true;
  setJsonStatus("");
  jsonInput.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  downloadBtn.disabled = true;
  setStatus("Generando QR...");

  try {
    generateQr(input.value);
  } catch {
    clearQrCanvas();
    setStatus(
      "No se pudo generar el QR. Revisa que el enlace no sea demasiado largo.",
      true,
    );
  }
});

downloadBtn.addEventListener("click", () => {
  const filename = downloadBtn.dataset.filename || "codigo-qr";

  if (downloadBtn.disabled) {
    setStatus("Primero genera un QR.", true);
    return;
  }

  qrCanvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus("No se pudo preparar el JPG para descargar.", true);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${filename}.jpg`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setStatus("JPG descargado sin enviar el enlace fuera del navegador.");
    },
    "image/jpeg",
    1,
  );
});

applyTheme(getPreferredTheme());
downloadBtn.disabled = true;
copyJsonBtn.disabled = true;
clearQrCanvas();

try {
  generateQr(input.value);
} catch {
  setStatus("No se pudo generar el QR inicial.", true);
}

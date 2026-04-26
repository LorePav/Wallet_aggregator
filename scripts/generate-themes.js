/**
 * THEME GENERATOR
 *
 * Legge i file JSON da scripts/tokens/ e produce:
 *   - frontend/public/themes/theme-{nome}.css  (variabili CSS :root)
 *   - frontend/public/themes/themes.json        (registry per il ThemeSwitcher React)
 *
 * Valida automaticamente il contrasto WCAG AA (minimo 4.5:1 per testo normale).
 *
 * USO: node scripts/generate-themes.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const TOKENS_DIR = path.join(__dirname, 'tokens');
const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'public', 'themes');

// ──────────────────────────────────────────────
// WCAG 2.1 CONTRAST
// ──────────────────────────────────────────────
function hexToLinear(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = hexToLinear(hex1);
  const l2 = hexToLinear(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ──────────────────────────────────────────────
// GLASS-BG — genera rgba dal surface hex
// ──────────────────────────────────────────────
function surfaceToGlass(hex) {
  if (!hex.startsWith('#') || hex.length !== 7) return 'rgba(21, 27, 43, 0.7)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

// ──────────────────────────────────────────────
// GENERA CSS per un tema
// ──────────────────────────────────────────────
function buildCss(theme) {
  const t = theme.tokens;
  const glass = surfaceToGlass(t.surface);

  // Validazione WCAG
  const ratio = contrastRatio(t.textPrimary, t.bgColor);
  const wcagStatus = ratio !== null
    ? (ratio >= 4.5 ? `✅ ${ratio.toFixed(2)}:1 WCAG AA OK` : `⚠ ${ratio.toFixed(2)}:1 < 4.5 (WCAG AA non rispettato)`)
    : '— (contrasto non calcolabile)';
  console.log(`  WCAG testo/sfondo: ${wcagStatus}`);

  return `/*
 * Theme   : ${theme.displayName || theme.themeName}
 * Info    : ${theme.description || '—'}
 * Source  : ${theme.source || 'curated'}
 * WCAG AA : ${wcagStatus}
 * Generated: ${new Date().toISOString()}
 *
 * NON modificare manualmente — rigenera con:
 *   node scripts/generate-themes.js
 */

:root {
  --bg-color:        ${t.bgColor};
  --font-family:     ${t.fontFamily};
  --surface:         ${t.surface};
  --surface-hover:   ${t.surfaceHover};
  --text-primary:    ${t.textPrimary};
  --text-secondary:  ${t.textSecondary};
  --accent:          ${t.accent};
  --accent-glow:     ${t.accentGlow};
  --success:         ${t.success};
  --danger:          ${t.danger};
  --border:          rgba(255, 255, 255, 0.08);
  --glass-bg:        ${glass};
  --glass-border:    1px solid rgba(255, 255, 255, 0.05);
  --glow-shadow:     0 0 20px var(--accent-glow);
  --radius:          ${t.radius};
}
`;
}

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────
function main() {
  // Crea cartella output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Cartella creata: ${path.relative(process.cwd(), OUTPUT_DIR)}`);
  }

  const files = fs.readdirSync(TOKENS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ Nessun file .json in scripts/tokens/');
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════╗');
  console.log('║      THEME GENERATOR v1.0         ║');
  console.log('╚═══════════════════════════════════╝');

  const registry = [];

  for (const file of files) {
    const name  = path.basename(file, '.json');
    const theme = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, file), 'utf-8'));

    console.log(`\n[${name}] ${theme.displayName || name}`);

    const css     = buildCss(theme);
    const cssFile = `theme-${name}.css`;
    fs.writeFileSync(path.join(OUTPUT_DIR, cssFile), css);
    console.log(`  💾 ${cssFile}`);

    registry.push({
      id:          theme.themeName || name,
      displayName: theme.displayName || name,
      description: theme.description || '',
      file:        cssFile,
      accent:      theme.tokens.accent,
      bgColor:     theme.tokens.bgColor,
      fontFamily:  theme.tokens.fontFamily,
    });
  }

  // Registry JSON per il ThemeSwitcher React
  const registryPath = path.join(OUTPUT_DIR, 'themes.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`\n📋 themes.json salvato (${registry.length} temi)`);
  console.log('✅ Generazione completata.\n');
}

main();

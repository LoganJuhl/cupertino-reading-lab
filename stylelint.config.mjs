import { existsSync } from "node:fs";
const officialConfig = existsSync(new URL("./node_modules/stylelint-config-obsidianmd/index.js", import.meta.url))
  ? "./node_modules/stylelint-config-obsidianmd/index.js"
  : "./work/lint/node_modules/stylelint-config-obsidianmd/index.js";

export default {
  extends: [officialConfig],
  rules: {
    // Obsidian's bundled MathJax owns this custom element; it is not a typo.
    "selector-type-no-unknown": [true, { severity: "warning", ignoreTypes: ["mjx-container"] }],
    // Exact app/CodeMirror/PDF/plugin-owned class names cannot be renamed by a theme.
    "selector-class-pattern": "^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|HyperMD-[a-z0-9-]+|AT-(?:row|multirow|column)|pdfViewer|canvasWrapper|cm-widgetBuffer|kanban-plugin__(?:item|item-input-wrapper)|novel-word-count--(?:active|folder-below|note-inline|note-right)|omnisearch-(?:input-container__buttons|result__(?:body|folder-path|icon|title|title-container)))$",
    // Preserve tested mobile WebKit masks, selection and Electron drag regions.
    "property-no-vendor-prefix": [true, { ignoreProperties: ["-webkit-box-decoration-break", "-webkit-app-region", "-webkit-mask-size", "-webkit-mask-image", "-webkit-mask-position", "-webkit-mask-repeat", "-webkit-user-select"] }],
    // Match the installed Electron 39.8.3 test shell; do not assume a new installer
    // merely because the application has updated to Obsidian 1.13.7.
    "plugin/no-unsupported-browser-features": [true, {
      severity: "warning", browsers: ["electron >= 39"],
      ignore: ["css-nesting", "css-cascade-layers"]
    }]
  },
  // The generated file intentionally appends refinements to an immutable,
  // already more-specific base. Keep this check enabled on authored modules.
  overrides: [{
    files: ["updates/0.4.5/source/base.css", "updates/0.4.5/theme/**/theme.css"],
    rules: {
      // Combining chained :not() changes specificity; retain the inherited cascade.
      "selector-not-notation": null,
      "no-descending-specificity": null,
      // These inherited names can be referenced by Obsidian/app integrations.
      "keyframes-name-pattern": "^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|workspaceLeafIn|menuIn|modalIn|modalInCupertino|bounceInScale|workspaceLeafInFluent|bannerTitleEditIn|bannerTitleEditOut)$"
    }
  }, {
    files: ["theme/**/theme.css", "stages/**/theme.css", "baseline/**/theme.css", "updates/*/theme/**/theme.css"],
    rules: { "no-descending-specificity": null }
  }]
};

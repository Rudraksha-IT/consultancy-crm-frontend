/**
 * Design-system rule 1 (docs/design-system.md): components use tokens only. Rejects, in string and
 * template literals, raw colours (hex, rgb, hsl, ...), Tailwind palette colour classes, and Tailwind
 * arbitrary values that hard-code a size or a shadow. Colours belong in src/lib/theme and globals.css.
 */

const RAW_COLOUR =
  /(?:^|[^\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
const PALETTE_CLASS =
  /(?:^|[\s:!])-?(?:bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?(?=$|[\s"'`])/;
const ARBITRARY_SIZE = /[\w-]+-\[[^\]]*\d(?:px|rem|em)\b[^\]]*\]|\bshadow-\[/;

const CHECKS = [
  ["rawColour", RAW_COLOUR],
  ["paletteClass", PALETTE_CLASS],
  ["arbitrarySize", ARBITRARY_SIZE],
];

/** @param {string} text */
function findProblem(text) {
  const found = CHECKS.find(([, pattern]) => pattern.test(text));
  return found === undefined ? null : found[0];
}

/** @type {import("eslint").Rule.RuleModule} */
export const noRawStyleValues = {
  meta: {
    type: "problem",
    docs: { description: "Use design tokens instead of raw colours, palette classes or sizes." },
    schema: [],
    messages: {
      rawColour: "Raw colour value. Use a design token (e.g. text-ink-2, var(--c1)) instead.",
      paletteClass: "Tailwind palette colour. Use a design token class (e.g. bg-paper) instead.",
      arbitrarySize: "Hard-coded size or shadow. Use a spacing, size or shadow token instead.",
    },
  },
  create(context) {
    /** @param {import("estree").Node} node @param {string} text */
    function check(node, text) {
      const messageId = findProblem(text);
      if (messageId !== null) context.report({ node, messageId });
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

const plugin = { rules: { "no-raw-style-values": noRawStyleValues } };

export default plugin;

import { RuleTester } from "eslint";

import { noRawStyleValues } from "../../eslint-rules/no-raw-style-values.mjs";

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-raw-style-values", noRawStyleValues, {
  valid: [
    { code: 'const className = "bg-paper text-ink-2 border-rule rounded-panel shadow-raise";' },
    { code: 'const a = <a href="#main" className="p-4">Skip</a>;' },
    { code: 'const fill = "var(--c1)";' },
    { code: 'const cols = "grid-cols-[minmax(0,1fr)_auto]";' },
    { code: 'const page = "stone";' },
    { code: "const label = `Step ${String(2)} of 6`;" },
  ],
  invalid: [
    { code: 'const colour = "#047857";', errors: [{ messageId: "rawColour" }] },
    { code: 'const colour = "#fff";', errors: [{ messageId: "rawColour" }] },
    { code: 'const colour = "rgb(0 0 0 / 0.5)";', errors: [{ messageId: "rawColour" }] },
    { code: 'const colour = "rgba(0,0,0,.5)";', errors: [{ messageId: "rawColour" }] },
    { code: 'const colour = "hsl(10 20% 30%)";', errors: [{ messageId: "rawColour" }] },
    { code: "const c = `color: ${x} #abcdef`;", errors: [{ messageId: "rawColour" }] },
    { code: 'const c = "text-red-700";', errors: [{ messageId: "paletteClass" }] },
    { code: 'const c = "hover:bg-zinc-100 p-2";', errors: [{ messageId: "paletteClass" }] },
    { code: 'const c = "bg-white";', errors: [{ messageId: "paletteClass" }] },
    { code: 'const c = <p className="bg-[#fafafa]" />;', errors: [{ messageId: "rawColour" }] },
    { code: 'const c = "w-[13px]";', errors: [{ messageId: "arbitrarySize" }] },
    { code: 'const c = "mt-[1.5rem]";', errors: [{ messageId: "arbitrarySize" }] },
    { code: 'const c = "shadow-[0_1px_2px_black]";', errors: [{ messageId: "arbitrarySize" }] },
  ],
});

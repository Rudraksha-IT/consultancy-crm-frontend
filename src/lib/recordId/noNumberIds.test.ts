import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The guard (ADR 0027, issue 19): no zod schema in the app may declare a record id as a number.
 * A key named `id`, `…_id`, `…Id`, `…_ids` or `…Ids` must be a `RecordIdSchema` (a UUID), so a
 * new schema can never bring record numbers back. A genuine number under such a key would be
 * listed in ALLOWED with its reason; there is none.
 */

const SOURCE = join(process.cwd(), "src");
const ALLOWED: ReadonlyMap<string, string> = new Map();

const ID_KEY = String.raw`["']?(?:id|\w+_id|\w+Id|\w+_ids|\w+Ids)["']?`;
const NUMBER_SCHEMA = String.raw`z\s*\.\s*(?:number|int|coerce\s*\.\s*number|array\(\s*z\s*\.\s*(?:number|int|coerce\s*\.\s*number))\b`;
const NUMBER_ID = new RegExp(String.raw`(?:^|[\s{,(])${ID_KEY}\s*:\s*${NUMBER_SCHEMA}`);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name);
    return isSource ? [path] : [];
  });
}

/** Every `file:line` whose text declares an id key as a number. */
function numberIdsIn(path: string, text: string): string[] {
  return text.split("\n").flatMap((line, index) => {
    const where = `${relative(process.cwd(), path)}:${String(index + 1)}`;
    return NUMBER_ID.test(line) && !ALLOWED.has(where) ? [`${where}: ${line.trim()}`] : [];
  });
}

describe("record ids in schemas (ADR 0027)", () => {
  it.each([
    "id: z.number().int(),",
    "  staff_id: z.number(),",
    "{ id: z.int(), name: z.string() }",
    "courseId: z.coerce.number(),",
    "document_types_ids: z.array(z.number().int()),",
    '"university_id": z.number(),',
  ])("finds a number id in %j", (line) => {
    expect(numberIdsIn("x.ts", line)).toHaveLength(1);
  });

  it.each([
    "id: RecordIdSchema,",
    "page: z.number().int().positive(),",
    "paid: z.number(),",
    "max_bytes: z.number(),",
    "valid: z.boolean(),",
  ])("leaves %j alone", (line) => {
    expect(numberIdsIn("x.ts", line)).toEqual([]);
  });

  it("no schema in the app declares an id as a number", () => {
    const files = sourceFiles(SOURCE);
    expect(files.length).toBeGreaterThan(100);

    const found = files.flatMap((path) => numberIdsIn(path, readFileSync(path, "utf8")));

    expect(found).toEqual([]);
  });
});

import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, postJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";

/** One public internet address, or a range in CIDR form, as the server shows it. */
const NetworkTextSchema = z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()]);

const OfficeNetworkSchema = z.object({
  id: RecordIdSchema,
  label: z.string(),
  network: NetworkTextSchema,
});

const OfficeNetworkChangeSchema = z.object({
  id: RecordIdSchema,
  action: z.enum(["added", "removed"]),
  label: z.string(),
  network: NetworkTextSchema,
  by: z.string(),
  at: z.iso.datetime({ offset: true }),
});

const OfficeNetworkListSchema = z
  .object({
    networks: z.array(OfficeNetworkSchema),
    changes: z.array(OfficeNetworkChangeSchema),
    limits: z.object({
      max_networks: z.number().int().positive(),
      ipv4_widest_prefix: z.number().int().min(0).max(32),
      ipv6_widest_prefix: z.number().int().min(0).max(128),
    }),
  })
  .transform(({ networks, changes, limits }) => ({
    networks,
    changes,
    limits: {
      maxNetworks: limits.max_networks,
      ipv4WidestPrefix: limits.ipv4_widest_prefix,
      ipv6WidestPrefix: limits.ipv6_widest_prefix,
    },
  }));

const CurrentNetworkSchema = z
  .object({
    address: z.union([z.ipv4(), z.ipv6()]).nullable(),
    /** What adding it saves: the address on IPv4, its /64 (the office's group) on IPv6. */
    suggested_network: NetworkTextSchema.nullable(),
    covered: z.boolean(),
  })
  .transform(({ address, suggested_network, covered }) => ({
    address,
    suggestedNetwork: suggested_network,
    isCovered: covered,
  }));

const RefusalSchema = z.object({ detail: z.string() });

/** One internet address or range Staff may clock in from (spec 105). */
export type OfficeNetwork = z.infer<typeof OfficeNetworkSchema>;
/** One Office Network added or removed: who and when. */
export type OfficeNetworkChange = z.infer<typeof OfficeNetworkChangeSchema>;
export type OfficeNetworkList = z.infer<typeof OfficeNetworkListSchema>;
export type OfficeNetworkLimits = OfficeNetworkList["limits"];
/**
 * The caller's own internet address, what "Add the network I'm on now" would add (both null when
 * it isn't known) and whether it is listed.
 */
export type CurrentNetwork = z.infer<typeof CurrentNetworkSchema>;

export const OFFICE_NETWORK_FIELDS = { label: "label", network: "network" } as const;

/** The server refused a new Office Network as a whole, e.g. the office already has the most. */
export class OfficeNetworkRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficeNetworkRefusedError";
  }
}

/** The office's Office Networks, the latest adds and removes, and the limits (Admins only). */
export function fetchOfficeNetworks(fetchFn: typeof fetch = fetch): Promise<OfficeNetworkList> {
  return getJson(API_PATHS.officeNetworks, OfficeNetworkListSchema, fetchFn);
}

/**
 * Add an Office Network. Rejects with `InvalidFieldsError` on `label` or `network`, or with
 * `OfficeNetworkRefusedError` when the office already has as many as it may.
 */
export async function addOfficeNetwork(
  label: string,
  network: string,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeNetwork> {
  try {
    return await postJson(
      API_PATHS.officeNetworks,
      { label, network },
      OfficeNetworkSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, OFFICE_NETWORK_FIELDS) ?? refusalOf(error) ?? error;
  }
}

/** Remove an Office Network; Staff on it can no longer clock in. */
export function removeOfficeNetwork(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.officeNetwork(id), fetchFn);
}

/** The caller's own internet address, for "Add the network I'm on now". */
export function fetchCurrentNetwork(fetchFn: typeof fetch = fetch): Promise<CurrentNetwork> {
  return getJson(API_PATHS.officeNetworkCurrent, CurrentNetworkSchema, fetchFn);
}

function refusalOf(error: unknown): OfficeNetworkRefusedError | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const parsed = RefusalSchema.safeParse(error.body);
  return parsed.success ? new OfficeNetworkRefusedError(parsed.data.detail) : null;
}

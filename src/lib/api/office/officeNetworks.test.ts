import { uid } from "@/test/ids";
import { InvalidFieldsError } from "../core/errors";
import {
  addOfficeNetwork,
  fetchCurrentNetwork,
  fetchOfficeNetworks,
  OfficeNetworkRefusedError,
  removeOfficeNetwork,
} from "./officeNetworks";
import { jsonResponse } from "../core/test-helpers";

const NETWORK = { id: uid(3), label: "Main office wifi", network: "110.44.115.82" };
const LIMITS = { max_networks: 20, ipv4_widest_prefix: 24, ipv6_widest_prefix: 48 };

function answering(response: Response): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("fetchOfficeNetworks", () => {
  it("reads the networks and the limits in frontend terms, with no history", async () => {
    const fetchFn = answering(jsonResponse({ networks: [NETWORK], limits: LIMITS }));

    const list = await fetchOfficeNetworks(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/office-networks/");
    expect(list).toEqual({
      networks: [NETWORK],
      limits: { maxNetworks: 20, ipv4WidestPrefix: 24, ipv6WidestPrefix: 48 },
    });
  });

  it.each([
    { networks: [{ ...NETWORK, id: "3" }], limits: LIMITS },
    { networks: [{ ...NETWORK, network: "not an address" }], limits: LIMITS },
    { networks: [], limits: { ...LIMITS, max_networks: 0 } },
    { networks: [] },
  ])("refuses an answer that doesn't match: %j", async (body) => {
    await expect(fetchOfficeNetworks(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("addOfficeNetwork", () => {
  it("POSTs the name and address as JSON and returns the stored network", async () => {
    const fetchFn = answering(jsonResponse(NETWORK, 201));

    const added = await addOfficeNetwork("Main office wifi", "110.44.115.82", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/office-networks/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ label: "Main office wifi", network: "110.44.115.82" }),
      }),
    );
    expect(added).toEqual(NETWORK);
  });

  it("rejects with the refused fields", async () => {
    const fetchFn = answering(
      jsonResponse({ network: ["That network is already on the list."] }, 400),
    );

    const refused = addOfficeNetwork("Second", "110.44.115.82", fetchFn);

    await expect(refused).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(refused).rejects.toMatchObject({
      fieldErrors: { network: ["That network is already on the list."] },
    });
  });

  it("rejects with the reason when the office already has the most it may", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "An office can have at most 20 networks." }, 400),
    );

    const refused = addOfficeNetwork("One more", "27.34.20.9", fetchFn);

    await expect(refused).rejects.toBeInstanceOf(OfficeNetworkRefusedError);
    await expect(refused).rejects.toMatchObject({
      message: "An office can have at most 20 networks.",
    });
  });

  it("passes any other failure on", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Only an Admin can manage the office network." }, 403),
    );

    await expect(addOfficeNetwork("Office", "110.44.115.82", fetchFn)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("removeOfficeNetwork", () => {
  it("DELETEs the one network", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await removeOfficeNetwork(uid(3), fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      `/api/office-networks/${uid(3)}/`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("fetchCurrentNetwork", () => {
  it("reads my address, what adding it would add, and whether it is covered", async () => {
    const fetchFn = answering(
      jsonResponse({ address: "110.44.115.82", suggested_network: "110.44.115.82", covered: true }),
    );

    expect(await fetchCurrentNetwork(fetchFn)).toEqual({
      address: "110.44.115.82",
      suggestedNetwork: "110.44.115.82",
      isCovered: true,
    });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/office-networks/current/");
  });

  it("reads an IPv6 address with its office group", async () => {
    const fetchFn = answering(
      jsonResponse({
        address: "2400:1a00:b030:9::1",
        suggested_network: "2400:1a00:b030:9::/64",
        covered: false,
      }),
    );

    expect(await fetchCurrentNetwork(fetchFn)).toEqual({
      address: "2400:1a00:b030:9::1",
      suggestedNetwork: "2400:1a00:b030:9::/64",
      isCovered: false,
    });
  });

  it("reads an unknown address as none", async () => {
    const fetchFn = answering(
      jsonResponse({ address: null, suggested_network: null, covered: false }),
    );

    expect(await fetchCurrentNetwork(fetchFn)).toEqual({
      address: null,
      suggestedNetwork: null,
      isCovered: false,
    });
  });

  it.each([
    { address: "<script>alert(1)</script>", suggested_network: null, covered: false },
    { address: "110.44.115.82", suggested_network: "110.44.115.82", covered: "yes" },
    { address: 110, suggested_network: null, covered: false },
    { address: "110.44.115.82", suggested_network: "<b>office</b>", covered: false },
    { address: "110.44.115.82", suggested_network: ["110.44.115.82"], covered: false },
    { address: "110.44.115.82", covered: false },
  ])("refuses an answer that isn't an address: %j", async (body) => {
    await expect(fetchCurrentNetwork(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

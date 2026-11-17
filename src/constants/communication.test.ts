import { CHANNEL_LABELS, CHANNELS, Channel, defaultChannel } from "./communication";

describe("channels (issue 72)", () => {
  it("lists Email first, then SMS, with their labels", () => {
    expect(CHANNELS).toEqual([Channel.Email, Channel.Sms]);
    expect(CHANNELS.map((channel) => CHANNEL_LABELS[channel])).toEqual(["Email", "SMS"]);
  });

  it.each([
    ["sita@example.test", Channel.Email],
    ["", Channel.Sms],
    ["   ", Channel.Sms],
    [undefined, Channel.Email],
  ])("chooses the right channel for the email address %j", (email, chosen) => {
    expect(defaultChannel(email)).toBe(chosen);
  });
});

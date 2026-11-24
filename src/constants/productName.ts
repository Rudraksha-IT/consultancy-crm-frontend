/** The product's own name (first live fixes, ticket 15), changed in Platform → Settings. */

export const PRODUCT_NAME = {
  /** The longest name the server keeps. */
  maxLength: 40,
  /** The server asks Django again after this long, so offices see a change within a minute. */
  cacheSeconds: 60,
  /** After this long without a visit, the kept name is dropped and asked afresh. */
  expireSeconds: 3_600,
  timeoutMs: 3_000,
  backendPath: "/api/platform/brand/",
  /** Where a Platform Admin saves a new name; once Django accepts it, the kept name is dropped. */
  changePath: "/api/platform/brand/name/",
  /** The tag the kept name carries, so a saved change drops it at once (list tidy-ups 05). */
  cacheTag: "product-name",
} as const;

export const PRODUCT_NAME_TEXT = {
  title: "Product name",
  help: "Shown in every browser tab, on the login screens, at the top of the Platform and in its emails. Offices see a change on their next page.",
  label: "Product name",
  hint: "At most 40 characters: letters, numbers, spaces and . - & ' ( ) +",
  save: "Save name",
  saved: "Product name saved.",
  enterName: "Enter the product's name.",
  nothingChanged: "That is already the product's name.",
  failed: "We couldn't save the product's name. Please try again.",
} as const;

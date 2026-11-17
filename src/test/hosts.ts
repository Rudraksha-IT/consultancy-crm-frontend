/**
 * The product domain tests run under: PRODUCT_DOMAIN from the environment, as the app reads it,
 * else the local stack's. Tests build every address from it instead of writing one in.
 */
export const TEST_PRODUCT_DOMAIN = process.env.PRODUCT_DOMAIN ?? "localhost";

/** An address under the test product domain, e.g. `testHost("acme")`. */
export function testHost(subdomain: string): string {
  return `${subdomain}.${TEST_PRODUCT_DOMAIN}`;
}

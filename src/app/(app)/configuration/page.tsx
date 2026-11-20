import { ConfigurationPage } from "@/components/features/configuration/ConfigurationPage";

type ConfigurationRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Configuration; `?section=universities` opens on that section (ticket 10). */
export default async function ConfigurationRoute({ searchParams }: ConfigurationRouteProps) {
  const { section } = await searchParams;
  return <ConfigurationPage startSection={typeof section === "string" ? section : undefined} />;
}

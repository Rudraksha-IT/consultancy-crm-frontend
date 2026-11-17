import type { ReactNode } from "react";

import { DetailList, type DetailItem } from "@/components/ui/DetailList";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";

type DetailsSectionProps = {
  title: string;
  items: readonly DetailItem[];
  /** Shown above the details, e.g. a warning. */
  before?: ReactNode;
};

/** One section of the Profile tab, only shown: it is changed on the Edit details page. */
export function DetailsSection({ title, items, before }: DetailsSectionProps) {
  return (
    <Section title={title}>
      {before}
      <Panel>
        <DetailList items={items} />
      </Panel>
    </Section>
  );
}

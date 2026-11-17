import { Chip } from "@/components/ui/Chip";
import { SETUP_TEXT, SetupState } from "@/constants/consultancyStatus";

type SetupStateChipProps = {
  state: Exclude<SetupState, typeof SetupState.Ready>;
};

/** An office still being set up, or whose setup failed (issue 60): an icon and a word. */
export function SetupStateChip({ state }: SetupStateChipProps) {
  if (state === SetupState.Failed) {
    return (
      <Chip tone="bad" icon="alert">
        {SETUP_TEXT.failed}
      </Chip>
    );
  }
  return (
    <Chip tone="accent" icon="clock">
      {SETUP_TEXT.settingUp}
    </Chip>
  );
}

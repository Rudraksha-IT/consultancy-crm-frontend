import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";

/** The sign-in has timed out or was used: say so, and offer the way back to the password. */
export function StartAgain({ onStartAgain }: { onStartAgain: () => void }) {
  return (
    <div className="grid gap-5">
      <Banner tone="warning">{TEXT.startAgain}</Banner>
      <Button variant="primary" size="lg" onClick={onStartAgain}>
        {TEXT.backToLogIn}
      </Button>
    </div>
  );
}

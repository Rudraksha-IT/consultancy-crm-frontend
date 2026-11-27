"use client";

import clsx from "clsx";
import { Fragment, useState, type ReactNode } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { Journey } from "@/components/ui/Journey";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { STAGE_LABELS, Stage } from "@/constants/stages";
import { setStage, type StudentProfile } from "@/lib/api";
import { localDayIso } from "@/lib/dates";
import { lostStory, type LostMoment } from "@/lib/students";

import { stageFailure } from "./saveErrors";

type StageSectionProps = {
  profile: StudentProfile;
  onSaved: (profile: StudentProfile) => void;
};

/** What sits beside the steps on the sheet keeps the sheet's padding from its sides. */
const IN_SHEET = "max-phone:px-gutter px-5";

/**
 * The Student's journey, the lower part of the sheet that starts with their name (UI revamp 11). Their counsellor or an Admin moves a hand-set Stage by clicking it, and
 * brings a Lost Student back to Counselling from the Lost banner (spec 38-40).
 */
export function StageSection({ profile, onSaved }: StageSectionProps) {
  const { showToast } = useToast();
  const [isMoving, setIsMoving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const isLost = profile.stage === Stage.Lost;

  async function move(stage: Stage, doneMessage: string): Promise<void> {
    setIsMoving(true);
    setFailure(null);
    try {
      const saved = await setStage(profile.id, { stage });
      showToast(doneMessage);
      onSaved(saved);
    } catch (error) {
      setFailure(stageFailure(error));
    }
    setIsMoving(false);
  }

  return (
    <div className="border-rule grid border-t">
      {isLost && (
        <div className={clsx(IN_SHEET, "pt-4")}>
          <Banner
            tone="problem"
            action={
              profile.canSetStage && (
                <Button
                  isLoading={isMoving}
                  loadingLabel={LABELS.saving}
                  onClick={() => void move(Stage.Counselling, MESSAGES.backInCounselling)}
                >
                  {LABELS.bringBackToCounselling}
                </Button>
              )
            }
          >
            <b>{LABELS.lost}</b>{" "}
            <span className="wrap-anywhere whitespace-pre-wrap">{profile.lostReason}</span>
          </Banner>
        </div>
      )}
      <Journey
        isOnSheet
        stage={profile.stage}
        nextStep={profile.progress.nextStep}
        isDone={profile.progress.isDone}
        isMoving={isMoving}
        info={lostBefore(profile)}
        onMoveTo={
          profile.canSetStage
            ? (stage) => void move(stage, MESSAGES.stageSet(STAGE_LABELS[stage]))
            : undefined
        }
      />
      {failure !== null && (
        <div className={clsx(IN_SHEET, "pb-4")}>
          <Banner tone="problem">{failure}</Banner>
        </div>
      )}
    </div>
  );
}

/** The ⓘ, only for a Student who was ever Lost. */
function lostBefore(profile: StudentProfile): ReactNode {
  const story = lostStory(profile.stageChanges);
  return story.length > 0 ? <LostBefore story={story} /> : undefined;
}

/** The ⓘ for a Student who was ever Lost: when they were Lost, why, and when they came back. */
function LostBefore({ story }: { story: readonly LostMoment[] }) {
  const dates = useDates();
  const day = (at: string): string => dates.date(localDayIso(at) ?? at);
  return (
    <>
      <InfoTip label={LABELS.whenTheyWereLost}>
        {story.map((moment, index) => (
          <Fragment key={`${moment.kind}-${moment.at}`}>
            {index > 0 && " "}
            <span className="block">
              {moment.kind === "lost"
                ? LABELS.lostOn(day(moment.at), moment.reason)
                : LABELS.cameBackOn(day(moment.at))}
            </span>
          </Fragment>
        ))}
      </InfoTip>
      <span className="text-small text-ink-2">{LABELS.lostBefore}</span>
    </>
  );
}

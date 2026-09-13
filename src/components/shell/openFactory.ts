import { service } from "../../api/platform";
import { adaptAssessment } from "../../api/adapter";
import { assessmentSchema } from "../../types/domain";
import type { AssessmentDetail, FactorySummary } from "../../api/contracts";
import type { Assessment } from "../../types/domain";

export async function openFactory(
  f: FactorySummary,
  loadAssessment: (data: Assessment, id: string) => void,
): Promise<boolean> {
  if (f.latest_assessment_id) {
    try {
      const detail = await service<AssessmentDetail>(
        "/assessments/" + f.latest_assessment_id,
      );
      loadAssessment(
        assessmentSchema.parse(
          adaptAssessment(detail.result, detail.engine_profile, detail.id),
        ),
        f.id,
      );
      return true;
    } catch {
      /* baseline missing or unreadable -> fall back to the workspace page */
    }
  }
  return false;
}
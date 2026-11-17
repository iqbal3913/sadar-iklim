// src/lib/ai/prompts/index.ts
export {
  VISION_TRIAGE_SYSTEM_INSTRUCTION,
  type VisionTriagePromptInput,
  buildVisionTriagePrompt,
} from "./vision-triage.prompt";

export {
  IBF_SYSTEM_INSTRUCTION,
  type IbfPromptEvidenceInput,
  type IbfPromptInput,
  type IbfPromptRouteInput,
  buildIBFBulletinPrompt,
} from "./ibf.prompt";

export {
  CAMPAIGN_MATCHER_SYSTEM_INSTRUCTION,
  type CampaignCandidatePromptItem,
  type CampaignMatcherPromptInput,
  type DeterministicLogisticsPromptItem,
  buildCampaignMatcherPrompt,
} from "./campaign-matcher.prompt";
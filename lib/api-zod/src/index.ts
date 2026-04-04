export * from "./generated/api";
export type {
  AuthUser,
  AuthUserRole,
  AuthUserEnvelope,
  AuthLogoutSuccess,
  MobileTokenExchangeSuccess,
} from "./generated/types";

import { z } from "zod";

export const ReEngagementSendBody = z.object({
  memberId: z.string(),
  day: z.union([z.literal(3), z.literal(7)]),
});

export const ReEngagementBulkBody = z.object({
  day: z.union([z.literal(3), z.literal(7)]),
});

export type ReEngagementSendBodyType = z.infer<typeof ReEngagementSendBody>;
export type ReEngagementBulkBodyType = z.infer<typeof ReEngagementBulkBody>;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import modalitiesRouter from "./modalities";
import intakesRouter from "./intakes";
import plansRouter from "./plans";
import providersRouter from "./providers";
import favoritesRouter from "./favorites";
import progressRouter from "./progress";
import adminRouter from "./admin";
import coachRouter from "./coach";
import employersRouter from "./employers";
import lmnRouter from "./lmn";
import insightsRouter from "./insights";
import referralsRouter from "./referrals";
import magicLinksRouter from "./magicLinks";
import commsPrefsRouter from "./commsPrefs";
import profileRouter from "./profile";
import notificationLogRouter from "./notificationLog";
import demoRequestsRouter from "./demoRequests";
import healthSyncRouter from "./healthSync";
import storageRouter from "./storage";
import reviewsRouter from "./reviews";
import surveyResponsesRouter from "./surveyResponses";
import membersRouter from "./members";
import testFixturesRouter from "./test-fixtures";
import workersRouter from "./workers";

const router: IRouter = Router();

if (process.env.NODE_ENV === "test") {
  router.use(testFixturesRouter);
}

router.use(healthRouter);
router.use(authRouter);
router.use(modalitiesRouter);
router.use(intakesRouter);
router.use(plansRouter);
router.use(providersRouter);
router.use(favoritesRouter);
router.use(progressRouter);
router.use(adminRouter);
router.use(coachRouter);
router.use(employersRouter);
router.use(lmnRouter);
router.use(insightsRouter);
router.use(referralsRouter);
router.use(magicLinksRouter);
router.use(commsPrefsRouter);
router.use(profileRouter);
router.use(notificationLogRouter);
router.use(demoRequestsRouter);
router.use(healthSyncRouter);
router.use(storageRouter);
router.use(reviewsRouter);
router.use(surveyResponsesRouter);
router.use(membersRouter);
router.use(workersRouter);

export default router;

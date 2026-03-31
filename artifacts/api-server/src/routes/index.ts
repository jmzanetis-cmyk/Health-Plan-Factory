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

const router: IRouter = Router();

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

export default router;

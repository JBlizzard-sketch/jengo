import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { buildingsRouter } from "./buildings";
import { unitsRouter } from "./units";
import { residentsRouter } from "./residents";
import { issuesRouter } from "./issues";
import { announcementsRouter } from "./announcements";
import { visitorsRouter } from "./visitors";
import { paymentsRouter } from "./payments";
import { contractorsRouter, jobsRouter } from "./contractors";
import { dashboardRouter } from "./dashboard";
import { authRouter } from "./auth";
import { portalRouter } from "./portal";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/portal", portalRouter);
router.use("/buildings", buildingsRouter);
router.use("/", unitsRouter);
router.use("/residents", residentsRouter);
router.use("/issues", issuesRouter);
router.use("/announcements", announcementsRouter);
router.use("/visitors", visitorsRouter);
router.use("/payments", paymentsRouter);
router.use("/contractors", contractorsRouter);
router.use("/jobs", jobsRouter);
router.use("/dashboard", dashboardRouter);

export default router;

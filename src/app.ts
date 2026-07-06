import cookieParser from "cookie-parser";
import express,{ Application, Request, Response } from "express";
import config from "./config";
import cors from "cors";
import { prisma } from "./lib/prisma";
import notFound from "./app/middlewares/constants/notFound";
import globalErrorHandler from "./app/middlewares/constants/globalErrorHandler";
import { authRoutes } from "./app/modules/auth/auth.route";
import { categoryRoutes } from "./app/modules/category/category.route";


const app : Application = express();

app.use(cors({
    origin: config.APP_URL,
    credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((cookieParser()));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);

app.use(notFound);
app.use(globalErrorHandler);


app.get("/", async (req: Request, res: Response) => {
    const user = await prisma.user.findMany();
    console.log(user);
    res.send("Hello, World!");
});

export default app;
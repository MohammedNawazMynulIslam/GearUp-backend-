import cookieParser from "cookie-parser";
import express,{ Application, Request, Response } from "express";
import config from "./config";
import cors from "cors";
import { prisma } from "./lib/prisma";
import httpStatus from "http-status";
import notFound from "./app/middlewares/constants/notFound";
import globalErrorHandler from "./app/middlewares/constants/globalErrorHandler";


const app : Application = express();

app.use(cors({
    origin: config.APP_URL,
    credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((cookieParser()));

app.use(notFound);
app.use(globalErrorHandler);


app.get("/", async (req: Request, res: Response) => {
    const user = await prisma.user.findMany();
    console.log(user);
    res.send("Hello, World!");
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
const payload = req.body;

res.status(httpStatus.CREATED).json({ message: "User registered successfully" });
})

export default app;
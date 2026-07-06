import { Request, Response } from "express";
import httpStatus from "http-status";

const notFound = (req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API Not Found",
    errorDetails: [
      {
        path: req.originalUrl,
        message: "This route does not exist.",
      },
    ],
  });
};

export default notFound;
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  ICategoryPayload,
  IUpdateCategoryPayload,
} from "./category.interface";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const createCategory = async (payload: ICategoryPayload) => {
  const name = payload.name.trim();

  const existing = await prisma.category.findUnique({
    where: { name },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "Category name already exists");
  }

  const slug = slugify(name);

  return prisma.category.create({
    data: {
      name,
      slug,
      description: payload.description ?? null,
    },
  });
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const getSingleCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (payload.name) {
    const trimmedName = payload.name.trim();

    const duplicate = await prisma.category.findFirst({
      where: {
        name: trimmedName,
        NOT: { id },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new AppError(httpStatus.CONFLICT, "Category name already exists");
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: trimmedName,
        slug: slugify(trimmedName),
        description: payload.description ?? null,
      },
    });
  }

  return prisma.category.update({
    where: { id },
    data: { description: payload.description ?? null },
  });
};

const deleteCategory = async (id: string) => {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  await prisma.category.delete({ where: { id } });
  return null;
};

export const categoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
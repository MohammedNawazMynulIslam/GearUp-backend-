export type TSortOrder = "asc" | "desc";

export type IPaginationQuery = {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
};

export type IPaginationResult = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: TSortOrder;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER: TSortOrder = "desc";

const calculatePagination = (
  query: IPaginationQuery
): IPaginationResult => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy?.trim() || DEFAULT_SORT_BY;
  const rawOrder = query.sortOrder?.trim().toLowerCase();
  const sortOrder: TSortOrder = rawOrder === "asc" ? "asc" : "desc";

  return { page, limit, skip, sortBy, sortOrder };
};

export default {
  calculatePagination,
};
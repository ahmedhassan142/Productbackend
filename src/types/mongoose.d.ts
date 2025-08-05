import { PaginateModel, PaginateOptions, PaginateResult } from 'mongoose';

declare module 'mongoose' {
  interface Model<T extends Document> extends PaginateModel<T> {}
}
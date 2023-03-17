import { type Brand, make } from "ts-brand";

export type UserId = Brand<number, "id">;
export type UserName = Brand<string, "name">;
export type UserEmail = Brand<string, "email">;

export interface User {
  id: UserId;
  name: UserName;
  email: UserEmail;
}

export const makeUserId = make<UserId>();
export const makeUserName = make<UserName>();
export const makeUserEmail = make<UserEmail>();

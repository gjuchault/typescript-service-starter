import { beforeAll, describe, it, vi, expect } from "vitest";
import {
  makeUserEmail,
  makeUserId,
  makeUserName,
} from "../../../domain/user.js";
import type { UserRepository } from "../../../repository/user/index.js";
import { getUsers, GetUsersResult } from "../get-users.js";

const mockRepository: UserRepository = {
  getUsers: vi.fn().mockResolvedValue([
    {
      id: makeUserId(1),
      name: makeUserName("John"),
      email: makeUserEmail("john@mail.com"),
    },
  ]),
};

describe("getUsers()", () => {
  describe("given a healthy cache and database", () => {
    describe("when called", () => {
      let result: GetUsersResult;

      beforeAll(async () => {
        result = await getUsers({
          userRepository: mockRepository,
        });
      });

      it("returns healthy", () => {
        expect(result).toEqual([
          {
            id: 1,
            name: "John",
            email: "john@mail.com",
          },
        ]);
      });
    });
  });
});

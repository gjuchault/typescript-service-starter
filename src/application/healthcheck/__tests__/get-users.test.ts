import { beforeAll, describe, expect,it, vi } from "vitest";

import type { UserRepository } from "../../../repository/user/index.js";
import { getUsers, GetUsersResult } from "../get-users.js";

const mockRepository: UserRepository = {
  get: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "John",
      email: "john@mail.com",
    },
  ]),
  bulkAdd: vi.fn(),
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

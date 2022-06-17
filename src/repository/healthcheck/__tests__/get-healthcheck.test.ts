import test from "ava";
import sinon from "sinon";
import { createMockPool, createMockQueryResult } from "slonik";
import { createHealthcheckRepository } from "..";

test("getHealthcheck() - healthy database", async (t) => {
  const mockQuery = sinon.stub().resolves(createMockQueryResult([]));

  const repository = createHealthcheckRepository({
    database: createMockPool({
      query: mockQuery,
    }),
  });

  const result = await repository.getHealthcheck();

  t.is(result.outcome, "healthy");
  t.is(mockQuery.callCount, 1);
  t.true(mockQuery.calledWith("select 1"));
});

test("getHealthcheck() - unhealthy database", async (t) => {
  const mockQuery = sinon.stub().rejects(new Error("error"));

  const repository = createHealthcheckRepository({
    database: createMockPool({
      query: mockQuery,
    }),
  });

  const result = await repository.getHealthcheck();

  t.is(result.outcome, "unhealthy");
  t.is(mockQuery.callCount, 1);
  t.true(mockQuery.calledWith("select 1"));
});

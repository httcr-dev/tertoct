import { MUTATION_TOAST_MIN_MS, withMinDuration } from "./withMinDuration";

describe("withMinDuration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves immediately when elapsed time exceeds minimum", async () => {
    const promise = withMinDuration(Promise.resolve("ok"), 100);
    jest.advanceTimersByTime(100);
    await expect(promise).resolves.toBe("ok");
  });

  it("delays resolution until minimum duration elapses", async () => {
    let resolved = false;
    const promise = withMinDuration(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("done"), 10);
      }),
      200,
    ).then((v) => {
      resolved = true;
      return v;
    });

    jest.advanceTimersByTime(10);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(200);
    await expect(promise).resolves.toBe("done");
  });

  it("delays rejection until minimum duration elapses", async () => {
    const err = new Error("fail");
    const promise = withMinDuration(Promise.reject(err), 150);

    jest.advanceTimersByTime(150);
    await expect(promise).rejects.toBe(err);
  });

  it("rejects immediately when minimum already elapsed", async () => {
    jest.setSystemTime(0);
    const err = new Error("late");
    const promise = withMinDuration(
      new Promise((_r, reject) => {
        setTimeout(() => reject(err), 500);
      }),
      100,
    );
    jest.advanceTimersByTime(500);
    await expect(promise).rejects.toBe(err);
  });

  it("resolves immediately when promise finishes after minimum duration", async () => {
    jest.setSystemTime(0);
    const promise = withMinDuration(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("fast-after-min"), 500);
      }),
      100,
    );
    jest.advanceTimersByTime(500);
    await expect(promise).resolves.toBe("fast-after-min");
  });

  it("returns resolved value without delay when minimum already elapsed", async () => {
    jest.setSystemTime(0);
    const promise = withMinDuration(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("late"), 150);
      }),
      100,
    );
    jest.advanceTimersByTime(150);
    await expect(promise).resolves.toBe("late");
  });

  it("delays rejection when promise rejects quickly", async () => {
    let rejected = false;
    const err = new Error("quick fail");
    const promise = withMinDuration(Promise.reject(err), 200).catch((e) => {
      rejected = true;
      throw e;
    });

    await Promise.resolve();
    expect(rejected).toBe(false);
    jest.advanceTimersByTime(200);
    await expect(promise).rejects.toBe(err);
    expect(rejected).toBe(true);
  });

  it("exports default mutation toast minimum", () => {
    expect(MUTATION_TOAST_MIN_MS).toBeGreaterThan(0);
  });
});

import * as healthcheckRepository from "./healthcheck/index.js";
import * as userRepository from "./user/index.js";

export type HealthcheckRepository = typeof healthcheckRepository;
export type UserRepository = typeof userRepository;

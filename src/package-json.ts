import packageJson from "../package.json" with { type: "json" };

export { packageJson };
export type PackageJson = typeof packageJson;

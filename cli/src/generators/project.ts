import type { ProjectConfig } from "../types/project";
import { createProject } from "./create-project";

export const buildProject = async (config: ProjectConfig): Promise<void> => {
  await createProject(config);
};

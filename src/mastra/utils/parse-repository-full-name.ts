export const parseRepositoryFullName = (repoFullName: string) => {
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repoFullName}`);
  }

  return { owner, repo };
};

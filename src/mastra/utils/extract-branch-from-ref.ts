export const extractBranchFromRef = (ref: string) => {
  const branch = ref.trim().replace(/^refs\/heads\//, "");

  if (!branch) throw new Error("Branch not found in ref");

  return branch;
};

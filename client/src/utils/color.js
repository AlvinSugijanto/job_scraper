export function getColor(color) {
  const value = color?.toLowerCase();
  if (!value) return "";

  if (value === "hired") return "success";
}

export const formatRupiah = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (isNaN(number)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

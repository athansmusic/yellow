// Two decimals above a million so 1,950,964 reads 1.95M, not a rounded-up 2M.
export const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : Math.round(n).toLocaleString("en-US"));

/**
 * Calculates the Z-Score of a value given a mean and standard deviation.
 * Z = (X - μ) / σ
 */
export const calculateZScore = (value: number, mean: number, stdDev: number): number => {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
};

/**
 * Calculates Mean and Standard Deviation from an array of numbers.
 */
export const calculateStats = (data: number[]): { mean: number; stdDev: number } => {
    if (data.length === 0) return { mean: 0, stdDev: 0 };

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;

    return {
        mean,
        stdDev: Math.sqrt(variance)
    };
};

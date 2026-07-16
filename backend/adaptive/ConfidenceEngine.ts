export class ConfidenceEngine {
  /**
   * Calculates a confidence score (0.0 to 1.0) based on sample size and variance.
   */
  public static calculateConfidence(samples: number[]): number {
    if (samples.length < 50) return 0; // Not enough data

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is very high relative to the mean, confidence is low.
    const coefficientOfVariation = stdDev / (mean || 1);
    
    // Scale confidence: CV of 0 = 1.0 confidence. CV of 0.5 = 0.0 confidence.
    let confidence = 1.0 - (coefficientOfVariation * 2);
    
    // Weight by sample size (1000 samples = max weight)
    const sizeWeight = Math.min(samples.length / 500, 1.0);
    
    confidence = confidence * sizeWeight;

    return Math.max(0, Math.min(1.0, confidence));
  }
}

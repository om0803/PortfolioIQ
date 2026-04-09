export class PortfolioInsightsService {

    /* ------------------------------------------------------------
     *  CONCENTRATION METRICS
     * ------------------------------------------------------------ */

    // HHI = sum(weights^2)
    calculateHHI(weights: number[]): number {
        return weights.reduce((sum, w) => sum + w * w, 0);
    }

    // Effective Number of Assets = 1 / HHI
    calculateEffectiveAssets(hhi: number): number {
        return hhi === 0 ? 0 : 1 / hhi;
    }

    // Top 3 concentration (sum of largest 3 weights)
    calculateTop3Concentration(weights: number[]): number {
        const sorted = [...weights].sort((a, b) => b - a);
        return sorted.slice(0, 3).reduce((sum, w) => sum + w, 0);
    }

    // Sector exposure → { sector: weight }
    calculateSectorExposure(sectorData: { sector: string; weight: number }[]): Record<string, number> {
        const exposure: Record<string, number> = {};

        for (const item of sectorData) {
            exposure[item.sector] = (exposure[item.sector] || 0) + item.weight;
        }

        return exposure;
    }

    // Asset count = number of weights
    calculateAssetCount(weights: number[]): number {
        return weights.length;
    }

    /* ------------------------------------------------------------
     *  RISK METRICS
     * ------------------------------------------------------------ */

    // Risk Level (Low / Medium / High)
    calculateRiskLevel(volatility: number, var95: number, drawdown: number): string {
        let score = 0;

        if (volatility > 0.30) score += 2;
        else if (volatility > 0.20) score += 1;

        if (var95 < -0.05) score += 2;
        else if (var95 < -0.03) score += 1;

        if (drawdown < -0.25) score += 2;
        else if (drawdown < -0.15) score += 1;

        if (score >= 4) return "HIGH";
        if (score >= 2) return "MEDIUM";
        return "LOW";
    }

    // Risk Score = |VaR| + volatility
    calculateRiskScore(volatility: number, var95: number): number {
        return Math.abs(var95) + volatility;
    }

    /* ------------------------------------------------------------
     *  KEY RISK DRIVERS
     * ------------------------------------------------------------ */

    getRiskDrivers(
        sectorExposure: Record<string, number>,
        volatility: number,
        beta: number,
        top3: number
    ): string[] {
        const drivers: string[] = [];

        // Sector risks
        for (const [sector, weight] of Object.entries(sectorExposure)) {
            if (weight > 0.30) {
                drivers.push(`High exposure to ${sector} sector (${(weight * 100).toFixed(0)}%)`);
            }
        }

        // Volatility risk
        if (volatility > 0.25) {
            drivers.push("High portfolio volatility");
        }

        // Beta risk
        if (beta > 1.2) {
            drivers.push("High market sensitivity (beta > 1.2)");
        }

        // Concentration in top holdings
        if (top3 > 0.50) {
            drivers.push("High concentration in top holdings");
        }

        return drivers;
    }
}

export const portfolioInsightsService = new PortfolioInsightsService();

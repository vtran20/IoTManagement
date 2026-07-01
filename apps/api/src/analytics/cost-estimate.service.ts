import type { UtilityType } from "@iot-management/types";
import { Inject, Injectable, Optional } from "@nestjs/common";

export interface CostRates {
  electricPerKwh: number;
  waterPerGallon: number;
}

const defaultRates: CostRates = {
  electricPerKwh: 0.15,
  waterPerGallon: 0.005,
};

export const COST_RATES = "COST_RATES";

@Injectable()
export class CostEstimateService {
  private readonly rates: CostRates;

  constructor(@Optional() @Inject(COST_RATES) rates?: CostRates) {
    this.rates = rates ?? defaultRates;
  }

  estimate(
    utilityType: UtilityType,
    usageValue: number,
    rates: CostRates = this.rates,
  ): number {
    const rate =
      utilityType === "electric" ? rates.electricPerKwh : rates.waterPerGallon;
    return Math.round(usageValue * rate * 100) / 100;
  }
}

import type { UtilityType } from "@iot-management/types";
import { Injectable } from "@nestjs/common";

export interface CostRates {
  electricPerKwh: number;
  waterPerGallon: number;
}

const defaultRates: CostRates = {
  electricPerKwh: 0.15,
  waterPerGallon: 0.005,
};

@Injectable()
export class CostEstimateService {
  private readonly rates: CostRates;

  constructor(rates: CostRates = defaultRates) {
    this.rates = rates;
  }

  estimate(utilityType: UtilityType, usageValue: number): number {
    const rate =
      utilityType === "electric"
        ? this.rates.electricPerKwh
        : this.rates.waterPerGallon;
    return Math.round(usageValue * rate * 100) / 100;
  }
}

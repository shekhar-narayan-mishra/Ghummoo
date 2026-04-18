// Pattern: Strategy Pattern
// Why: Different guide tiers (budget/premium/luxury) apply different pricing formulas.
// Adding a new tier means adding a new Strategy class — BookingService doesn't change.

// SOLID - OCP: PricingStrategy is open for extension (new strategies) and closed for modification

class PricingStrategy {
  // Abstraction: base interface, all concrete strategies implement this
  calculate(pricePerDay, totalDays) {
    throw new Error('calculate() must be implemented by concrete strategy');
  }
}

// No markup — straightforward base cost
class BudgetPricingStrategy extends PricingStrategy {
  calculate(pricePerDay, totalDays) {
    const base = pricePerDay * totalDays;
    return {
      baseCost: base,
      serviceFee: 0,
      priorityFee: 0,
      total: base,
      breakdown: `Budget: ₹${pricePerDay}/day × ${totalDays} days`,
    };
  }
}

// +15% service fee
class PremiumPricingStrategy extends PricingStrategy {
  calculate(pricePerDay, totalDays) {
    const base = pricePerDay * totalDays;
    const serviceFee = Math.round(base * 0.15);
    return {
      baseCost: base,
      serviceFee,
      priorityFee: 0,
      total: base + serviceFee,
      breakdown: `Premium: ₹${pricePerDay}/day × ${totalDays} days + 15% service fee`,
    };
  }
}

// +25% service fee + ₹500 priority support flat fee
class LuxuryPricingStrategy extends PricingStrategy {
  calculate(pricePerDay, totalDays) {
    const base = pricePerDay * totalDays;
    const serviceFee = Math.round(base * 0.25);
    const priorityFee = 500;
    return {
      baseCost: base,
      serviceFee,
      priorityFee,
      total: base + serviceFee + priorityFee,
      breakdown: `Luxury: ₹${pricePerDay}/day × ${totalDays} days + 25% service fee + ₹500 priority support`,
    };
  }
}

// Factory to pick the right strategy based on guide pricingType
function getPricingStrategy(pricingType) {
  switch (pricingType) {
    case 'premium': return new PremiumPricingStrategy();
    case 'luxury': return new LuxuryPricingStrategy();
    case 'budget':
    default: return new BudgetPricingStrategy();
  }
}

module.exports = { PricingStrategy, BudgetPricingStrategy, PremiumPricingStrategy, LuxuryPricingStrategy, getPricingStrategy };

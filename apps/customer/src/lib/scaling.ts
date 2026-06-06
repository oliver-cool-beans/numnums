export type IngredientUnit = 'g' | 'ml' | 'l' | 'tbs' | 'tsp' | 'cup' | null;

export function scaleIngredient(
  quantity: number | null,
  unit: IngredientUnit,
  baseServings: number,
  targetServings: number
): { quantity: number | null; unit: IngredientUnit } {
  if (quantity === null || baseServings === 0) {
    return { quantity, unit };
  }

  const ratio = targetServings / baseServings;
  const scaled = quantity * ratio;

  // count items (null unit) round to nearest whole number
  if (unit === null) {
    return { quantity: Math.round(scaled), unit: null };
  }

  return { quantity: scaled, unit };
}

// Normalize g/ml-family units to their base unit for comparison against product selling_size
function toBaseUnit(quantity: number, unit: string): number {
  if (unit === 'kg') return quantity * 1000;
  if (unit === 'l') return quantity * 1000;
  return quantity;
}

// Returns how many packages of a product to buy for a scaled ingredient quantity.
// Only valid for g/ml/l units — volumetric cooking units (tbs, tsp, cup) are not
// directly comparable to product selling sizes without density, so return 1.
export function packagesNeeded(
  scaledQuantity: number,
  scaledUnit: IngredientUnit,
  productSellingSize: number,
  productSellingUnit: string
): number {
  if (scaledUnit === null || scaledUnit === 'tbs' || scaledUnit === 'tsp' || scaledUnit === 'cup') {
    return 1;
  }

  const normalizedScaled = toBaseUnit(scaledQuantity, scaledUnit);
  const normalizedProduct = toBaseUnit(productSellingSize, productSellingUnit);

  return Math.ceil(normalizedScaled / normalizedProduct);
}

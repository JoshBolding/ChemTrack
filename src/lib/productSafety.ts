import type { Product } from '../types';

export interface ProductSafety {
  ppe: string;
  spill: string;
  firstAid: string;
  handling: string;
  sdsLabel: string;
}

const defaultSafety: ProductSafety = {
  ppe: 'Gloves, eye protection, FR clothing',
  spill: 'Contain, keep out of drains, notify supervisor',
  firstAid: 'Move to fresh air, rinse exposed skin or eyes, get medical help if symptoms persist',
  handling: 'Keep tote closed, verify label before use, avoid incompatible products',
  sdsLabel: 'SDS placeholder',
};

const safetyByProduct: Record<string, ProductSafety> = {
  ci47: {
    ppe: 'Chemical gloves, goggles or face shield, FR clothing',
    spill: 'Dike with absorbent, prevent runoff, tag tote if leaking',
    firstAid: 'Flush exposed skin or eyes for 15 minutes and report exposure',
    handling: 'Confirm corrosion-inhibitor job requirement before connecting lines',
    sdsLabel: 'CI-47 SDS placeholder',
  },
  si18: {
    ppe: 'Gloves, safety glasses, FR clothing',
    spill: 'Use absorbent, keep away from waterways, dispose per supervisor direction',
    firstAid: 'Rinse skin or eyes thoroughly; seek medical attention for irritation',
    handling: 'Verify scale-inhibitor product and dose plan before pumping',
    sdsLabel: 'SI-18 SDS placeholder',
  },
  fx: {
    ppe: 'Gloves, eye protection, FR clothing',
    spill: 'Foam can spread quickly; contain and avoid walking through product',
    firstAid: 'Move to fresh air if mist is inhaled; rinse contact areas',
    handling: 'Vent slowly and keep away from ignition sources during transfer',
    sdsLabel: 'Foamer X SDS placeholder',
  },
  b12: {
    ppe: 'Chemical gloves, goggles, FR clothing',
    spill: 'Isolate area, contain liquid, avoid direct contact',
    firstAid: 'Flush contact areas and escalate any skin or respiratory symptoms',
    handling: 'Use only with approved job plan and keep incompatible materials separated',
    sdsLabel: 'B-12 SDS placeholder',
  },
};

export function getProductSafety(product?: Pick<Product, 'id'> | null): ProductSafety {
  if (!product) return defaultSafety;
  return safetyByProduct[product.id] ?? defaultSafety;
}

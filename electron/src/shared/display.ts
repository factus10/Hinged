// Display-name lookup tables for enum raw values. Mirrors the Swift
// enums' `displayName` / `shorthand` computed properties.

import type { CatalogSystem, CenteringGrade, CollectionStatus, GumCondition } from './enums.js';

export const catalogSystems: Array<{ value: CatalogSystem; label: string }> = [
  { value: 'scott', label: 'Scott' },
  { value: 'stanleyGibbons', label: 'Stanley Gibbons' },
  { value: 'michel', label: 'Michel' },
  { value: 'yvertTellier', label: 'Yvert et Tellier' },
  { value: 'sakura', label: 'Sakura' },
  { value: 'facit', label: 'Facit' },
  { value: 'other', label: 'Other' },
];

export const gumConditions: Array<{ value: GumCondition; label: string; shorthand: string }> = [
  { value: 'unspecified', label: 'Unspecified', shorthand: '—' },
  { value: 'mintNeverHinged', label: 'Mint Never Hinged', shorthand: 'MNH' },
  { value: 'mintLightlyHinged', label: 'Mint Lightly Hinged', shorthand: 'MLH' },
  { value: 'mintHinged', label: 'Mint Hinged', shorthand: 'MH' },
  { value: 'hingeRemnant', label: 'Hinge Remnant', shorthand: 'HR' },
  { value: 'originalGum', label: 'Original Gum', shorthand: 'OG' },
  { value: 'noGum', label: 'No Gum', shorthand: 'NG' },
  { value: 'regummed', label: 'Regummed', shorthand: 'RG' },
  { value: 'used', label: 'Used', shorthand: 'U' },
  { value: 'cancelledToOrder', label: 'Cancelled to Order', shorthand: 'CTO' },
];

export const centeringGrades: Array<{ value: CenteringGrade; label: string; shorthand: string }> =
  [
    { value: 'unspecified', label: 'Unspecified', shorthand: '—' },
    { value: 'superb', label: 'Superb', shorthand: 'S' },
    { value: 'extremelyFine', label: 'Extremely Fine', shorthand: 'XF' },
    { value: 'veryFine', label: 'Very Fine', shorthand: 'VF' },
    { value: 'fineVeryFine', label: 'Fine-Very Fine', shorthand: 'FVF' },
    { value: 'fine', label: 'Fine', shorthand: 'F' },
    { value: 'veryGood', label: 'Very Good', shorthand: 'VG' },
    { value: 'good', label: 'Good', shorthand: 'G' },
    { value: 'average', label: 'Average', shorthand: 'AVG' },
    { value: 'poor', label: 'Poor', shorthand: 'P' },
    { value: 'spaceFiller', label: 'Space Filler', shorthand: 'SF' },
  ];

export const collectionStatuses: Array<{ value: CollectionStatus; label: string; short: string }> =
  [
    { value: 'owned', label: 'Owned', short: 'Owned' },
    { value: 'wanted', label: 'Wanted', short: 'Want' },
    { value: 'notCollecting', label: 'Not Collecting', short: 'Skip' },
  ];

const byValue = <T extends { value: string; label: string }>(
  list: T[],
): Record<string, string> =>
  list.reduce((acc, it) => {
    acc[it.value] = it.label;
    return acc;
  }, {} as Record<string, string>);

export const catalogSystemLabel = byValue(catalogSystems);
export const gumConditionLabel = byValue(gumConditions);
export const centeringGradeLabel = byValue(centeringGrades);
export const collectionStatusLabel = byValue(collectionStatuses);

export function gumConditionShorthand(raw: string): string {
  return gumConditions.find((g) => g.value === raw)?.shorthand ?? '—';
}
export function centeringGradeShorthand(raw: string): string {
  return centeringGrades.find((g) => g.value === raw)?.shorthand ?? '—';
}

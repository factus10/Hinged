// Ported from src/Models/Enums.swift — raw values MUST match the Swift app
// so .hinged backup files remain byte-compatible in both directions.

export const CatalogSystem = {
  scott: 'scott',
  stanleyGibbons: 'stanleyGibbons',
  michel: 'michel',
  yvertTellier: 'yvertTellier',
  sakura: 'sakura',
  facit: 'facit',
  other: 'other',
} as const;
export type CatalogSystem = (typeof CatalogSystem)[keyof typeof CatalogSystem];

export const catalogSystemDisplayName: Record<CatalogSystem, string> = {
  scott: 'Scott',
  stanleyGibbons: 'Stanley Gibbons',
  michel: 'Michel',
  yvertTellier: 'Yvert et Tellier',
  sakura: 'Sakura',
  facit: 'Facit',
  other: 'Other',
};

export const GumCondition = {
  unspecified: 'unspecified',
  mintNeverHinged: 'mintNeverHinged',
  mintLightlyHinged: 'mintLightlyHinged',
  mintHinged: 'mintHinged',
  hingeRemnant: 'hingeRemnant',
  originalGum: 'originalGum',
  noGum: 'noGum',
  regummed: 'regummed',
  used: 'used',
  cancelledToOrder: 'cancelledToOrder',
} as const;
export type GumCondition = (typeof GumCondition)[keyof typeof GumCondition];

export const CenteringGrade = {
  unspecified: 'unspecified',
  superb: 'superb',
  extremelyFine: 'extremelyFine',
  veryFine: 'veryFine',
  fineVeryFine: 'fineVeryFine',
  fine: 'fine',
  veryGood: 'veryGood',
  good: 'good',
  average: 'average',
  poor: 'poor',
  spaceFiller: 'spaceFiller',
} as const;
export type CenteringGrade = (typeof CenteringGrade)[keyof typeof CenteringGrade];

export const CollectionStatus = {
  owned: 'owned',
  wanted: 'wanted',
  notCollecting: 'notCollecting',
} as const;
export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus];

export const isValidCatalogSystem = (v: string): v is CatalogSystem =>
  Object.values(CatalogSystem).includes(v as CatalogSystem);
export const isValidGumCondition = (v: string): v is GumCondition =>
  Object.values(GumCondition).includes(v as GumCondition);
export const isValidCenteringGrade = (v: string): v is CenteringGrade =>
  Object.values(CenteringGrade).includes(v as CenteringGrade);
export const isValidCollectionStatus = (v: string): v is CollectionStatus =>
  Object.values(CollectionStatus).includes(v as CollectionStatus);

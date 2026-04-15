// Ported from src/Models/Country.swift — Country.ensureDefaultCountries.
// Seeds the countries table with the same default set the Swift app uses,
// matching by case-insensitive name so re-running is a no-op.

import type { DB } from './connection.js';
import {
  countCountries,
  findCountryByNameCI,
  insertCountry,
} from './repositories/countries.js';

type Prefixes = Record<string, string>;

const COUNTRIES_WITH_PREFIXES: Array<{ name: string; prefixes: Prefixes }> = [
  { name: 'United States', prefixes: { scott: 'US', stanleyGibbons: 'USA', michel: 'USA' } },
  { name: 'United Kingdom', prefixes: { scott: 'GB', stanleyGibbons: 'GB', michel: 'GB' } },
  { name: 'Germany', prefixes: { scott: 'GER', stanleyGibbons: 'G', michel: 'D' } },
  { name: 'France', prefixes: { scott: 'FR', stanleyGibbons: 'F', michel: 'F', yvertTellier: 'F' } },
  { name: 'Japan', prefixes: { scott: 'JPN', stanleyGibbons: 'J', sakura: 'J' } },
  { name: 'Canada', prefixes: { scott: 'CAN', stanleyGibbons: 'C' } },
  { name: 'Australia', prefixes: { scott: 'AUS', stanleyGibbons: 'A' } },
  { name: 'China', prefixes: { scott: 'PRC', stanleyGibbons: 'C' } },
  { name: 'Sweden', prefixes: { scott: 'SWE', facit: 'S' } },
  { name: 'Italy', prefixes: { scott: 'IT', stanleyGibbons: 'I' } },
  { name: 'Spain', prefixes: { scott: 'SP', stanleyGibbons: 'S' } },
  { name: 'Netherlands', prefixes: { scott: 'NETH', stanleyGibbons: 'N' } },
  { name: 'Belgium', prefixes: { scott: 'BEL', stanleyGibbons: 'B' } },
  { name: 'Switzerland', prefixes: { scott: 'SWI', stanleyGibbons: 'SW' } },
  { name: 'Austria', prefixes: { scott: 'AUS', stanleyGibbons: 'AU' } },
  { name: 'Russia', prefixes: { scott: 'RUS', stanleyGibbons: 'R' } },
  { name: 'India', prefixes: { scott: 'IND', stanleyGibbons: 'I' } },
  { name: 'Brazil', prefixes: { scott: 'BRA', stanleyGibbons: 'BR' } },
  { name: 'New Zealand', prefixes: { scott: 'NZ', stanleyGibbons: 'NZ' } },
  { name: 'South Africa', prefixes: { scott: 'SA', stanleyGibbons: 'SA' } },
];

const OTHER_COUNTRIES: string[] = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
  'Botswana', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Central African Republic', 'Chad',
  'Chile', 'Colombia', 'Comoros', 'Congo (Democratic Republic)', 'Congo (Republic)',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland',
  'Gabon', 'Gambia', 'Georgia', 'Ghana', 'Greece',
  'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Ivory Coast',
  'Jamaica', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Korea', 'South Sudan', 'Sri Lanka', 'Sudan',
  'Suriname', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
];

/**
 * Inserts any default countries that don't already exist.
 * Safe to call on every startup; runs in a single transaction.
 */
export function ensureDefaultCountries(db: DB): number {
  const tx = db.transaction(() => {
    let inserted = 0;
    for (const { name, prefixes } of COUNTRIES_WITH_PREFIXES) {
      if (findCountryByNameCI(db, name)) continue;
      insertCountry(db, { name, catalogPrefixes: prefixes });
      inserted += 1;
    }
    for (const name of OTHER_COUNTRIES) {
      if (findCountryByNameCI(db, name)) continue;
      insertCountry(db, { name });
      inserted += 1;
    }
    return inserted;
  });
  return tx();
}

/** Seeds countries only if the table is completely empty. */
export function seedDefaultCountriesIfEmpty(db: DB): number {
  if (countCountries(db) > 0) return 0;
  return ensureDefaultCountries(db);
}

import { searchCities } from "../geo/geo";

export interface PlaceSuggestion {
  id: string;
  /** Texte inséré dans le champ. */
  label: string;
  /** Complément affiché sous la suggestion. */
  detail: string;
}

/**
 * PlacesService : autocomplétion d'adresses. Version simulée sur un
 * référentiel de villes ; prévue pour Google Places (clé serveur).
 */
export class PlacesService {
  readonly source = "SIMULATED" as const;

  suggest(query: string, limit = 6): PlaceSuggestion[] {
    return searchCities(query, limit).map((city) => ({
      id: `${city.name}-${city.postalCode}`,
      label: `${city.name} (${city.postalCode})`,
      detail: city.region,
    }));
  }
}

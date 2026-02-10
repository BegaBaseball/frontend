/* Kakao Maps SDK ambient type declarations */

declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; title?: string });
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(options: { content: string; removable?: boolean });
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  namespace services {
    interface PlaceSearchResult {
      place_name: string;
      category_name: string;
      address_name: string;
      road_address_name?: string;
      phone?: string;
      x: string;
      y: string;
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (data: PlaceSearchResult[], status: string) => void,
        options?: { location?: LatLng; radius?: number; sort?: string }
      ): void;
    }

    const Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    const SortBy: { DISTANCE: string; ACCURACY: string };
  }

  namespace event {
    function addListener(target: object, type: string, handler: () => void): void;
  }

  function load(callback: () => void): void;
}

export type ViewSearchParams = {
  selected: string | undefined;
  detail: string | undefined;
  tab: string | undefined;
  panel: string | undefined;
  lat: number | undefined;
  lng: number | undefined;
  z: number | undefined;
};

export const emptyViewSearch: ViewSearchParams = {
  selected: undefined,
  detail: undefined,
  tab: undefined,
  panel: undefined,
  lat: undefined,
  lng: undefined,
  z: undefined,
};

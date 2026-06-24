export type ViewSearchParams = {
  state: string | undefined;
  mode: string | undefined;
  selected: string | undefined;
  map: string | undefined;
  list: string | undefined;
  grid: string | undefined;
  density: string | undefined;
  detail: string | undefined;
  tab: string | undefined;
  sw: string | undefined;
  panel: string | undefined;
};

export const emptyViewSearch: ViewSearchParams = {
  state: undefined,
  mode: undefined,
  selected: undefined,
  map: undefined,
  list: undefined,
  grid: undefined,
  density: undefined,
  detail: undefined,
  tab: undefined,
  sw: undefined,
  panel: undefined,
};

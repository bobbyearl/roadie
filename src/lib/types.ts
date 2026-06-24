export type ViewSearchParams = {
  state: string | undefined;
  selected: string | undefined;
  map: string | undefined;
  list: string | undefined;
  detail: string | undefined;
  tab: string | undefined;
  panel: string | undefined;
};

export const emptyViewSearch: ViewSearchParams = {
  state: undefined,
  selected: undefined,
  map: undefined,
  list: undefined,
  detail: undefined,
  tab: undefined,
  panel: undefined,
};

export type ViewSearchParams = {
  selected: string | undefined;
  map: string | undefined;
  list: string | undefined;
  detail: string | undefined;
  tab: string | undefined;
  panel: string | undefined;
};

export const emptyViewSearch: ViewSearchParams = {
  selected: undefined,
  map: undefined,
  list: undefined,
  detail: undefined,
  tab: undefined,
  panel: undefined,
};


export type Parser<T> = (data: unknown) => T;

export const isNumber = (arg: unknown): arg is number => {
  return typeof arg === 'number' && !isNaN(arg);
};

export const isString = (arg: unknown): arg is string => {
  return typeof arg === 'string';
};

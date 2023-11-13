/**
 * Converts the provided string that may contain a division operation to a number.
 */
export const parseDivisionValue = (value: string): number => {
  return parseFloat(
    value.split('/').reduce((previousValue: string, current: string): string => {
      const x: number = +previousValue;
      const y: number = +current;
      return (x / y).toString();
    })
  );
};

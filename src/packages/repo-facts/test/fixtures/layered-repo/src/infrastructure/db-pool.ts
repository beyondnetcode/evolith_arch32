// Fixture (GT-589). Infrastructure detail nothing outside infrastructure may touch.
export const connectionPool = {
  query(sql: string): string {
    return 'rows-for:' + sql;
  },
};

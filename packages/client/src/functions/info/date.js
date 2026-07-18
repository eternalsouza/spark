export default async () => {
  return new Date().toISOString();
};

export const aliases = [ 'now', 'currentDate' ];
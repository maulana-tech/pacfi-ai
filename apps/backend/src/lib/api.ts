export function successEnvelope<T>(data: T) {
  return {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
}

export function errorEnvelope(error: string) {
  return {
    success: false,
    data: null,
    error,
  };
}

export function orderSuccessEnvelope<T>(key: string, value: T) {
  return {
    ...successEnvelope({ [key]: value }),
    [key]: value,
  } as {
    success: true;
    data: Record<string, T>;
    error: null;
    timestamp: string;
  } & Record<string, T>;
}

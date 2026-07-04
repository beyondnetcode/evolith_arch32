export interface IPlatformDetector {
  isAvailable(): Promise<boolean>;
}

export interface IPlatformProviders {
  npm: IPlatformDetector;
  dotnet: IPlatformDetector;
  python: IPlatformDetector;
  nx?: IPlatformDetector;
}

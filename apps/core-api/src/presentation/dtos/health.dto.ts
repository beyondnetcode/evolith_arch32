export class HealthResponseDto {
  status!: string;
  service!: string;
  timestamp!: string;
  version?: string;
  uptime?: number;
}

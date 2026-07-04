{{- define "evolith-mcp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "evolith-mcp.fullname" -}}
{{- .Release.Name }}-{{ include "evolith-mcp.name" . }}
{{- end }}

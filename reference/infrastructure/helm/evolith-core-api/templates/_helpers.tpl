{{- define "evolith-core-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "evolith-core-api.fullname" -}}
{{- .Release.Name }}-{{ include "evolith-core-api.name" . }}
{{- end }}

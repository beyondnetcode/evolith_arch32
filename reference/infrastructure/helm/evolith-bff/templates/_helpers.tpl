{{- define "evolith-bff.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "evolith-bff.fullname" -}}
{{- .Release.Name }}-{{ include "evolith-bff.name" . }}
{{- end }}

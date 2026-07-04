{{- define "evolith-agent-runtime.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "evolith-agent-runtime.fullname" -}}
{{- .Release.Name }}-{{ include "evolith-agent-runtime.name" . }}
{{- end }}

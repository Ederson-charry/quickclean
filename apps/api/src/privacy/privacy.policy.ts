/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377).
 * Versionada: si cambia el contenido, suba la versión para volver a pedir consentimiento.
 */
export const DATA_POLICY = {
  version: "1.0",
  updatedAt: "2026-06-01",
  title: "Política de Tratamiento de Datos Personales — QuickClean",
  summary:
    "QuickClean (responsable del tratamiento) recolecta y trata datos personales para prestar el servicio de aseo, " +
    "gestionar reservas, pagos, vinculación laboral y obligaciones legales. El titular puede conocer, actualizar, " +
    "rectificar y suprimir sus datos, así como revocar la autorización, conforme a la Ley 1581 de 2012.",
  rights: [
    "Conocer y acceder gratuitamente a sus datos personales (exportación).",
    "Actualizar y rectificar datos parciales, inexactos o incompletos.",
    "Solicitar la supresión de sus datos cuando no exista deber legal de conservarlos.",
    "Revocar la autorización de tratamiento.",
    "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).",
  ],
  retentionNote:
    "Por obligaciones contables, tributarias y laborales, ciertos registros (reservas, pagos, nómina, auditoría) se " +
    "conservan anonimizados aun después de la supresión de la cuenta.",
  contact: "habeasdata@quickclean.co",
} as const;

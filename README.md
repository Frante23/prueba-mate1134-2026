# Confirmación de asistencia MATE1134

Aplicación para registrar el nombre completo, el correo institucional `@alu.uct.cl` y si cada estudiante asistirá a la evaluación. Incluye resultados agregados en tiempo real y un panel docente privado en `/admin`.

## Configuración

1. Conecta un almacén privado de Vercel Blob.
2. Define `BLOB_READ_WRITE_TOKEN`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. Ejecuta `npm run dev` para desarrollo o `npm run build` para producción.

La respuesta más reciente de cada correo reemplaza a la anterior. Los correos solo se entregan desde el endpoint docente después de validar la clave.

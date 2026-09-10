# Arquitectura técnica

## 1. Objetivo y límites

El sistema resuelve una consulta binaria de asistencia para MATE1134. Debe aceptar votos válidos, impedir duplicados por identidad institucional, publicar agregados con baja latencia y reservar el detalle personal al panel docente.

No reemplaza una plataforma académica oficial, no valida que el buzón exista ni autentica al estudiante contra el directorio UCT. La identidad se deriva del correo declarado y su formato.

## 2. Componentes

### Presentación

`app/page.tsx` implementa el formulario. Mantiene tres entradas, calcula avance, ejecuta validaciones compartidas y consulta `/api/results` cada 3,5 segundos. El botón permanece deshabilitado mientras el formulario sea inválido o esté enviándose.

`app/admin/page.tsx` implementa acceso y panel. Las credenciales permanecen únicamente en memoria. La tabla consulta el servidor cada 5 segundos mientras está abierta. No se guardan credenciales en localStorage, cookies ni URL.

`components/results-card.tsx` representa conteos y porcentajes en ambos portales para evitar divergencias visuales.

### HTTP

- `POST /api/responses`: normaliza, valida y persiste.
- `GET /api/results`: calcula y entrega solo agregados.
- `POST /api/teacher`: autentica y entrega resumen más registros.
- `DELETE /api/teacher`: autentica y elimina la identidad solicitada.

Los errores esperables usan HTTP 400 o 401; una configuración ausente usa 503. Las excepciones de persistencia también se transforman en 503 sin filtrar tokens ni detalles internos.

### Dominio

`lib/validation.ts` contiene funciones puras para comprimir espacios del nombre, normalizar correo, exigir nombre y apellido, validar convenciones institucionales, acotar el año y reconocer registros heredados del dominio `alu.uct.cl` para administración.

Separar `isValidUctEmail` de `isUctDomainEmail` es intencional. Crear datos exige la política estricta vigente; limpiar datos históricos exige que el objetivo pertenezca al espacio institucional administrado.

### Persistencia

`lib/store.ts` encapsula Vercel Blob. Ningún componente accede directamente al token.

```text
canonicalEmail = trim(email).toLowerCase()
studentKey     = first32hex(sha256(canonicalEmail))
pathname       = attendance-v1/<studentKey>/record-<timestamp>-<uuid>.json
```

```ts
type AttendanceRecord = {
  name: string;
  email: string;
  answer: "yes" | "no";
  updatedAt: string;
};
```

## 3. Invariantes

### I1. Identidad canónica

Entradas que solo difieren en mayúsculas o espacios exteriores producen el mismo hash y ruta.

### I2. Un voto activo

Existe un solo voto lógico por hash. Cada envío publica un documento completo con URL inmutable y luego elimina las versiones anteriores. Nombre, respuesta y fecha permanecen coherentes.

### I3. Lectura defensiva

`latestPerStudent` agrupa blobs por hash y selecciona el de carga más reciente. Así el esquema nuevo convive temporalmente con datos anteriores sin duplicarlos en totales o tablas.

### I4. Eliminación completa

Una eliminación borra:

```text
attendance-v1/<hash>/*
```

### I5. Privacidad de agregados

`GET /api/results` nunca serializa registros; solo devuelve `AttendanceSummary`. Los registros completos atraviesan autenticación.

## 4. Consistencia y concurrencia

Un envío lista las versiones previas, publica una URL inmutable y después elimina las anteriores. La lectura ofrece semántica de último escritor por fecha de carga. Si dos solicitudes compiten, la reducción conserva una sola versión lógica aunque una carrera deje temporalmente más de un blob físico.

Las URL inmutables evitan que el CDN devuelva una respuesta anterior al cambiar de Sí a No. Durante escritura o migración pueden coexistir brevemente varias versiones; la reducción por hash impide contarlas dos veces. No se usa un contador separado: cada resumen se reconstruye desde registros.

## 5. Cálculo de resultados

1. Listar blobs bajo `attendance-v1/` con paginación de 1000.
2. Agrupar por el segundo segmento, el hash.
3. Seleccionar el blob más reciente por grupo.
4. Descargar documentos privados seleccionados.
5. Ordenar por `updatedAt` descendente.
6. Contar `yes` y `no`.
7. Calcular porcentajes enteros redondeados.

Para un curso esta reconstrucción favorece corrección y simplicidad. A decenas de miles de estudiantes convendría una base transaccional con índice único y agregados materializados.

## 6. Autenticación docente

`ADMIN_EMAIL` y `ADMIN_PASSWORD` se leen solo en servidor. La comparación normaliza el correo, convierte los valores a buffers, comprueba igualdad de longitud y usa `timingSafeEqual`. La API no distingue cuál credencial falló.

No incluir un enlace público a `/admin` reduce descubrimiento casual, pero la seguridad real está en el control del endpoint.

## 7. Validación y fronteras de confianza

La validación del cliente mejora experiencia, pero no es una frontera de seguridad. `POST /api/responses` repite nombre, correo y respuesta. Un cliente que llame directamente a la API recibe las mismas reglas.

Los nombres aceptan letras Unicode, diacríticos, espacios, apóstrofes, punto y guion. Requieren dos palabras y entre 3 y 100 caracteres. La respuesta solo admite `"yes" | "no"`.

## 8. Caché y actualización

Las API declaran `force-dynamic`; las lecturas usan `Cache-Control: no-store`. El navegador también desactiva caché. El sondeo es de 3500 ms para estudiantes y 5000 ms para docentes. “En vivo” significa actualización periódica de pocos segundos, no streaming subsegundo.

## 9. Encabezados de seguridad

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- Sin cámara, micrófono ni geolocalización en `Permissions-Policy`.
- Cabecera `X-Powered-By` desactivada.

## 10. Compatibilidad y migración

Las primeras versiones usaban una ruta por alternativa y luego una ruta sobrescribible. La actual lee todos los diseños, elimina legado en la próxima escritura y borra todo el namespace al eliminar. No requiere migración masiva.

Los registros heredados pueden tener un correo que ya no pasa el patrón vigente. DELETE los admite si mantienen el dominio exacto `@alu.uct.cl`. La excepción no relaja la creación de votos.

## 11. Fallos previstos

| Falla | Comportamiento | Recuperación |
| --- | --- | --- |
| Token Blob ausente | API 503 | Configurar variable y redesplegar. |
| Credenciales ausentes | Panel 503 | Configurar ambos secretos. |
| Credenciales incorrectas | HTTP 401, sin datos | Reintentar o rotar. |
| Correo inválido | HTTP 400, sin escritura | Corregir usuario/año. |
| Corte al consultar | Conserva último resumen visible | Próximo ciclo reintenta. |
| Falla al borrar | Fila permanece y se informa | Reintentar. |
| Legado duplicado | Reductor conserva el reciente | Reenviar o borrar. |

## 12. Evoluciones futuras

- SSO institucional.
- Rate limiting por IP e identidad.
- Historial de auditoría separado del estado vigente.
- Sesiones HTTP-only con expiración.
- Base con restricción única sobre correo canónico.
- Pruebas de integración con almacén aislado.
- Server-Sent Events o servicio realtime.

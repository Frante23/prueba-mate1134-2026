# Historial de cambios

Este documento describe los cambios funcionales y técnicos. Git conserva el detalle exacto por commit.

## 2026-09-10 — Unicidad, saneamiento y documentación

### Creado

- Namespace canónico por identidad y URL inmutable por actualización.
- Normalización compartida de correo.
- Validador administrativo para datos heredados.
- Respuesta `mode: created-or-updated` que explicita la semántica.
- Documentación de arquitectura, invariantes, consistencia y fallos.
- Manual de operación, despliegue, secretos y recuperación.
- Matriz de validación y criterios de aceptación.

### Modificado

- La persistencia pasó de una ruta por alternativa a un namespace versionado por correo.
- El hash utiliza correo sin espacios exteriores y en minúsculas.
- Un envío posterior publica el documento completo y limpia versiones previas.
- La agregación deriva la respuesta del documento, no del nombre del archivo.
- El panel obtiene resumen y registros desde una instantánea lógica.
- La eliminación borra ruta canónica, Sí heredada y No heredada.
- La eliminación ya no aplica reglas de creación a datos antiguos.
- `README.md` se amplió con producto, API, seguridad y despliegue.

### Corregido

- Un voto como `francooyarzo12@alu.uct.cl` se veía, pero no podía eliminarse porque DELETE reutilizaba la validación estricta de creación.
- La tolerancia indiscriminada durante la limpieza podía ocultar fallos reales.
- Variaciones de mayúsculas o espacios quedaron bajo una identidad.
- Una URL sobrescrita podía mostrar temporalmente el voto anterior por la caché mínima de Blob; las versiones inmutables eliminan esa lectura obsoleta.

### Eliminado

- Dependencia lógica de `yes.json` y `no.json` para votos nuevos.
- Captura silenciosa de cualquier error al limpiar la alternativa contraria.
- No se eliminaron pantallas, endpoints ni capacidades de usuario.

## 2026-09-10 — Primera versión funcional

### Creado

- Formulario obligatorio con nombre, correo y respuesta.
- Validación `foyarzo2023` y `franco.oyarzo2023`.
- Resultados agregados con actualización periódica.
- Panel docente separado en `/admin`.
- Autenticación de administración en servidor.
- Detalle, descarga CSV y eliminación confirmada.
- Persistencia privada en Vercel Blob.
- Diseño responsivo para escritorio y teléfono.
- Encabezados de seguridad y configuración de Vercel.

# Integración del sitio Patitas

El sitio funciona como una web estática y no presupone un proveedor. El catálogo de ejemplo, los filtros y el formulario por correo funcionan sin servidor. El dashboard de administración incluye resumen, mascotas, solicitudes de adopción, mensajes, donaciones y datos públicos del sitio. Para iniciar sesión, guardar cambios, conservar las solicitudes y mostrar el historial de donaciones, hay que desplegar una API y completar `js/config.js`.

## Configuración

En `js/config.js`:

- `apiBaseUrl`: origen HTTPS de la API, sin la ruta `/api` (por ejemplo, `https://api.ejemplo.org`).
- `contactEmail`: correo real del refugio para el envío alternativo mediante el programa de correo del visitante.
- `contactPhone` y `openingHours`: canales y horario reales que se mostrarán en la sección de contacto.
- `donationUrl`: enlace HTTPS de pago/donación proporcionado por el procesador elegido. Si queda vacío, el botón dirige al formulario de contacto.

Reemplaza los datos de ejemplo de las mascotas y añade una política de privacidad real antes de publicar el formulario. El sitio no procesa pagos ni guarda solicitudes hasta que se configure una API y un servicio de donación.

## Contrato HTTP

Todas las rutas usan el prefijo `/api`. La API debe permitir el origen exacto del sitio mediante CORS, aceptar credenciales cuando corresponda y responder JSON. Las solicitudes de administración usan una sesión segura en cookie `HttpOnly`, `Secure` y `SameSite`; el servidor debe proteger las operaciones con autorización y defensa CSRF. Nunca pongas contraseñas, claves privadas o secretos en los archivos JavaScript públicos.

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| `GET` | `/animals?status=available` | Público | Catálogo: `id`, `name`, `species`, `label`, `description`, `image_url`, `image_alt`, `status` |
| `GET` | `/posts?status=published` | Público | Publicaciones: `id`, `title`, `summary`, `image_url`, `image_alt`, `status` |
| `POST` | `/adoption-requests` | Público con validación y límites | Crear solicitud de adopción/contacto: `name`, `email`, `interest`, `message`, `consent` |
| `POST` | `/contact-messages` | Público con validación y límites | Crear mensaje general o de voluntariado/donación; mismo cuerpo que la solicitud |
| `POST` | `/admin/session` | Público, autenticación requerida | `{ "email": "...", "password": "..." }`; devuelve `{ "user": { "id": "...", "email": "..." }, "csrfToken": "..." }` y establece una cookie segura |
| `GET` | `/admin/session` | Administrador | Verificar sesión actual; devuelve `user` y `csrfToken` |
| `DELETE` | `/admin/session` | Administrador | Cerrar sesión e invalidar la cookie |
| `GET` | `/admin/animals` | Administrador | Listar mascotas, disponibles y adoptadas |
| `POST` | `/admin/animals` | Administrador | Crear mascota; recibe datos editables y `status` |
| `PUT` | `/admin/animals/{id}` | Administrador | Actualizar mascota |
| `PATCH` | `/admin/animals/{id}` | Administrador | Cambiar `status` a `available` o `adopted` |
| `GET` | `/admin/adoption-requests` | Administrador | Listar solicitudes y mensajes, incluyendo `id`, `name`, `email`, `interest`, `message`, `status`, `created_at` |
| `PATCH` | `/admin/adoption-requests/{id}` | Administrador | Cambiar estado a `new`, `in_review`, `contacted` o `closed` |
| `GET` | `/admin/contact-messages` | Administrador | Listar mensajes de contacto, con la misma forma de respuesta que una solicitud |
| `PATCH` | `/admin/contact-messages/{id}` | Administrador | Cambiar estado de mensaje |
| `GET` | `/admin/posts` | Administrador | Listar publicaciones y borradores |
| `POST` | `/admin/posts` | Administrador | Crear publicación con `title`, `summary`, `image_url`, `image_alt`, `status` |
| `PUT` | `/admin/posts/{id}` | Administrador | Editar publicación |
| `PATCH` | `/admin/posts/{id}` | Administrador | Cambiar visibilidad entre `draft` y `published` |
| `GET` | `/admin/donations` | Administrador | Resumen e historial confirmados por el procesador: `{ "summary": { "total_amount": 0, "currency": "COP", "count": 0 }, "items": [] }` |
| `GET` | `/settings` | Público | Datos públicos: `contactEmail`, `contactPhone`, `openingHours`, `donationUrl` |
| `GET` | `/admin/settings` | Administrador | Leer los datos públicos actuales del sitio |
| `PUT` | `/admin/settings` | Administrador | Guardar los mismos cuatro campos de datos del sitio |

Los errores deben responder con un código HTTP apropiado y, si es posible, `{ "message": "Descripción segura del error" }`. La interfaz muestra estos errores en el sitio; la API no debe devolver información interna ni datos de otras personas a usuarios públicos.

El dashboard solicita los módulos en paralelo y muestra el error de cada módulo de forma explícita. Los conteos del resumen se derivan de las mascotas y solicitudes devueltas por los endpoints de administración: pendientes de adopción son estados `new` o `in_review`; mensajes nuevos usan estado `new`; publicaciones activas usan estado `published`. Los endpoints deben paginar listas grandes o agregar filtros antes de crecer el volumen.

Para operaciones administrativas distintas de `GET`, `HEAD` y `OPTIONS`, la interfaz envía el `csrfToken` recibido al iniciar o restaurar sesión en el encabezado `X-CSRF-Token`. Valídalo en el servidor junto con la cookie de sesión; no aceptes cambios administrativos basándote solo en CORS o en `SameSite`.

## Datos y seguridad del servidor

Como mínimo, almacena:

- **Mascotas:** identificador, nombre, especie (`perro`, `gato`, `ave`, `otro`), detalle, descripción, URL/ruta de imagen, texto alternativo, estado (`available`, `adopted`) y fechas de creación/actualización.
- **Publicaciones:** identificador, título, resumen, URL/ruta de imagen, texto alternativo, visibilidad (`draft`, `published`) y fechas de creación/actualización. La página pública solo muestra publicaciones publicadas.
- **Solicitudes y mensajes:** identificador, nombre, correo, interés/mascota, mensaje, consentimiento, estado (`new`, `in_review`, `contacted`, `closed`) y fecha de creación.
- **Donaciones:** registra o consulta exclusivamente pagos confirmados por el procesador, con fecha, importe, divisa, estado y referencia. No almacenes datos de tarjetas. El historial del dashboard es de solo lectura; requiere integrar los webhooks del procesador en el backend.
- **Configuración pública:** correo, teléfono, horario y URL HTTPS de donación. La web pública obtiene estos datos mediante `GET /settings`.
- **Administradores:** usuarios gestionados por el sistema de autenticación que elijas; no derives privilegios de un campo editable por el usuario.

Valida y limita tamaño/formato de todos los campos en el servidor, aplica límites anti-spam a las rutas públicas, cifra el tráfico con HTTPS y limita la lectura de datos personales a administradores autorizados. No habilites registro público de administradores. Define una política de privacidad y un plazo de retención de solicitudes antes de publicar el formulario.

## Activación y pruebas

1. Implementa el contrato anterior en el backend/proveedor que el refugio elija y despliega la API con HTTPS.
2. Crea cuentas de administración por un canal seguro y prueba autorización denegada para usuarios sin permisos.
3. Configura `apiBaseUrl`, `contactEmail` y `donationUrl`; verifica CORS y cookies desde el dominio publicado.
4. Prueba búsqueda y filtros, envío de solicitudes, cierre de sesión, creación/edición/estado de mascotas, estados de solicitudes, publicaciones, configuración pública y el historial real del procesador.
5. Haz una donación de prueba en el entorno de pruebas del procesador antes de habilitar pagos reales.

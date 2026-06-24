# QuickClean — Diseño: Pivote a plataforma de producción

- **Fecha:** 2026-06-06
- **Autor:** Equipo QuickClean (SmartQuick) + Claude
- **Estado:** Diseño aprobado en sesión de brainstorming, pendiente de revisión final
- **Alcance:** Planeación funcional completa + sugerencias de backend. **No** implementa backend en esta fase; define el spec para los planes de implementación por sub-proyecto.

---

## 1. Contexto y objetivo

QuickClean es hoy una **SPA solo-frontend** (React 19 + TS estricto + Zod + TanStack Query + shadcn/ui + Zustand) construida como demo para un pitch. Toda la data viene de `src/mocks/api.ts`; el "login" es un selector de rol sin credenciales reales (`src/stores/session.ts`); los tipos de servicio son un `enum` fijo y los precios están hardcodeados en `src/lib/pricing.ts`.

**Objetivo de este trabajo:** pivotar hacia una **plataforma de producción real**, empezando por una **planeación funcional completa** con la arquitectura backend recomendada, los más altos estándares de seguridad desde el inicio (Habeas Data Ley 1581 + base para certificación ISO 27001), y un roadmap para completar la plataforma.

### Principio rector del pivote

La migración a backend real debe ser, idealmente, **cambiar solo la capa de datos**:

```
HOY:   componentes → hooks/queries.ts → mocks/api.ts (data falsa)
META:  componentes → hooks/queries.ts → lib/http (cliente real) → API NestJS → Postgres
```

`api.ts` se convierte en un **adaptador** que apunta a `VITE_API_URL`. Se conserva `mocks/` para tests y demo offline. Los componentes no se reescriben.

---

## 2. Stack y arquitectura objetivo

### 2.1 Decisión de stack

- **Backend: NestJS (TypeScript).** Mismo lenguaje que el front → tipos y validaciones Zod compartidos. Sus **Guards** (RBAC + 2FA) e **Interceptors** (auditoría automática) mapean 1:1 con los requisitos transversales. Estructura modular + DI → controles explícitos y testeables (clave para ISO 27001).
  - *Alternativa evaluada y descartada:* Flask. Bueno y ligero, pero introduce un segundo lenguaje, duplica validación (Zod vs Pydantic), y deja los cross-cutting (auditoría/RBAC) cableados a mano.
- **Base de datos: PostgreSQL** (AWS RDS en producción).
- **ORM: Prisma.** Type-safety total, migraciones de primera, y *Client Extensions* ideales para inyectar auditoría, hashing de cadena e immutability del log.
  - *Alternativas:* Drizzle (si se quiere control SQL más fino), TypeORM (descartado por type-safety/mantenimiento).

### 2.2 Topología

```
┌─────────────┐     HTTPS/JWT      ┌──────────────────────────────┐
│  SPA React  │ ─────────────────► │        API NestJS (AWS)      │
│ (Vercel/    │ ◄───────────────── │  Guards (RBAC + 2FA)         │
│  Pages)     │                    │  Interceptor de Auditoría    │
└─────────────┘                    │  helmet + throttler          │
       ▲                           └──────────┬───────────────────┘
       │ Cloudflare (WAF/DDoS/Turnstile)      │ Prisma
       │                           ┌──────────▼───────────┐
       └───────────────────────────│   Postgres (RDS)     │
                                   │  + audit_log (WORM)  │
                                   └──────────────────────┘

Integraciones: ERP SmartQuick (facturación + nómina e.), Openpay (pagos),
  Servicio de Georreferenciación SmartQuick, Servicio de Verificación SmartQuick,
  Twilio (SMS/OTP), SendGrid (email).
```

### 2.3 Descomposición en sub-proyectos

Cada uno tendrá su propio spec + plan de implementación.

| # | Sub-proyecto | Depende de |
|---|--------------|-----------|
| 0 | Fundación backend (andamiaje NestJS, Prisma, `User`, cliente HTTP, AWS/RDS/Cloudflare) | — |
| 1 | Seguridad / Auth real | 0 |
| 2 | Auditoría / Logs | 0, 1 |
| 3 | Catálogo de servicios + tarifas | 0, 1, 2 |
| 4 | Compensación & Vinculación | 0, 1, 2 |
| 5 | Integración ERP + Pagos Openpay + Conciliación | 0–4 |
| 6 | Operación (asignación, disponibilidad, geo, onboarding) | 0–3 |
| 7 | Cumplimiento (PQR, ARCO, gestión documental, disputas) | 0–2 |
| 8 | Notificaciones (completo), observabilidad, backups/DR, feature flags, roles admin | varía |

---

## 3. Sub-proyecto 1 — Seguridad / Auth real

### 3.1 Modelo de identidad (reemplaza `session.ts`)

```
User            id, email (único), phone, status (active|locked|inactive|suspended|pending_verification),
                emailVerifiedAt, phoneVerifiedAt, lastActivityAt, createdAt
Credential      userId, passwordHash (argon2id), passwordChangedAt, mustChangePassword
PasswordHistory userId, passwordHash, createdAt
MfaFactor       userId, type (totp|sms), secret(cifrado), confirmedAt, isDefault
RecoveryCode    userId, codeHash, usedAt
Session         id, userId, refreshTokenHash, ip, userAgent, createdAt, revokedAt, expiresAt
ReactivationToken userId, tokenHash, expiresAt, usedAt
Role            id, key (super_admin|ops|finance|auditor|quicker|client), name
Permission      id, key (ej. service.update, tariff.assign, audit.read)
UserRole / RolePermission   (RBAC)
```

El rol deja de vivir en Zustand. El front guarda el access token en memoria; los roles/permisos vienen firmados en el JWT y se revalidan en el back en cada request.

### 3.2 Autenticación y sesión

- Hash: **argon2id** (OWASP).
- Tokens: **access JWT corto (15 min)** + **refresh rotatorio** (7–30 días) hasheado en `Session`, con **detección de reúso** (reúso de refresh viejo ⇒ revoca toda la familia).
- Refresh en cookie `HttpOnly + Secure + SameSite=Strict`. Access token en memoria (no `localStorage`).
- Logout revoca `Session`. "Cerrar todas las sesiones" para usuario y admin.

### 3.3 2FA / MFA

- **TOTP** primario (`otplib`, secreto cifrado) + **SMS OTP** (Twilio) como alternativa.
- Enrolamiento con QR + verificación; entrega **10 códigos de recuperación** de un solo uso.
- **Obligatorio** para `super_admin`/`ops`/`finance`/`auditor`; opcional para `quicker`/`client`. Guard bloquea rutas sensibles si falta enrolamiento.
- **Step-up auth**: acciones críticas (publicar tarifas, crear admins, exportar datos personales, autorizar quickers) re-piden 2FA.

### 3.4 Política de contraseñas + vigencia **90/90**

Dos relojes de 90 días independientes:

- **90 días → cambio de contraseña.** Vencido `passwordChangedAt`, `mustChangePassword=true`; el login obliga a cambiarla. Avisos a los 75 y 83 días.
- **90 días sin actividad → cuenta `inactive`.** Job programado evalúa `lastActivityAt`. Al intentar entrar, se dispara el **flujo de reactivación**:
  1. Solicita reactivar desde login (con email/teléfono verificado).
  2. OTP/enlace de reactivación de un solo uso y corta expiración (`ReactivationToken`).
  3. Al reactivar: **fuerza cambio de contraseña** + **re-verificación 2FA**.
  4. `admin/ops` también reactiva manualmente (auditado).

Política de contraseña: mínimo 12 caracteres, chequeo contra contraseñas filtradas (k-anonymity HaveIBeenPwned), no triviales/relacionadas al email; **no-reúso** contra `PasswordHistory` (últimas N / 90 días). Cuentas creadas por admin nacen con `mustChangePassword=true`.

> **Nota:** NIST 800-63B moderno desaconseja la rotación forzada por tiempo, pero ISO 27001 y RFP colombianas suelen exigirla. Se deja **activada y configurable** (`PASSWORD_MAX_AGE_DAYS`, `PASSWORD_HISTORY`, `INACTIVITY_DISABLE_DAYS`) combinada con 2FA obligatorio.

### 3.5 Protección de cuenta y red (defensa en profundidad)

| Capa | Qué frena | Herramienta |
|------|-----------|-------------|
| WAF | SQLi, XSS, bots, DDoS, geo | **Cloudflare** (Free→Pro) |
| Rate limit | Ráfagas de requests | `@nestjs/throttler` (por IP y por cuenta) |
| CAPTCHA | Bots en formularios | **Cloudflare Turnstile** (registro, login tras 1er fallo, reset, reactivación; verificado en back) |
| Lockout | Adivinación de credenciales | **5 intentos fallidos → bloqueo hasta el día siguiente** (00:00 `America/Bogota`), o desbloqueo admin |
| Cabeceras | Hardening app | `helmet` |
| 2FA + step-up | Credencial robada | TOTP/SMS + códigos respaldo |

- Reset de contraseña por token de un solo uso, sin revelar si el email existe (anti-enumeración).
- HTTPS forzado, HSTS, CORS estricto, CSP, secretos en gestor (AWS Secrets Manager), no `.env` plano en prod.
- Cada bloqueo dispara alerta de seguridad por email (SendGrid).

### 3.6 Habeas Data (Ley 1581) + base ISO 27001

- **Consentimiento:** `ConsentRecord` (titular, finalidad, versión de política, fecha, canal). Aceptación explícita de la Política de Tratamiento de Datos en registro.
- **Derechos del titular (ARCO):** flujo de acceso/rectificación/actualización/supresión/revocar consentimiento (módulo en Sub-proyecto 7).
- **Minimización y cifrado:** PII sensible (documento, teléfono, secretos MFA) cifrada en reposo; PII fuera de logs.
- **Retención y supresión:** soft-delete + purga programada por tipo de dato.
- **Controles ISO 27001 habilitados:** A.9 (acceso: RBAC+2FA), A.10 (criptografía), A.12.3 (backups), A.12.4 (logging: Sub-proyecto 2), A.9.4 (gestión de credenciales/rotación).

### 3.7 Impacto en el front

`session.ts` → store real (access token en memoria + refresh por cookie). Nuevas pantallas: login real, verificación OTP, enrolar 2FA (QR), cambio/expiración de contraseña, reactivación, "mis sesiones activas", consentimiento, y módulo admin de usuarios/roles/permisos. El `beforeLoad` del router valida token + permisos reales.

---

## 4. Sub-proyecto 2 — Auditoría / Logs

### 4.1 Captura

- **Interceptor global** (`AuditInterceptor`): toda mutación de controladores anotados se registra (actor, acción, recurso, resultado).
- **Eventos de dominio explícitos** vía `AuditService.record()` para lo que el interceptor no ve (login OK/fallido, bloqueo, enrolar/usar 2FA, cambio de contraseña, reactivación, cambio de tarifa, exportación de datos personales, autorización de quicker).
- Decorador **`@Audit('tariff.update')`** para nombrar acción y marcar qué auditar/excluir.

### 4.2 Modelo `audit_log`

```
AuditLog  id, occurredAt, actorId|null, actorRole, action, resourceType, resourceId|null,
          outcome (success|failure|denied), ip, userAgent,
          before jsonb|null, after jsonb|null (PII redactada), metadata jsonb,
          hashPrev, hashSelf
```

`before/after` da el diff; PII enmascarada en el diff; `requestId` correlaciona con logs técnicos.

### 4.3 Inmutabilidad (evidencia)

- **Append-only:** el rol de app solo tiene `INSERT`; sin `UPDATE`/`DELETE` (revocado a nivel Postgres).
- **Encadenamiento por hash:** `hashSelf = hash(contenido + hashPrev)`; job de verificación detecta manipulación.
- **Prisma Client Extension** centraliza hash + redacción al insertar.
- Export firmado a almacenamiento WORM/backup.

### 4.4 Retención

- **Configurable por categoría** (`AUDIT_RETENTION_DAYS`): seguridad/acceso a datos personales con retención larga; operativos menos. Purga programada solo sobre lo que excede política (y la purga se audita).

### 4.5 Visor admin

Ruta `/admin/auditoria` (permiso `audit.read`: `super_admin`, `ops`, `auditor`):
- Filtros (fecha, actor, acción, recurso, outcome, IP), detalle con diff, export CSV/JSON (auditado), y panel de alertas de seguridad. Reutiliza `DataTable`.

### 4.6 Separación

Audit log (negocio/seguridad, legible por auditor) **≠** logs técnicos (pino + Sentry/observabilidad).

---

## 5. Sub-proyecto 3 — Catálogo de servicios + tarifas

### 5.1 Reto técnico

`ServiceType` deja de ser `enum` Zod fijo → pasa a **filas en Postgres** referenciadas por `id`/`slug`. Se reemplaza la exhaustividad de compilación por **validación en runtime** (Zod `.refine()` contra el catálogo activo, en front y back). Iconos: cada tipo guarda `iconName` (resuelto contra registro `lucide-react`).

### 5.2 Modelo

```
ServiceCategory  id, slug, name, description, iconName, colorToken, active, sortOrder, createdAt, archivedAt
Tariff           id, serviceCategoryId, name, effectiveFrom, effectiveTo|null,
                 status (draft|scheduled|active|expired), publishedBy, publishedAt
TariffRule       tariffId, dimension, key, modifierType, value
```

**Versionado, no edición:** una tarifa nunca se edita en sitio; cambiar precios = nueva versión con `effectiveFrom`. La anterior se cierra con `effectiveTo`. Las reservas pasadas conservan su precio (snapshot de `tariffId` en `Booking`). Se pueden **programar** subidas (`scheduled`). Cada publicación se audita (diff).

### 5.3 Motor de precios (generaliza `pricing.ts`)

| Dimensión | Hoy (hardcoded) | Mañana (TariffRule) |
|-----------|-----------------|---------------------|
| Base por duración | `{4:79900,6:109900,8:139900}` | regla `duration` → base |
| Descuento por frecuencia | `{semanal:0.2,…}` | regla `frequency` → % |
| Tamaño | *no afecta (bug)* | regla `size` → multiplicador (se activa) |
| Insumos | `+15000` | regla `supplies` |
| Platform fee | `6900` | regla `platform_fee` |
| Payout quicker | `70%` | regla `payout_pct` por categoría |

Las funciones (`bookingTotal`, `quickerPayout`) mantienen su forma pero leen valores de la tarifa vigente. Corrige el bug de que el tamaño no influía en el precio.

### 5.4 UI admin

- `/admin/servicios` (`service.read|update`): CRUD categorías, **archivar** (no borrar — referenciado por históricos).
- `/admin/tarifas` (`tariff.read|assign`): tarifa vigente, historial de versiones, nueva versión con vigencia, **previsualizador** de precio. **Step-up 2FA** para publicar. Formularios shadcn + Zod.

### 5.5 Impacto en reserva (front)

`Step1Tipo.tsx`: `SERVICE_OPTIONS` hardcodeado → `useServiceCategories()` (TanStack Query). `mocks/api.ts` gana `listServiceCategories()` y `getActiveTariff()`. `types.ts`: `ServiceType` → `serviceCategoryId: string` validado contra catálogo (migración cuidadosa: `Service`, `Booking`, `ServiceAssignment` lo referencian).

---

## 6. Sub-proyecto 4 — Compensación & Vinculación

### 6.1 Regla de negocio

- Cliente **`empresa`** → exige quicker **contratado directamente** (contrato laboral), por solidaridad laboral.
- Cliente **`persona`** → normalmente contratista (`prestacion`), pero algunos exigen contratación directa.
- Puede haber **bonos**, **ocasionales o variables**.

El régimen de contratación **depende de la relación con el cliente**, no es solo atributo del quicker. Se modela a nivel de relación de trabajo.

### 6.2 Modelo

```
Client.requiresDirectHire  bool   (empresa = true por defecto)
EngagementType             enum   contractor (prestación) | employee (laboral)
WorkContract               id, quickerId, clientId|null (null = pool), engagementType, position,
                           baseSalary|hourlyRate, startDate, endDate|null,
                           contractKind (prestacion|fijo|indefinido), status
CompensationItem           id, workContractId|payoutId, kind, amount, taxable,
                           constitutiveOfSalary bool, nature (occasional|variable|fixed), period, note
   kind: salary | service_payout | bonus | transport_aux | deduction | overtime
```

Una persona puede tener varios `WorkContract` (empleada de Empresa X y contratista del pool).

**Bono — matiz CST:** combinación `nature` + `constitutiveOfSalary`:
- `occasional` (mera liberalidad) → típicamente **no** constitutivo (Art. 128 CST).
- `variable` habitual (desempeño/productividad) → suele **sí** ser constitutivo salvo pacto de exclusión.

### 6.3 Flujos

- Reserva de cliente `empresa`/`requiresDirectHire` ⇒ la asignación **exige** quicker con `WorkContract` `employee` para ese cliente (Guard de negocio).
- **Motor de pago bifurcado por `engagementType`:**
  - `contractor` → `Payout` (cuenta de cobro) — ya existe en forma.
  - `employee` → liquidación con `CompensationItem` (salario + bonos + auxilios − deducciones).
- **El cálculo legal de nómina NO se hace en QuickClean.** QuickClean es el *system of record* de la relación y las novedades; **GAF + su ERP** liquidan y emiten **nómina electrónica DIAN** (ver §7).

---

## 7. Sub-proyecto 5 — Integración ERP + Pagos + Conciliación

### 7.1 ERP (SmartQuick) — QuickClean como insumo

QuickClean **no emite facturación ni nómina electrónica**. Las emite el **ERP del área GAF**. QuickClean entrega:
- **Facturable a clientes:** servicios prestados, montos, cliente (empresa/persona) → el ERP factura electrónicamente (DIAN).
- **Novedades de pago/nómina:** payouts de contratistas + `CompensationItem` de empleados (salario, bonos, auxilios, deducciones) → el ERP/GAF liquida y emite **nómina electrónica DIAN**.

Integración: adaptador `erp.service.ts` (contrato a definir con GAF). Cada envío se audita.

### 7.2 Pagos — Openpay

- **Openpay** (openpay.co) como pasarela: cobro real al cliente. `PaymentStep` real (tarjetas y métodos según cobertura Openpay).
- **Conciliación y reembolsos:** módulo que cruza Openpay ↔ ERP; política de cancelación/reembolso, notas crédito.
- **Reporte de conciliación para ERP/GAF:** QuickClean genera un **reporte/archivo de conciliación** (transacciones Openpay cobradas, reembolsos, comisiones de pasarela, neto por periodo, referencias de servicio/cliente) que **GAF y su ERP** consumen para registro contable y facturación. Disponible como pantalla (visor + filtros por periodo) y como **export estructurado** (CSV/JSON o el formato que defina el ERP). Cada generación/descarga del reporte queda **auditada**. Es el puente financiero entre lo que cobra Openpay y lo que contabiliza/factura el ERP.

#### 7.2.1 Integración técnica Openpay (openpay.js)

- **Tokenización cliente con `openpay.js`:** el PAN/CVV viajan **del navegador directo a Openpay**; el backend recibe solo un **token** + `device_session_id` (antifraude). La tarjeta **nunca toca la API NestJS** → reduce el alcance **PCI-DSS a SAQ A/A-EP** (coherente con el estándar de seguridad + ISO, §3).
  - Front (`apps/web/src/lib/openpay.ts`): wrapper **tipado** que carga el script global (`openpay.v1.min.js` + `openpay-data.v1.min.js`), envuelve `OpenPay.token.create()` y `OpenPay.deviceData.setup()` en Promesas. **public key** en el front (segura).
  - Back (`apps/api` módulo `payments`): recibe `{ token, deviceSessionId, ... }` y crea el `charge` contra la API server de Openpay con la **private key** (secreto en **AWS Secrets Manager**, nunca en el front).
- **Flujos soportados por `PaymentStep`:**
  - **Tarjeta:** tokeniza en navegador → `charge` en backend (3DS si aplica).
  - **PSE:** el backend crea el cargo → Openpay devuelve **URL de redirección** al banco → retorno → confirmación por **webhook** (PSE es asíncrono).
- **Webhooks:** endpoint en NestJS que recibe la confirmación asíncrona de Openpay → marca la reserva pagada → alimenta el reporte de conciliación. Verifica firma/origen del webhook.
- **Reembolsos:** `refund` sobre el `charge` → módulo de conciliación / notas crédito.
- **A confirmar en el dashboard de Openpay Colombia** (no documentado públicamente sin cuenta): hosts exactos de API (`(sandbox-)api.openpay.co/v1/{merchantId}`) y de los scripts JS `.co`, esquema de auth (Basic con private key), y catálogo de métodos de pago habilitados para el comercio.

---

## 8. Sub-proyecto 6 — Operación

### 8.1 Torre de Control — Asignación asistida de servicios (perfil admin)

Módulo **admin de primera clase** (`/admin/asignacion`, permiso `assignment.manage`) donde **Operaciones asigna la persona idónea** a cada servicio. Es **asignación asistida**: el sistema **sugiere y rankea candidatos**, el operador **decide** (confirma la sugerencia o asigna manualmente a otro = override). No es matching 100% automático ni 100% manual.

- **Ranking de candidatos** por idoneidad: **capacidad/skill** (qué tipos de servicio sabe hacer), **zona**, **disponibilidad/agenda** (sin choque con otros servicios ni ausencias), **carga** actual, **rating**, y la **regla `empresa → empleado directo`** (cliente `empresa` o `requiresDirectHire` ⇒ solo candidatos con `WorkContract` tipo `employee`, §6).
- **Decisión humana + override:** el operador puede ignorar la sugerencia y asignar a otro; el motivo del override queda registrado.
- **Auditado** (§4): cada asignación/reasignación registra actor, quicker elegido, candidatos sugeridos vs elegido, y motivo.
- **Salida:** crea/actualiza la `ServiceAssignment` que aparece en el `Hoy`/`Solicitudes` del quicker. Soporta **reasignación** (p. ej. por incapacidad de última hora).
- **Vista tipo torre de control:** tablero de servicios del día por estado/zona, con los sin-asignar resaltados.

> **Gap de modelo a resolver aquí:** hoy `Quicker` tiene `zone` pero **no** registra qué **tipos de servicio está habilitado para prestar**. Se añade una **capacidad/skill por categoría de servicio** (`QuickerSkill: quickerId, serviceCategoryId, level?`), sin la cual no se puede sugerir "la persona idónea". Depende del catálogo dinámico (§5).

- **Disponibilidad/agenda del quicker:** horarios, ausencias (`LeaveRequest`), capacidad — insumo del ranking anterior.
- **Georreferenciación:** render con **Leaflet/OpenLayers** en el front; coordenadas/normalización de direcciones vía **servicio de georreferenciación de SmartQuick** (no Google Maps), tras adaptador `geo.service.ts`. Reemplaza el mock `MapView`.
- **Onboarding y verificación de quickers:** estado `pending_review` → se consulta el **servicio de verificación de SmartQuick** (antecedentes/info) → el **admin autoriza o niega** (decisión auditada). Nuevos campos de verificación y `status` en `Quicker`.

---

## 9. Sub-proyecto 7 — Cumplimiento y confianza

- 🔴 **PQR (Peticiones, Quejas, Reclamos):** canal formal con tiempos de respuesta; se conecta con derechos del titular.
- 🔴 **Derechos del titular (ARCO):** flujo Ley 1581 (acceso/rectificación/supresión/revocar consentimiento), con trazabilidad (§3.6).
- 🟠 **Disputas / calificaciones:** moderación de `Rating`, reportes, resolución cliente↔quicker.
- 🟠 **Gestión documental:** almacenamiento seguro y cifrado de contratos, cédulas, incapacidades (retención + auditoría).

---

## 10. Sub-proyecto 8 — Plataforma y comunicaciones

- **Notificaciones:** **Twilio** (SMS/OTP — necesario ya en Fase 1 para 2FA) + **SendGrid** (correos: confirmaciones, alertas de seguridad, OTP email). Módulo completo (plantillas, preferencias, push) en esta fase.
- **Observabilidad:** logs técnicos (pino) + errores (Sentry) + métricas/uptime — distinto del audit log.
- **Backups / DR (AWS RDS):**
  - Producción: instancia **RDS** dedicada (Postgres). Dev/staging comparten la misma instancia (bases/esquemas separados) para ahorrar costo.
  - **Snapshot diario automático**, retención **7 días** → **máximo 7 imágenes**; las más viejas se purgan. (ISO A.12.3.)
- **Roles admin granulares:** super_admin / ops / finance / auditor (RBAC, §3).
- **Feature flags + entornos:** dev/staging/prod, despliegues seguros.

---

## 11. Roadmap (secuencia por dependencias)

```
Fase 0  Fundación backend (NestJS, Prisma, User, cliente HTTP) — AWS + RDS + Cloudflare
Fase 1  Seguridad/Auth + 2FA + 90/90 + WAF   (Twilio+SendGrid mínimos para OTP)
Fase 2  Auditoría / Logs
Fase 3  Catálogo de servicios + tarifas
Fase 4  Compensación & Vinculación (contratista/empleado/bonos)
Fase 5  Integración ERP (insumo facturación + novedades nómina) + Pagos Openpay + Conciliación/reembolsos
Fase 6  Operación: asignación + disponibilidad + georreferenciación SmartQuick (Leaflet/OpenLayers) + onboarding/verificación quickers
Fase 7  Cumplimiento: PQR + derechos del titular (ARCO) + gestión documental + disputas
Fase 8  Notificaciones (completo), observabilidad, backups/DR, feature flags, roles admin
```

---

## 12. Integraciones externas (resumen)

| Capacidad | Proveedor | Naturaleza |
|---|---|---|
| Facturación electrónica | **ERP SmartQuick (GAF)** | Interna |
| Nómina electrónica DIAN | **ERP SmartQuick (GAF)** | Interna |
| Pasarela de pagos | **Openpay** | SaaS externo |
| Mapas (render) | **Leaflet / OpenLayers** | Librería front |
| Georreferenciación | **Servicio SmartQuick** | Interna |
| Verificación de quickers | **Servicio SmartQuick** (+ decisión admin) | Interna + humano |
| SMS / OTP | **Twilio** | SaaS externo |
| Email | **SendGrid** | SaaS externo |
| WAF / DDoS / CAPTCHA | **Cloudflare + Turnstile** | SaaS externo |
| Hosting / DB | **AWS (RDS Postgres)** | Infra |

---

## 13. No-objetivos (de esta fase)

- No se implementa backend todavía; este documento es el spec para los planes por sub-proyecto.
- QuickClean no calcula nómina ni emite documentos electrónicos DIAN (lo hace GAF/ERP).
- No se reescriben los componentes de UI existentes; el pivote cambia la capa de datos detrás de la misma interfaz.

## 14. Puntos abiertos / a confirmar con stakeholders

- Contrato de integración con el **ERP** (formato/endpoints de facturable y novedades de nómina) — a definir con GAF.
- Contrato del **servicio de georreferenciación** y del **servicio de verificación** de SmartQuick.
- Cobertura de **Openpay** (métodos de pago habilitados: PSE, tarjetas, etc.).
- Decisión de hosting de la API NestJS dentro de AWS (ECS/App Runner/EC2).
- Parámetros finales de política: `PASSWORD_HISTORY`, retención de auditoría por categoría.

---

## 15. Decisiones tomadas en la sesión de diseño

1. Pivote a producción real; primero planeación completa + sugerencias de backend.
2. Backend **NestJS** (sobre Flask). DB **Postgres**, ORM **Prisma**.
3. Seguridad al más alto estándar: Habeas Data + base ISO 27001. Secuencia Seguridad → Auditoría → Catálogo.
4. **90/90** = cambio de contraseña a 90 días **y** deshabilitar cuenta tras 90 días de inactividad (+ flujo de reactivación).
5. CAPTCHA (Turnstile), lockout 5 intentos/día, rate limit, **WAF Cloudflare** (Free→Pro) + `helmet` + `throttler`.
6. Catálogo de servicios dinámico (reemplaza enum) + tarifas versionadas.
7. Modelo de **vinculación** contratista/empleado por relación con cliente (`empresa` ⇒ contratación directa) + **bonos** (ocasionales/variables, constitutivos o no).
8. Facturación y nómina electrónica las hace **el ERP de GAF**; QuickClean es el **insumo**.
9. Pagos **Openpay**; QuickClean genera **reporte de conciliación para ERP/GAF**; mapas **Leaflet/OpenLayers**; geo y verificación = **servicios SmartQuick**; SMS **Twilio**; email **SendGrid**.
10. Infra **AWS/RDS**: snapshot diario, retención 7 días (máx. 7 imágenes); no-prod comparte instancia.

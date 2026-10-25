# Usuarios, roles, sesiones y auditoría (FastAPI)

Cómo se modelan y se protegen los usuarios. Las decisiones de **librerías y tokens** están en `docs/PLAN-BACKEND.md` §11 (AuthX + pwdlib + Authlib, cookies `HttpOnly`, un solo login en `/entrar`). Aquí va **cómo se escribe**: tablas, dependencias de FastAPI, reglas.

---

## 1. Quién es quién

Un solo tipo de cuenta (`usuarios`) para todos. Lo que cambia es el **rol**:

| Rol (`clave`) | Quién | Llega a | Ejemplos de lo que puede |
|---|---|---|---|
| `gerente` | Dueño o administrador | El panel | Todo: alta de personal, precios, ajustes (incluida la modalidad de cobro: anticipo o completo, `ajustes.cobro`), ver auditoría, sitios web y sus claves (`sitios.gestionar`) |
| `recepcion` | Recepción | El panel | Reservas, Línea de tiempo, huéspedes, reservas externas |
| `restaurante` | Personal del restaurante | El panel | Menú, tickets, estadísticas del restaurante |
| `huesped` | **Apagado hoy** | (nada) | Sin cuentas de huésped mientras no haya website propia (`frontend/src/lib/producto.js`, `PLAN-BACKEND.md` §0). El rol se conserva para cuando se encienda: entonces llegaría a `/mi-cuenta` y vería solo sus reservas |

- **El personal no se registra solo:** lo da de alta un gerente.
- **Hoy no hay cuentas de huésped:** reserva desde la website externa (WordPress o Shopify) y consulta o cancela su reserva con el enlace de su correo de confirmación (`PLAN-BACKEND.md` §4.3, §11). Si algún día se encienden, se registraría solo o entraría con Google o con un enlace por correo.
- **Los roles NO son niveles.** `restaurante` no está «por debajo» de `recepcion`: ven cosas distintas. Por eso se protege por **permisos**, no por «nivel mínimo».
  - *En SIMDES los roles sí eran niveles (consulta 10 < investigador 50 < admin 80) porque cada rol hacía lo mismo que el de abajo y algo más. Aquí no pasa, y forzarlo en niveles acabaría dándole el restaurante a recepción.*

---

## 2. Tablas

```python
# modelos/usuarios.py
class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    usuario: Mapped[str] = mapped_column(CITEXT, unique=True)          # sin distinguir mayúsculas
    correo: Mapped[str] = mapped_column(CITEXT, unique=True)
    nombre: Mapped[str]
    hash_clave: Mapped[str | None]                                     # None si solo entra con Google/enlace
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    correo_verificado: Mapped[bool] = mapped_column(default=False)
    activo: Mapped[bool] = mapped_column(default=True)                 # dar de baja = desactivar, no borrar
    creado: Mapped[datetime] = mapped_column(server_default=func.now())
    ultimo_acceso: Mapped[datetime | None]
    rol: Mapped["Rol"] = relationship(lazy="joined")


class Rol(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(unique=True)                    # gerente | recepcion | restaurante | huesped
    nombre: Mapped[str]                                                # «Recepción», para la UI
    es_personal: Mapped[bool]                                          # llega al panel o a /mi-cuenta
    permisos: Mapped[list["Permiso"]] = relationship(secondary="roles_permisos", lazy="selectin")


class Permiso(Base):
    __tablename__ = "permisos"
    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(unique=True)                    # «reservas.mover», «restaurante.cobrar»
    modulo: Mapped[str]                                                # reservas | restaurante | usuarios | ajustes…
    descripcion: Mapped[str]
```

Más:

- `roles_permisos (rol_id, permiso_id)`: tabla puente.
- `cuentas_externas (proveedor, id_externo, usuario_id)`: Google y otros (`PLAN-BACKEND.md` §11), `UNIQUE (proveedor, id_externo)`.
- `sesiones`: ver §4.
- `tokens_un_uso (hash, usuario_id, proposito, vence, usado)`: enlace de acceso, recuperar contraseña, verificar correo. **Se guarda el hash, nunca el token.**
- `auditoria`: ver §6.

**Roles y permisos se siembran en la migración que crea sus tablas** (ver arquitectura §6). Un permiso nuevo = una migración que lo inserta y se lo da a los roles que tocan.

---

## 3. Dependencias de FastAPI

Toda ruta declara **qué necesita** con una dependencia. No hay rutas protegidas «por convención».

```python
# auth/dependencias.py
async def usuario_actual(payload: TokenPayload = Depends(auth.access_token_required),
                         sesion: AsyncSession = Depends(get_sesion)) -> Usuario:
    """401 sin sesión válida. El token ya trae rol y permisos (ver abajo), pero
    aquí se carga el Usuario porque casi toda ruta lo necesita."""
    usuario = await repo_usuarios.por_id(sesion, UUID(payload.sub))
    if usuario is None or not usuario.activo:
        raise NoAutenticado("Tu sesión ya no es válida")
    return usuario


def requiere_permiso(*claves: str):
    """403 si al usuario le falta CUALQUIERA de los permisos pedidos."""
    async def _dep(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
        tiene = {p.clave for p in usuario.rol.permisos}
        if not set(claves) <= tiene:
            raise SinPermiso("No tienes permiso para esto")
        return usuario
    return _dep


async def solo_personal(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    """403 si no es personal (huésped). Va en todo lo del panel."""
    if not usuario.rol.es_personal:
        raise SinPermiso("Esta sección es solo para el personal")
    return usuario
```

```python
# rutas/reservas.py
@router.post("/{id}/mover")
async def mover(id: UUID, datos: MoverEntrada,
                usuario: Usuario = Depends(requiere_permiso("reservas.mover")),
                sesion: AsyncSession = Depends(get_sesion)):
    return await servicio_reservas.mover(sesion, usuario, id, datos)
```

Reglas:

- **Cada ruta declara su permiso.** Una ruta del panel sin `requiere_permiso` (o `solo_personal`) es un error, y hay una prueba que lo busca (`docs/BACKEND-COMO-TRABAJAMOS.md` §4.1).
- **«Es suyo» lo decide el servicio, no la ruta:** «una website solo ve las reservas que creó» (y, si vuelven los huéspedes, «un huésped solo ve las suyas») es una regla de negocio. El servicio filtra por `sitio.id` (o `usuario.id`) y, si la reserva es de otro, responde **404** (no 403: no se confirma que existe).
- **El frontend oculta lo que no puedes hacer, pero la protección es la API.** La guardia `RutaProtegida` del frontend es experiencia de uso; la API siempre responde 401/403 por su cuenta.
- **Cero consultas por petición para autenticar** (`PLAN-BACKEND.md` §11): el JWT de acceso lleva `sub`, `rol` y la lista de claves de permiso. Una ruta que solo necesita el permiso puede usar el `TokenPayload` sin cargar el `Usuario`; si cambian los permisos de un rol, se ven al renovar el token (15 min como máximo) o al revocar las sesiones de ese rol.

---

## 4. Sesiones

`PLAN-BACKEND.md` §11 fija los tokens: acceso de 15 min en cookie y renovación que rota en cada uso, **dentro de una sesión que dura como máximo 12 h** desde que se inicia (no se alarga con el uso). Del lado de la base se suma una tabla `sesiones` (es lo que hizo SIMDES y resolvió dos problemas reales):

```python
class SesionUsuario(Base):
    __tablename__ = "sesiones"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    hash_renovacion: Mapped[str] = mapped_column(unique=True)   # SHA-256 del token de renovación vigente
    recordar: Mapped[bool]                                      # «Mantener la sesión iniciada»: cookie que sobrevive a cerrar el navegador (nunca más de 12 h)
    ip: Mapped[str | None]
    agente: Mapped[str | None]                                  # user-agent, para «sesiones abiertas»
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    usada: Mapped[datetime]                                     # última renovación: la que dice si sigue viva
    vence: Mapped[datetime]                                     # creada + 12 h; renovar NO lo mueve
    revocada: Mapped[bool] = mapped_column(default=False)
```

- **Ambos tokens llevan `sid`** (el id de la sesión). Así, una petición sabe a qué sesión pertenece sin depender del token de renovación.
- **Renovar** = buscar la sesión por el hash del token recibido, comprobar que no esté revocada ni vencida, emitir un par nuevo, guardar el hash nuevo y actualizar `usada`. Si llega un token de renovación **ya usado** (alguien lo copió), se revoca **toda** la sesión.
- **«Cerrar sesión en todos los dispositivos»** y **dar de baja a un empleado** = marcar sus `sesiones` como revocadas + poner sus `jti` vigentes en `revocada:<jti>` en Redis (§12 del plan) para que el token de acceso deje de servir al instante.
- **`usada` y no `creada`** para la lista de «sesiones abiertas»: en SIMDES la lista mostraba la fecha de creación como «último acceso» y una sesión abandonada parecía activa durante 90 días.
- **Las sesiones vencidas se purgan** con una tarea de beat diaria.

---

## 5. Contraseñas, registro y entrada

- **Argon2id con pwdlib** (`PasswordHash.recommended()`). Nunca otra cosa, nunca a mano.
- **Mismo tiempo de respuesta exista o no el usuario:** si el usuario no existe, se verifica contra un hash de relleno igualmente. Sin eso, el tiempo de la respuesta revela qué cuentas existen (lo midió una auditoría en SIMDES).
- **Mensaje único al fallar:** «Usuario o contraseña incorrectos». Nunca «ese usuario no existe».
- **Límite de intentos** por IP y por usuario en Redis (`intentos:*`, con TTL). Al pasarse: 429 con cuánto falta.
- **Recuperar contraseña y enlace de acceso:** token de un solo uso, 15 min, se guarda su hash; la respuesta es la misma exista o no el correo («Si el correo está registrado, te llegará un enlace»).
- **`GET /api/auth/yo`** devuelve `{usuario, nombre, correo, rol, permisos}` o 401: es lo único que pide el frontend al cargar.

---

## 6. Auditoría (forense)

**Absolutamente todo** lo que cambia algo, y todo evento de seguridad, queda registrado como **evidencia** (decisión del usuario, 2026-10-11). El detalle técnico está en `docs/PLAN-BACKEND.md` §17.4; el modelo, en `backend/app/modelos/auditoria.py`.

- **La escribe el servicio, en la misma transacción del cambio** (`await auditar(sesion, accion="habitacion.editar", entidad="habitacion", entidad_id=…, antes=…, despues=…)`): o se guardan los dos o ninguno.
- **Quién, sesión, IP, navegador y solicitud salen solos del contexto** (`app/contexto.py`): el servicio no los pasa y ningún evento queda sin ellos.
- **Eventos de seguridad que quedan aunque la respuesta sea un error** (`confirmar=True` en el error de dominio): `sesion.fallo` (con el motivo real, que la persona no ve), `sesion.bloqueada`, `sesion.no_es_personal`, `sesion.reuso_detectado` (token de renovación robado: la sesión se revoca en la base), `sesion.revocada_sin_acceso`, `permiso.denegado`. También `sesion.iniciar`, `sesion.renovar`, `sesion.cerrar`, `sesion.cerrar_todas`.
- **Mirar la auditoría también se audita:** `auditoria.consultar`, `auditoria.verificar`, `auditoria.exportar` (con la huella SHA-256 del archivo).
- **Nunca** guarda contraseñas, tokens ni datos de pago.
- Solo `gerente` la lee (permiso `auditoria.ver`).

---

## 7. Lista de comprobación de seguridad (cada ruta nueva)

- [ ] Declara su dependencia de permiso (o es pública **a propósito**, con un comentario de por qué).
- [ ] El servicio filtra lo ajeno (404, no 403).
- [ ] Entrada validada con un esquema Pydantic con límites (`Field(ge=…, max_length=…)`); nada de `dict` sin forma.
- [ ] La respuesta usa un esquema de salida: nunca devuelve el modelo de SQLAlchemy tal cual (se filtraría `hash_clave`).
- [ ] Si modifica algo: CSRF (AuthX lo exige en toda petición que modifica), **auditoría siempre** (en la misma transacción), `Idempotency-Key` si se puede repetir por doble clic.
- [ ] Sin `X-Accel-Expires` si la respuesta depende de quién la pide (`PLAN-BACKEND.md` §12): **nunca se cachea nada con sesión**.
- [ ] Tiene prueba de 401 (sin sesión) y de 403 (rol sin permiso).

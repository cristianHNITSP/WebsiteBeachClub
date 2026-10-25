"""Configuración por entorno, con fail fast (docs/BACKEND-ARQUITECTURA.md §5).

Dos tipos de ajuste:
- SECRETOS (contraseñas, clave de tokens): solo en `.env` (en producción, desde
  los Secrets de GitHub). Nunca en el código ni en un compose.
- NO secretos (entorno, usuarios, nombres de base, direcciones internas): fijos
  en docker-compose.dev.yml / deploy.sh (decisión del usuario, 2026-10-11).
Si falta uno obligatorio, o trae un valor de relleno, el proceso NO arranca y
dice cuál: estar definida no es estar configurada.
"""

import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, RedisDsn, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

# Valores que delatan una configuración sin terminar.
_RELLENO = {"change-me", "changeme", "cambiame", "cambia-esto", "password", "prueba", "secreto", "postgres"}
# Nombres de usuario y de base: también van en sentencias SQL (GRANT), así que
# solo se aceptan identificadores simples.
_IDENTIFICADOR = re.compile(r"[a-z_][a-z0-9_]{0,62}")


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", frozen=True)

    entorno: Literal["desarrollo", "pruebas", "produccion"]

    # Postgres. Los nombres POSTGRES_* son los mismos que usa su contenedor.
    db_host: str
    db_puerto: int = 5432
    postgres_db: str
    postgres_user: str  # dueño de las tablas: solo lo usan las migraciones
    postgres_password: SecretStr
    api_db_usuario: str  # el de la API: solo lee y escribe filas (PLAN-BACKEND §17.2)
    api_db_clave: SecretStr
    db_tope_consulta_ms: int = Field(default=5000, ge=100, le=60000)
    db_pool: int = Field(default=5, ge=1, le=50)

    redis_url: RedisDsn

    # Firma de los tokens de sesión del panel.
    jwt_secreto: SecretStr
    # De aquí se deriva el secreto de webhooks de cada sitio (PLAN-BACKEND §4.4):
    # así no se guarda en la base. Cambiarla cambia el de todos los sitios.
    clave_webhooks: SecretStr
    # El bot (PLAN-BACKEND §13.1). OPCIONAL: sin ella el bot no busca y lo dice
    # en el panel. Un valor de relleno cuenta como ausente (None).
    brave_search_clave: SecretStr | None = None

    # Carpeta de las fotos (un volumen compartido por api, celery y, en
    # producción, Nginx que las sirve). Ruta absoluta (PLAN-BACKEND §18).
    fotos_dir: Path

    @field_validator("fotos_dir")
    @classmethod
    def _carpeta(cls, v: Path) -> Path:
        if not v.is_absolute():
            raise ValueError("debe ser una ruta absoluta")
        return v

    @field_validator("postgres_db", "postgres_user", "api_db_usuario")
    @classmethod
    def _identificador(cls, v: str) -> str:
        if not _IDENTIFICADOR.fullmatch(v):
            raise ValueError("solo minúsculas, números y guion bajo")
        return v

    @field_validator("postgres_password", "api_db_clave")
    @classmethod
    def _clave_de_base(cls, v: SecretStr) -> SecretStr:
        return _clave_real(v, minimo=16)

    @field_validator("jwt_secreto", "clave_webhooks")
    @classmethod
    def _clave_de_tokens(cls, v: SecretStr) -> SecretStr:
        return _clave_real(v, minimo=32)

    @field_validator("brave_search_clave")
    @classmethod
    def _opcional(cls, v: SecretStr | None) -> SecretStr | None:
        if v is None or v.get_secret_value().lower() in _RELLENO or len(v.get_secret_value()) < 16:
            return None
        return v

    @property
    def es_desarrollo(self) -> bool:
        return self.entorno == "desarrollo"

    def url_api(self) -> URL:
        return self._url(self.api_db_usuario, self.api_db_clave)

    def url_migraciones(self) -> URL:
        return self._url(self.postgres_user, self.postgres_password)

    def _url(self, usuario: str, clave: SecretStr) -> URL:
        # URL.create escapa la contraseña; str(URL) la oculta (nunca sale en un log).
        return URL.create(
            "postgresql+psycopg",
            username=usuario,
            password=clave.get_secret_value(),
            host=self.db_host,
            port=self.db_puerto,
            database=self.postgres_db,
        )


def _clave_real(v: SecretStr, *, minimo: int) -> SecretStr:
    valor = v.get_secret_value()
    if valor.lower() in _RELLENO or len(valor) < minimo:
        raise ValueError(f"falta o es de relleno (mínimo {minimo} caracteres de verdad)")
    return v


@lru_cache
def obtener_config() -> Config:
    """Una sola lectura del entorno por proceso. En pruebas se limpia la caché."""
    return Config()  # type: ignore[call-arg]  # pydantic-settings la llena desde el entorno

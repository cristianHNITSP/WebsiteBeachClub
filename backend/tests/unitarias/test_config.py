"""La configuración falla rápido: sin variables o con valores de relleno, no arranca."""

import pytest
from pydantic import ValidationError

from app.config import Config

BUENA = {
    "ENTORNO": "desarrollo",
    "DB_HOST": "db",
    "POSTGRES_DB": "beachclub",
    "POSTGRES_USER": "migraciones",
    "POSTGRES_PASSWORD": "Zq7-largo-de-verdad-1",
    "API_DB_USUARIO": "api",
    "API_DB_CLAVE": "Kx9-largo-de-verdad-2",
    "REDIS_URL": "redis://redis:6379/0",
    "FOTOS_DIR": "/datos/fotos",
    "JWT_SECRETO": "x" * 40,
    "CLAVE_WEBHOOKS": "w" * 40,
}


def _config(monkeypatch, **cambios):
    for k in (*BUENA, *cambios):
        monkeypatch.delenv(k, raising=False)
    for k, v in {**BUENA, **cambios}.items():
        if v is not None:
            monkeypatch.setenv(k, v)
    return Config(_env_file=None)


def test_configuracion_completa(monkeypatch):
    c = _config(monkeypatch)
    assert c.es_desarrollo
    assert c.url_api().username == "api"
    assert "Kx9" not in str(c.url_api())  # la contraseña nunca sale al imprimir la URL


@pytest.mark.parametrize("falta", list(BUENA))
def test_sin_variable_no_arranca(monkeypatch, falta):
    with pytest.raises(ValidationError):
        _config(monkeypatch, **{falta: None})


@pytest.mark.parametrize("clave", ["change-me", "cambiame", "", "postgres", "corta-12345"])
def test_clave_de_relleno_o_corta_no_arranca(monkeypatch, clave):
    with pytest.raises(ValidationError, match="relleno"):
        _config(monkeypatch, API_DB_CLAVE=clave)


def test_jwt_corto_no_arranca(monkeypatch):
    with pytest.raises(ValidationError, match="32"):
        _config(monkeypatch, JWT_SECRETO="y" * 31)


def test_usuario_con_caracteres_raros_no_arranca(monkeypatch):
    with pytest.raises(ValidationError, match="minúsculas"):
        _config(monkeypatch, API_DB_USUARIO='api"; DROP TABLE x; --')

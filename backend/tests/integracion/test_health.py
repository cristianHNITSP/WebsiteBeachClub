async def test_vivo(cliente):
    r = await cliente.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"estado": "ok"}


async def test_listo_con_base_y_redis(cliente):
    r = await cliente.get("/api/health/listo")
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["base"] == "ok" and cuerpo["redis"] == "ok"
    assert cuerpo["celery"] in {"ok", "sin latido", "desconocido"}


async def test_ruta_inexistente_con_forma_unica_de_error(cliente):
    r = await cliente.get("/api/no-existe")
    assert r.status_code == 404
    assert set(r.json()) == {"error", "codigo"}

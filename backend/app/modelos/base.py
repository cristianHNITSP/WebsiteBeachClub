"""Base de los modelos de SQLAlchemy.

Nombres de restricciones e índices fijos y predecibles: Alembic los necesita
para poder borrarlos en un `downgrade` sin adivinar el nombre que puso Postgres.
"""

from datetime import datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, MetaData, String, event
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    ORMExecuteState,
    Session,
    mapped_column,
    with_loader_criteria,
)

NOMBRES = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NOMBRES)
    # Todo `datetime` es timestamptz: los momentos se guardan con zona horaria
    # (PLAN-BACKEND §7). Las NOCHES de una estancia son `date`, en hora de Mérida.
    type_annotation_map: ClassVar[dict[Any, Any]] = {datetime: DateTime(timezone=True)}


class ConBorradoLogico:
    """Papelera y borrado definitivo, iguales para todo modelo (PLAN-BACKEND §19).

    - Borrar = mandar a la papelera (`eliminado_en`). Lo borrado desaparece de
      TODA consulta por el filtro de abajo; sus UNIQUE son índices parciales
      (`WHERE eliminado_en IS NULL`) para poder reutilizar el nombre.
    - Borrado definitivo = LÁPIDA (`purgado_en`): la fila se queda, sin su
      contenido (`vaciar_contenido`). Así todo lo que la nombra (reservas,
      auditoría, historial) sigue diciendo qué era y que se eliminó
      definitivamente, en vez de quedar apuntando a la nada. Ya no se puede
      restaurar ni aparece en la papelera.
    """

    eliminado_en: Mapped[datetime | None] = mapped_column()
    eliminado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    motivo_eliminacion: Mapped[str | None] = mapped_column(String(300))
    purgado_en: Mapped[datetime | None] = mapped_column()
    purgado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))

    @property
    def situacion(self) -> str:
        if self.purgado_en is not None:
            return "eliminado_definitivo"
        return "en_papelera" if self.eliminado_en is not None else "vigente"

    def vaciar_contenido(self) -> None:
        """Cada modelo borra aquí lo que no debe sobrevivir al borrado definitivo
        (datos personales, textos, fotos). Lo que queda es la lápida: id, nombre
        y a qué propiedad pertenecía."""
        raise NotImplementedError


INCLUIR_ELIMINADOS = "incluir_eliminados"


@event.listens_for(Session, "do_orm_execute")
def _sin_eliminados(estado: ORMExecuteState) -> None:
    """Filtro global (receta oficial de SQLAlchemy): toda SELECT del ORM sobre un
    modelo con borrado lógico lleva `eliminado_en IS NULL`, sin escribirlo en
    cada repositorio. Ver lo borrado se pide a propósito con
    `.execution_options(incluir_eliminados=True)` (solo papelera y restaurar)."""
    if (
        estado.is_select
        and not estado.is_column_load
        and not estado.is_relationship_load
        and not estado.execution_options.get(INCLUIR_ELIMINADOS, False)
    ):
        estado.statement = estado.statement.options(
            with_loader_criteria(
                ConBorradoLogico, lambda cls: cls.eliminado_en.is_(None), include_aliases=True
            )
        )

import ConfirmarRiesgo from './ConfirmarRiesgo'

/**
 * "¿Descartar cambios?": salir de un formulario con datos sin guardar. Es `ConfirmarRiesgo`
 * (riesgo medio) con sus textos por omisión; lo que se capturó no se recupera.
 * Para cualquier otra acción con consecuencias, usa `ConfirmarRiesgo` directamente.
 */
export default function ConfirmarDescarte({
  titulo = '¿Descartar cambios?', accion = 'Descartar y salir', cancelar = 'Seguir editando', texto, ...resto
}) {
  return (
    <ConfirmarRiesgo
      titulo={titulo} accion={accion} cancelar={cancelar} riesgo="medio"
      consecuencias={texto ? [] : ['Se pierde todo lo que capturaste en este formulario.']}
      texto={texto}
      {...resto}
    />
  )
}

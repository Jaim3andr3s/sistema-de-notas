import { createContext, useContext } from 'react'

// Las pantallas del estudiante también las usa el acudiente: cambia la ruta de la API
// y, en modo solo lectura, se ocultan las entregas y los descargos
export const VistaEstudiante = createContext({ base: '/estudiante', soloLectura: false, menu: [] })
export const useVistaEstudiante = () => useContext(VistaEstudiante)

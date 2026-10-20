// Piezas compartidas por las páginas del sitio

export function Titulo({ etiqueta, titulo, texto, claro }) {
  return (
    <div className={claro ? 's-titulo claro' : 's-titulo'}>
      <span className="s-etiqueta">{etiqueta}</span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
    </div>
  )
}

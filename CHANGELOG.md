# Cambios

Las fechas son las de los commits, no las de la etiqueta. La v1.0.0 se etiquetó el
2026-09-22, cuando me di cuenta de que el proyecto llevaba desde septiembre publicado
en Pages y sin ninguna versión marcada.

## 1.0.0 — 2026-09-08

Todo el trabajo inicial salió el mismo día, así que lo dejo agrupado en vez de inventarme
versiones intermedias.

- CV generado a partir de los repositorios públicos de GitHub, sin servidor ni build: se
  pide el usuario, se listan los repos (propios, no forks, no archivados, con push en los
  últimos dos años) y se describen con el primer párrafo útil del README.
- Habilidades a partir de los bytes por lenguaje que devuelve la API, agregados entre los
  repos seleccionados.
- Datos que GitHub no sabe: nombre, puesto, contacto, foto, resumen, experiencia con
  logros, formación, idiomas con nivel, certificaciones e intereses.
- Tres plantillas (clásica, moderna, lateral), color de acento, idioma es/en, guardar en
  PDF con la impresión del navegador, copiar en Markdown y exportar/importar JSON.
- Máximo de proyectos en el CV (5/10/15) y botón para limpiar todo sin perder el token.
- Seguridad: CSP por meta, sin referrer, token en sessionStorage salvo que se marque
  "recordar", y aviso antes de analizar si las peticiones no caben en la cuota restante.
- Panel de opciones a la derecha y el CV a todo el ancho, con zoom (botones y Ctrl+rueda).

### Lo que sé que falta

- Las habilidades solo distinguen lenguajes, no frameworks.
- Probado únicamente en Chrome.

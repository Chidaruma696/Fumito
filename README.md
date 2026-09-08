<div align="center">
  <br/>

# Fumito

**履歴 · Tu CV a partir de tus repositorios de GitHub. Nada sale de tu navegador.**

<br/>

[![Abrir Fumito](https://img.shields.io/badge/abrir-chidaruma696.github.io%2FFumito-8839ef?style=for-the-badge&logo=github&logoColor=white)](https://chidaruma696.github.io/Fumito/)
![Sin servidor](https://img.shields.io/badge/servidor-ninguno-1b150d?style=for-the-badge)
![Sin IA](https://img.shields.io/badge/IA-ninguna-1b150d?style=for-the-badge)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-1b150d?style=for-the-badge)

<br/>

*escribes tu usuario · eliges repos · contestas cinco cosas · sale el PDF*

</div>

---

> [!NOTE]
> Fumito es una sola página estática. Habla directamente con la API pública de GitHub desde tu navegador, guarda lo que escribes en tu `localStorage` y genera el PDF con el diálogo de impresión. No hay backend, no hay cuenta, no hay inteligencia artificial: solo reglas.

<br/>

## 📄 Qué es

Un currículum técnico se escribe mal por una razón: obliga a resumir de memoria proyectos que ya están explicados, con detalle, en sus repositorios. Fumito les da la vuelta:

| 🔍 Lee | 🧠 Deduce | ✍️ Pregunta |
| --- | --- | --- |
| Tus repos, lenguajes, temas, estrellas, licencias y fechas por la API de GitHub | Qué es cada proyecto, a partir del primer párrafo útil de su README | Lo que GitHub no sabe: nombre, puesto, correo, teléfono, ciudad, LinkedIn, web, foto |
| El README de cada repo que marques | Tu stack real, ponderando bytes de código de todos los repos elegidos | Experiencia con logros, formación, habilidades con nivel, idiomas, certificaciones, intereses |
| Tu perfil público y tu avatar para prellenar lo que pueda | Un borrador de resumen con tus lenguajes y temas, que editas o borras | Plantilla, color, idioma y qué secciones mostrar |

Descarta forks, archivados y repos sin actividad en dos años por defecto; tú decides al final qué entra.

<br/>

## 🧪 Cómo se usa

1. Abre [chidaruma696.github.io/Fumito](https://chidaruma696.github.io/Fumito/) y escribe tu usuario de GitHub.
2. Marca los repos que cuentan. Cada uno cuesta dos peticiones a la API; sin token GitHub da 60 por hora, de sobra para un CV.
3. Pulsa **Analizar**: Fumito trae lenguajes y README de cada repo y monta el CV a la derecha.
4. Corrige las descripciones de los proyectos, añade logros y ordénalos. Rellena datos de contacto, foto (tu avatar de GitHub o una imagen tuya), resumen, experiencia con logros clave, formación, habilidades con nivel, idiomas, certificaciones e información adicional.
5. Elige plantilla (clásica de una columna, moderna con banda y lateral, o lateral con barra oscura), color, idioma (español o inglés) y **Guardar PDF**. También puedes copiar el CV en Markdown o descargar tus datos en JSON para retomarlos en otro navegador.

### Token opcional

Si tienes muchos repos o quieres incluir privados, pega un [token de solo lectura](https://github.com/settings/tokens?type=beta) en el desplegable del paso 1. Sube el límite a 5000 peticiones por hora y lista también tus repos privados. Se guarda solo en tu navegador y se borra con "Olvidar".

<br/>

## 🔧 Cómo funciona

```
Fumito/
├── index.html   la página, cuatro pasos y la hoja A4
├── app.js       API de GitHub, extracción de descripciones, modelo del CV, plantillas y exportación
├── styles.css   interfaz de la app (Catppuccin Latte de día, Mocha de noche)
└── cv.css       las tres plantillas del CV, con un color de acento a tu elección
```

- **Descripción de cada proyecto**: se limpia el README (badges, imágenes, código, HTML, enlaces, énfasis) y se toma el primer párrafo de más de 60 caracteres que sea texto de verdad, recortado a dos frases. Si no hay README, la descripción del repo.
- **Habilidades**: suma de bytes por lenguaje en los repos elegidos, en porcentaje y como barra relativa al lenguaje principal; se muestran las que pasan del 2 %, más las que añadas a mano con su nivel.
- **Periodo**: año de creación hasta el último *push*; "actual" si hubo actividad en los últimos seis meses.
- **Stack por proyecto**: los tres lenguajes principales más hasta tres temas del repo que no repitan un lenguaje.
- **Resumen automático**: una plantilla con tus lenguajes principales, temas frecuentes y estrellas. Se regenera si lo dejas tal cual y cambias de idioma; si lo editas, se respeta.

Sin dependencias, sin *build*, sin empaquetador: se sirve tal cual desde GitHub Pages.

<br/>

## 🔬 Desarrollo

```bash
git clone https://github.com/Chidaruma696/Fumito.git
cd Fumito
python -m http.server 8080     # cualquier servidor estático vale
```

Abre `http://localhost:8080`. Al usar `file://` el navegador bloquea las peticiones a la API, por eso el servidor.

<br/>

## ⚖️ Licencia

[MIT](LICENSE).

<br/>

<div align="center">

*Tus repos ya lo dicen todo.*

履歴 · りれき

</div>

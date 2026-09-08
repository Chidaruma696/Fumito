/* Fumito · CV a partir de repositorios de GitHub. Sin servidor, sin IA: reglas y la API pública. */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------------ estado
  var DATOS_VACIOS = {
    nombre: '', titulo: '', correo: '', telefono: '', ciudad: '', linkedin: '', web: '',
    fotoFuente: 'ninguna', fotoDatos: '',
    resumen: '', resumenAuto: '',
    experiencia: [], educacion: [], habilidades: [], idiomas: [], certificaciones: [],
    intereses: '', adicional: '',
    proyectos: {},                     // full_name -> { descripcion, logros, orden, oculto }
    plantilla: 'clasica', idioma: 'es', acento: '#1f3b63',
    verProyectos: true, verBarras: true, verPie: true, maxProyectos: 10
  };
  var estado = { usuario: '', perfil: null, repos: [], seleccion: {}, detalles: {}, datos: Object.assign({}, DATOS_VACIOS) };
  try { var g = JSON.parse(localStorage.getItem('fumito:datos') || 'null'); if (g) estado.datos = Object.assign({}, DATOS_VACIOS, g); } catch (e) {}
  try { $('token').value = localStorage.getItem('fumito:token') || ''; } catch (e) {}
  try { $('usuario').value = localStorage.getItem('fumito:usuario') || ''; } catch (e) {}

  function guardar() { try { localStorage.setItem('fumito:datos', JSON.stringify(estado.datos)); } catch (e) {} }

  // ------------------------------------------------------------------ textos
  var L = {
    es: { proyectos: 'Proyectos', habilidades: 'Habilidades', experiencia: 'Experiencia', formacion: 'Formación', resumen: 'Perfil', contacto: 'Contacto', idiomas: 'Idiomas', certificaciones: 'Certificaciones', intereses: 'Intereses', adicional: 'Información adicional', logros: 'Logros clave', actual: 'actual', pie: 'Generado con Fumito a partir de github.com/', niveles: ['Básico', 'Elemental', 'Intermedio', 'Avanzado', 'Nativo'] },
    en: { proyectos: 'Projects', habilidades: 'Skills', experiencia: 'Experience', formacion: 'Education', resumen: 'Summary', contacto: 'Contact', idiomas: 'Languages', certificaciones: 'Certifications', intereses: 'Interests', adicional: 'Additional information', logros: 'Key achievements', actual: 'present', pie: 'Generated with Fumito from github.com/', niveles: ['Basic', 'Elementary', 'Intermediate', 'Advanced', 'Native'] }
  };

  // ------------------------------------------------------------------ API
  var restantes = null;
  function api(ruta) {
    var cab = { Accept: 'application/vnd.github+json' };
    var token = $('token').value.trim();
    if (token) cab.Authorization = 'Bearer ' + token;
    return fetch(API + ruta, { headers: cab }).then(function (r) {
      var rem = r.headers.get('x-ratelimit-remaining');
      if (rem != null) { restantes = parseInt(rem, 10); pintarPresupuesto(); }
      if (r.status === 403 || r.status === 429) {
        var reset = r.headers.get('x-ratelimit-reset');
        var cuando = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'un rato';
        throw new Error('GitHub cortó las peticiones hasta las ' + cuando + '. Pon un token para seguir.');
      }
      if (r.status === 404) throw new Error('No existe: ' + ruta);
      if (!r.ok) throw new Error('GitHub respondió ' + r.status);
      return r;
    });
  }
  function json(ruta) { return api(ruta).then(function (r) { return r.json(); }); }

  function pintarPresupuesto() {
    var n = Object.keys(estado.seleccion).filter(function (k) { return estado.seleccion[k]; }).length;
    var txt = n + ' seleccionados · ' + (n * 2) + ' peticiones';
    if (restantes != null) txt += ' · te quedan ' + restantes;
    $('presupuesto').textContent = txt;
    $('btnAnalizar').disabled = n === 0;
  }

  // ------------------------------------------------------------------ paso 1: usuario y repos
  $('btnCargar').addEventListener('click', cargarUsuario);
  $('usuario').addEventListener('keydown', function (e) { if (e.key === 'Enter') cargarUsuario(); });
  $('btnOlvidarToken').addEventListener('click', function () { $('token').value = ''; try { localStorage.removeItem('fumito:token'); } catch (e) {} });
  $('token').addEventListener('change', function () { try { localStorage.setItem('fumito:token', $('token').value.trim()); } catch (e) {} });

  function cargarUsuario() {
    var u = $('usuario').value.trim().replace(/^@/, '');
    if (!u) return;
    try { localStorage.setItem('fumito:usuario', u); } catch (e) {}
    estado.usuario = u; estado.repos = []; estado.seleccion = {}; estado.detalles = {};
    aviso('Cargando perfil…');
    var token = $('token').value.trim();
    var rutaRepos = '/users/' + encodeURIComponent(u) + '/repos?per_page=100&sort=pushed';
    json('/users/' + encodeURIComponent(u)).then(function (p) {
      estado.perfil = p;
      if (!token) return paginar(rutaRepos);
      return json('/user').then(function (yo) {
        if (yo.login.toLowerCase() === u.toLowerCase()) rutaRepos = '/user/repos?per_page=100&sort=pushed&affiliation=owner';
        return paginar(rutaRepos);
      });
    }).then(function (repos) {
      estado.repos = repos.filter(function (r) { return r.owner.login.toLowerCase() === u.toLowerCase(); });
      prellenarDatos();
      pintarRepos();
      $('paso2').hidden = false;
      aviso(estado.repos.length + ' repositorios de ' + (estado.perfil.name || u));
    }).catch(function (e) { aviso(e.message, true); });
  }

  function paginar(ruta, acum, pagina) {
    acum = acum || []; pagina = pagina || 1;
    if (pagina > 5) return Promise.resolve(acum);
    return json(ruta + '&page=' + pagina).then(function (lista) {
      acum = acum.concat(lista);
      return lista.length === 100 ? paginar(ruta, acum, pagina + 1) : acum;
    });
  }

  function aviso(txt, esError) { var e = $('estadoApi'); e.textContent = txt; e.className = 'sub' + (esError ? ' error' : ''); }

  function prellenarDatos() {
    var p = estado.perfil, d = estado.datos;
    if (!d.nombre) d.nombre = p.name || p.login;
    if (!d.correo && p.email) d.correo = p.email;
    if (!d.ciudad && p.location) d.ciudad = p.location;
    if (!d.web && p.blog) d.web = p.blog;
    if (!d.titulo && p.bio) d.titulo = p.bio;
    pintarDatos();
  }

  function esCandidato(r) {
    var reciente = (Date.now() - new Date(r.pushed_at).getTime()) < 1000 * 60 * 60 * 24 * 365 * 2;
    var esPerfil = r.name.toLowerCase() === estado.usuario.toLowerCase();
    return !r.fork && !r.archived && reciente && !esPerfil;
  }

  function pintarRepos() {
    var ul = $('listaRepos'); ul.innerHTML = '';
    var candidatos = estado.repos.filter(esCandidato);
    estado.repos.forEach(function (r) {
      if (estado.seleccion[r.full_name] == null) estado.seleccion[r.full_name] = candidatos.indexOf(r) > -1 && candidatos.indexOf(r) < estado.datos.maxProyectos;
      var li = document.createElement('li');
      li.dataset.fork = r.fork ? '1' : ''; li.dataset.archivado = r.archived ? '1' : ''; li.dataset.nombre = r.full_name;
      li.innerHTML = '<input type="checkbox" ' + (estado.seleccion[r.full_name] ? 'checked' : '') + '>'
        + '<div><span class="nombre">' + esc(r.name) + '</span>'
        + (r.private ? '<span class="etq">privado</span>' : '') + (r.fork ? '<span class="etq">fork</span>' : '') + (r.archived ? '<span class="etq">archivado</span>' : '')
        + '<span class="desc">' + esc(r.description || '') + '</span></div>'
        + '<span class="meta">' + esc(r.language || '') + (r.stargazers_count ? ' · ★' + r.stargazers_count : '') + '</span>';
      li.querySelector('input').addEventListener('change', function (ev) { estado.seleccion[r.full_name] = ev.target.checked; pintarPresupuesto(); pintarProyectos(); render(); });
      ul.appendChild(li);
    });
    filtrarRepos(); pintarPresupuesto();
  }
  function filtrarRepos() {
    var forks = $('verForks').checked, arch = $('verArchivados').checked;
    document.querySelectorAll('#listaRepos li').forEach(function (li) {
      li.classList.toggle('oculto', (li.dataset.fork && !forks) || (li.dataset.archivado && !arch));
    });
  }
  $('verForks').addEventListener('change', filtrarRepos);
  $('verArchivados').addEventListener('change', filtrarRepos);
  $('btnNinguno').addEventListener('click', function () { marcarTodos(false); });
  $('btnTodos').addEventListener('click', function () { marcarTodos(true); });
  function marcarTodos(v) {
    document.querySelectorAll('#listaRepos li:not(.oculto)').forEach(function (li) {
      estado.seleccion[li.dataset.nombre] = v; li.querySelector('input').checked = v;
    });
    pintarPresupuesto(); pintarProyectos(); render();
  }

  // ------------------------------------------------------------------ paso 2: analizar
  $('btnAnalizar').addEventListener('click', function () {
    var elegidos = estado.repos.filter(function (r) { return estado.seleccion[r.full_name]; });
    var btn = $('btnAnalizar'); btn.disabled = true; btn.textContent = 'Analizando…';
    var cola = elegidos.slice();
    function siguiente() {
      var r = cola.shift();
      if (!r) return Promise.resolve();
      if (estado.detalles[r.full_name]) return siguiente();
      return Promise.all([
        json('/repos/' + r.full_name + '/languages').catch(function () { return {}; }),
        api('/repos/' + r.full_name + '/readme').then(function (x) { return x.json(); }).then(function (x) { return decodificar(x.content); }).catch(function () { return ''; })
      ]).then(function (res) {
        estado.detalles[r.full_name] = { lenguajes: res[0], readme: res[1], descripcion: describir(res[1], r) };
        return siguiente();
      });
    }
    siguiente().then(function () {
      btn.disabled = false; btn.textContent = 'Analizar seleccionados';
      if (!estado.datos.resumen || estado.datos.resumen === estado.datos.resumenAuto) {
        estado.datos.resumenAuto = estado.datos.resumen = redactarResumen();
        $('resumen').value = estado.datos.resumen;
      }
      $('edicionProyectos').hidden = false; $('paso3').hidden = false; $('paso4').hidden = false;
      pintarProyectos(); guardar(); render();
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Analizar seleccionados'; aviso(e.message, true); });
  });

  function decodificar(b64) {
    try { return decodeURIComponent(Array.prototype.map.call(atob(b64.replace(/\n/g, '')), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }
    catch (e) { return ''; }
  }

  /** Saca del README el primer párrafo que de verdad explica el proyecto. */
  function describir(readme, repo) {
    var texto = (readme || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/^\s*\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*$/gm, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s*>\s?\[!\w+\]\s*$/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/[*_`~]/g, '');
    var parrafos = texto.split(/\n\s*\n/).map(function (p) { return p.replace(/\s+/g, ' ').trim(); });
    var util = parrafos.filter(function (p) {
      return p.length >= 60 && !/^#/.test(p) && !/^[-|=]+$/.test(p) && !/^(\||\+)/.test(p) && (p.match(/[a-záéíóúñ]/gi) || []).length > p.length * 0.6;
    })[0];
    if (!util && repo.description) util = repo.description;
    if (!util) util = '';
    var frases = util.match(/[^.!?]+[.!?]+(\s|$)/g) || [util];
    var salida = ''; for (var i = 0; i < frases.length && salida.length < 260; i++) salida += frases[i];
    return salida.trim() || util.slice(0, 260);
  }

  function lenguajesTotales() {
    var suma = {};
    Object.keys(estado.detalles).forEach(function (k) {
      if (!estado.seleccion[k]) return;
      var l = estado.detalles[k].lenguajes || {};
      Object.keys(l).forEach(function (n) { suma[n] = (suma[n] || 0) + l[n]; });
    });
    var total = Object.keys(suma).reduce(function (s, n) { return s + suma[n]; }, 0) || 1;
    var max = Object.keys(suma).reduce(function (m, n) { return Math.max(m, suma[n]); }, 0) || 1;
    return Object.keys(suma).map(function (n) { return { nombre: n, bytes: suma[n], pct: Math.round(suma[n] * 100 / total), nivel: Math.max(20, Math.round(suma[n] * 100 / max)) }; })
      .sort(function (a, b) { return b.bytes - a.bytes; });
  }

  function redactarResumen() {
    var idioma = estado.datos.idioma;
    var langs = lenguajesTotales().filter(function (l) { return l.pct >= 3; }).slice(0, 4).map(function (l) { return l.nombre; });
    var langsMin = langs.map(function (l) { return l.toLowerCase(); });
    var seleccionados = estado.repos.filter(function (r) { return estado.seleccion[r.full_name] && estado.detalles[r.full_name]; });
    var n = seleccionados.length, temas = {};
    seleccionados.forEach(function (r) { (r.topics || []).forEach(function (t) { if (langsMin.indexOf(t) === -1) temas[t] = (temas[t] || 0) + 1; }); });
    var top = Object.keys(temas).sort(function (a, b) { return temas[b] - temas[a]; }).slice(0, 4);
    var estrellas = seleccionados.reduce(function (s, r) { return s + r.stargazers_count; }, 0);
    var lista = function (arr, y) { return arr.length > 1 ? arr.slice(0, -1).join(', ') + ' ' + y + ' ' + arr[arr.length - 1] : arr[0] || ''; };
    if (idioma === 'en') {
      return 'Developer with ' + n + ' public project' + (n === 1 ? '' : 's') + ' on GitHub, mainly in ' + lista(langs, 'and') + '.'
        + (top.length ? ' Focus on ' + lista(top, 'and') + '.' : '') + (estrellas ? ' ' + estrellas + ' stars across published repositories.' : '')
        + ' I document what I build so others can use it.';
    }
    return 'Desarrollador con ' + n + ' proyecto' + (n === 1 ? '' : 's') + ' público' + (n === 1 ? '' : 's') + ' en GitHub, principalmente en ' + lista(langs, 'y') + '.'
      + (top.length ? ' Enfoque en ' + lista(top, 'y') + '.' : '') + (estrellas ? ' ' + estrellas + ' estrellas entre los repositorios publicados.' : '')
      + ' Documento lo que construyo para que otros puedan usarlo.';
  }

  // ------------------------------------------------------------------ proyectos editables
  function ajusteProyecto(fullName) {
    var p = estado.datos.proyectos;
    if (!p[fullName]) p[fullName] = { descripcion: '', logros: '', orden: Object.keys(p).length, oculto: false };
    return p[fullName];
  }
  function proyectosOrdenados() {
    return estado.repos.filter(function (r) { return estado.seleccion[r.full_name] && estado.detalles[r.full_name]; })
      .sort(function (a, b) { return ajusteProyecto(a.full_name).orden - ajusteProyecto(b.full_name).orden || (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)); });
  }
  function pintarProyectos() {
    var cont = $('proyectos'); cont.innerHTML = '';
    var lista = proyectosOrdenados();
    lista.forEach(function (r, i) {
      var a = ajusteProyecto(r.full_name); a.orden = i;
      var d = estado.detalles[r.full_name];
      var div = document.createElement('div'); div.className = 'bloque' + (i >= estado.datos.maxProyectos ? ' fuera' : '');
      div.innerHTML = '<div class="cabeza">' + (i + 1) + '. ' + esc(r.name) + (i >= estado.datos.maxProyectos ? '<span class="etq">fuera del CV</span>' : '') + '</div>'
        + '<label class="ancho">Descripción<textarea data-k="descripcion" rows="2"></textarea></label>'
        + '<label class="ancho">Logros (uno por línea)<textarea data-k="logros" rows="2"></textarea></label>'
        + '<div class="acciones"><button class="chico" data-a="arriba">▲</button><button class="chico" data-a="abajo">▼</button></div>';
      var ta = div.querySelector('[data-k="descripcion"]'); ta.value = a.descripcion || d.descripcion; ta.placeholder = d.descripcion;
      ta.addEventListener('input', function () { a.descripcion = ta.value === d.descripcion ? '' : ta.value; guardar(); render(); });
      var lg = div.querySelector('[data-k="logros"]'); lg.value = a.logros;
      lg.addEventListener('input', function () { a.logros = lg.value; guardar(); render(); });
      div.querySelector('[data-a="arriba"]').addEventListener('click', function () { mover(i, -1); });
      div.querySelector('[data-a="abajo"]').addEventListener('click', function () { mover(i, 1); });
      cont.appendChild(div);
    });
    function mover(i, d) {
      var j = i + d; if (j < 0 || j >= lista.length) return;
      ajusteProyecto(lista[i].full_name).orden = j; ajusteProyecto(lista[j].full_name).orden = i;
      guardar(); pintarProyectos(); render();
    }
  }

  // ------------------------------------------------------------------ paso 3: datos
  var CAMPOS = ['nombre', 'titulo', 'correo', 'telefono', 'ciudad', 'linkedin', 'web', 'resumen', 'intereses', 'adicional'];
  CAMPOS.forEach(function (k) { $(k).addEventListener('input', function () { estado.datos[k] = $(k).value; guardar(); render(); }); });

  function pintarDatos() {
    var d = estado.datos;
    CAMPOS.forEach(function (k) { $(k).value = d[k] || ''; });
    $('plantilla').value = d.plantilla; $('idioma').value = d.idioma; $('acento').value = d.acento;
    $('verProyectos').checked = d.verProyectos; $('verBarras').checked = d.verBarras; $('verPie').checked = d.verPie;
    $('maxProyectos').value = String(d.maxProyectos);
    $('fotoFuente').value = d.fotoFuente; pintarFoto();
    ['experiencia', 'educacion', 'habilidades', 'idiomas', 'certificaciones'].forEach(pintarBloques);
  }

  // foto
  $('fotoFuente').addEventListener('change', function () { estado.datos.fotoFuente = $('fotoFuente').value; guardar(); pintarFoto(); render(); });
  $('btnFoto').addEventListener('click', function () { $('fotoArchivo').click(); });
  $('fotoArchivo').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    var img = new Image();
    img.onload = function () {
      var lado = 480, c = document.createElement('canvas'); c.width = lado; c.height = lado;
      var s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, lado, lado);
      estado.datos.fotoDatos = c.toDataURL('image/jpeg', 0.85); guardar(); pintarFoto(); render();
    };
    img.src = URL.createObjectURL(f);
  });
  function urlFoto() {
    var d = estado.datos;
    if (d.fotoFuente === 'github' && estado.perfil) return estado.perfil.avatar_url;
    if (d.fotoFuente === 'archivo' && d.fotoDatos) return d.fotoDatos;
    return '';
  }
  function pintarFoto() {
    var u = urlFoto();
    $('btnFoto').hidden = estado.datos.fotoFuente !== 'archivo';
    $('fotoVista').hidden = !u; if (u) $('fotoVista').src = u;
  }

  // bloques repetibles
  var BLOQUES = {
    experiencia: { nuevo: function () { return { donde: '', que: '', cuando: '', detalle: '', logros: '' }; },
      campos: [['que', 'Puesto'], ['donde', 'Empresa o cliente'], ['cuando', 'Periodo', 'ancho', '2023-01 – actual'], ['detalle', 'Qué hiciste (una línea por punto)', 'ancho', 'area'], ['logros', 'Logros clave (uno por línea)', 'ancho', 'area']] },
    educacion: { nuevo: function () { return { donde: '', que: '', cuando: '', detalle: '' }; },
      campos: [['que', 'Título'], ['donde', 'Centro'], ['cuando', 'Periodo', 'ancho', '2019-09 – 2023-06'], ['detalle', 'Notas (una por línea)', 'ancho', 'area']] },
    habilidades: { nuevo: function () { return { nombre: '', nivel: 4 }; },
      campos: [['nombre', 'Habilidad', 'ancho'], ['nivel', 'Nivel', 'ancho', 'nivel']] },
    idiomas: { nuevo: function () { return { nombre: '', nivel: 3, etiqueta: '' }; },
      campos: [['nombre', 'Idioma'], ['etiqueta', 'Certificado o nivel', '', 'B2 · C1 · nativo'], ['nivel', 'Nivel', 'ancho', 'nivel']] },
    certificaciones: { nuevo: function () { return { nombre: '', emisor: '', cuando: '' }; },
      campos: [['nombre', 'Certificación', 'ancho'], ['emisor', 'Emisor'], ['cuando', 'Año']] }
  };
  $('btnMasExp').addEventListener('click', function (e) { e.preventDefault(); anadir('experiencia'); });
  $('btnMasEdu').addEventListener('click', function (e) { e.preventDefault(); anadir('educacion'); });
  $('btnMasHab').addEventListener('click', function (e) { e.preventDefault(); anadir('habilidades'); });
  $('btnMasIdi').addEventListener('click', function (e) { e.preventDefault(); anadir('idiomas'); });
  $('btnMasCer').addEventListener('click', function (e) { e.preventDefault(); anadir('certificaciones'); });
  function anadir(tipo) { estado.datos[tipo].push(BLOQUES[tipo].nuevo()); pintarBloques(tipo); guardar(); render(); }

  function pintarBloques(tipo) {
    var cont = $(tipo); cont.innerHTML = '';
    estado.datos[tipo].forEach(function (b, i) {
      var div = document.createElement('div'); div.className = 'bloque';
      div.innerHTML = BLOQUES[tipo].campos.map(function (c) {
        var k = c[0], et = c[1], cls = c[2] || '', extra = c[3] || '';
        var control;
        if (extra === 'area') control = '<textarea data-k="' + k + '" rows="2"></textarea>';
        else if (extra === 'nivel') control = '<div class="nivel"><input type="range" min="1" max="5" data-k="' + k + '"><output></output></div>';
        else control = '<input data-k="' + k + '" placeholder="' + esc(extra) + '">';
        return '<label class="' + cls + '">' + et + control + '</label>';
      }).join('') + '<div class="acciones"><button class="chico" data-a="arriba">▲</button><button class="chico" data-a="abajo">▼</button><button class="chico" data-a="quitar">quitar</button></div>';
      div.querySelectorAll('[data-k]').forEach(function (inp) {
        inp.value = b[inp.dataset.k] == null ? '' : b[inp.dataset.k];
        var out = inp.parentElement.querySelector('output');
        if (out) out.textContent = inp.value + '/5';
        inp.addEventListener('input', function () {
          b[inp.dataset.k] = inp.type === 'range' ? parseInt(inp.value, 10) : inp.value;
          if (out) out.textContent = inp.value + '/5';
          guardar(); render();
        });
      });
      div.querySelector('[data-a="quitar"]').addEventListener('click', function (e) { e.preventDefault(); estado.datos[tipo].splice(i, 1); pintarBloques(tipo); guardar(); render(); });
      div.querySelector('[data-a="arriba"]').addEventListener('click', function (e) { e.preventDefault(); if (i > 0) { var l = estado.datos[tipo]; l.splice(i - 1, 0, l.splice(i, 1)[0]); pintarBloques(tipo); guardar(); render(); } });
      div.querySelector('[data-a="abajo"]').addEventListener('click', function (e) { e.preventDefault(); var l = estado.datos[tipo]; if (i < l.length - 1) { l.splice(i + 1, 0, l.splice(i, 1)[0]); pintarBloques(tipo); guardar(); render(); } });
      cont.appendChild(div);
    });
  }

  // ------------------------------------------------------------------ paso 4: plantilla, exportar
  $('maxProyectos').addEventListener('change', function () { estado.datos.maxProyectos = parseInt($('maxProyectos').value, 10); guardar(); pintarProyectos(); render(); });
  $('btnLimpiar').addEventListener('click', function () {
    if (!confirm('Se borran los datos que escribiste, la selección de repos y el CV. El token se conserva. ¿Seguir?')) return;
    estado.datos = Object.assign({}, DATOS_VACIOS); estado.seleccion = {}; estado.detalles = {}; estado.repos = []; estado.perfil = null;
    try { localStorage.removeItem('fumito:datos'); } catch (e) {}
    pintarDatos(); $('listaRepos').innerHTML = ''; $('proyectos').innerHTML = '';
    $('paso2').hidden = true; $('paso3').hidden = true; $('paso4').hidden = true; $('edicionProyectos').hidden = true;
    $('hoja').innerHTML = '<div class="vacio">Carga un usuario para ver el CV aquí.</div>'; aviso('');
  });
  $('plantilla').addEventListener('change', function () { estado.datos.plantilla = $('plantilla').value; guardar(); render(); });
  $('acento').addEventListener('input', function () { estado.datos.acento = $('acento').value; guardar(); render(); });
  ['verProyectos', 'verBarras', 'verPie'].forEach(function (k) { $(k).addEventListener('change', function () { estado.datos[k] = $(k).checked; guardar(); render(); }); });
  $('idioma').addEventListener('change', function () {
    estado.datos.idioma = $('idioma').value;
    if (estado.datos.resumen === estado.datos.resumenAuto) { estado.datos.resumenAuto = estado.datos.resumen = redactarResumen(); $('resumen').value = estado.datos.resumen; }
    guardar(); render();
  });
  $('btnPdf').addEventListener('click', function () { window.print(); });
  $('btnMd').addEventListener('click', function () {
    navigator.clipboard.writeText(markdown(modelo())).then(function () { $('btnMd').textContent = 'Copiado'; setTimeout(function () { $('btnMd').textContent = 'Copiar Markdown'; }, 1500); });
  });
  $('btnJson').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ datos: estado.datos, usuario: estado.usuario, seleccion: estado.seleccion }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fumito-' + (estado.usuario || 'cv') + '.json'; a.click();
  });
  $('archivoJson').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t);
      if (j.datos) estado.datos = Object.assign({}, DATOS_VACIOS, j.datos);
      if (j.seleccion) estado.seleccion = j.seleccion;
      if (j.usuario) $('usuario').value = j.usuario;
      guardar(); pintarDatos(); render();
    }).catch(function () { aviso('Ese archivo no es de Fumito', true); });
  });

  // ------------------------------------------------------------------ modelo
  function periodo(r, t) {
    var desde = new Date(r.created_at).getFullYear(), hasta = new Date(r.pushed_at);
    var vivo = (Date.now() - hasta.getTime()) < 1000 * 60 * 60 * 24 * 180;
    var fin = vivo ? t.actual : hasta.getFullYear();
    return desde === fin ? String(desde) : desde + ' – ' + fin;
  }
  function lineas(txt) { return String(txt || '').split(/\n/).map(function (l) { return l.replace(/^\s*[-•*]\s*/, '').trim(); }).filter(Boolean); }

  function modelo() {
    var t = L[estado.datos.idioma], d = estado.datos;
    var proyectos = proyectosOrdenados().slice(0, estado.datos.maxProyectos).map(function (r) {
      var det = estado.detalles[r.full_name], a = ajusteProyecto(r.full_name);
      var langs = Object.keys(det.lenguajes || {}).sort(function (x, y) { return det.lenguajes[y] - det.lenguajes[x]; }).slice(0, 3);
      var langsMin = langs.map(function (l) { return l.toLowerCase(); });
      var stack = langs.concat((r.topics || []).filter(function (x) { return langsMin.indexOf(x) === -1; }).slice(0, 3));
      return { nombre: r.name, url: r.html_url, descripcion: a.descripcion || det.descripcion, logros: lineas(a.logros), stack: stack, estrellas: r.stargazers_count, periodo: periodo(r, t), licencia: r.license && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '' };
    });
    var lenguajes = lenguajesTotales().filter(function (l) { return l.pct >= 2; }).slice(0, 8);
    var habilidades = lenguajes.map(function (l) { return { nombre: l.nombre, nivel: l.nivel, detalle: l.pct + '%' }; })
      .concat(d.habilidades.filter(function (h) { return h.nombre; }).map(function (h) { return { nombre: h.nombre, nivel: h.nivel * 20, detalle: '' }; }));
    return { t: t, datos: d, usuario: estado.usuario, foto: urlFoto(), proyectos: d.verProyectos ? proyectos : [], habilidades: habilidades,
      experiencia: d.experiencia.filter(function (b) { return b.donde || b.que; }),
      educacion: d.educacion.filter(function (b) { return b.donde || b.que; }),
      idiomas: d.idiomas.filter(function (b) { return b.nombre; }),
      certificaciones: d.certificaciones.filter(function (b) { return b.nombre; }),
      adicional: lineas(d.adicional) };
  }

  // ------------------------------------------------------------------ render
  var ICO = {
    correo: '<svg viewBox="0 0 24 24"><path d="M2 5h20v14H2zm2 2v.5l8 5 8-5V7l-8 5z"/></svg>',
    telefono: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.25 1z"/></svg>',
    ciudad: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.5 9h3v12h-3zM9 9h2.9v1.7c.4-.8 1.5-1.9 3.4-1.9 3.6 0 4.2 2.4 4.2 5.4V21h-3v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9z"/></svg>',
    web: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15.7 15.7 0 0 0-1.3-5.6A8 8 0 0 1 18.9 11zM12 4c.9 1.2 1.8 3.5 2 7h-4c.2-3.5 1.1-5.8 2-7zM5.1 13h3c.1 2.2.6 4.1 1.3 5.6A8 8 0 0 1 5.1 13zm3-2h-3a8 8 0 0 1 4.3-5.6A15.7 15.7 0 0 0 8.1 11zM12 20c-.9-1.2-1.8-3.5-2-7h4c-.2 3.5-1.1 5.8-2 7zm2.6-1.4c.7-1.5 1.2-3.4 1.3-5.6h3a8 8 0 0 1-4.3 5.6z"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.8-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>'
  };

  function contactoHtml(m, conEtiquetas) {
    var d = m.datos;
    var items = [
      ['correo', d.correo, 'Email'], ['telefono', d.telefono, 'Teléfono'], ['ciudad', d.ciudad, 'Ciudad'],
      ['linkedin', d.linkedin ? d.linkedin.replace(/^https?:\/\/(www\.)?/, '') : '', 'LinkedIn'],
      ['web', d.web ? d.web.replace(/^https?:\/\//, '') : '', 'Web'], ['github', 'github.com/' + m.usuario, 'GitHub']
    ].filter(function (x) { return x[1]; });
    return '<div class="contacto">' + items.map(function (x) {
      return '<div class="dato">' + ICO[x[0]] + '<span>' + (conEtiquetas ? '<b>' + x[2] + '</b>' : '') + esc(x[1]) + '</span></div>';
    }).join('') + '</div>';
  }
  function estrellas(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= n ? 'on' : 'off') + '">★</span>'; return '<span class="estrellas">' + s + '</span>'; }
  function seccionResumen(m) { return m.datos.resumen ? '<h2>' + m.t.resumen + '</h2><p>' + esc(m.datos.resumen) + '</p>' : ''; }
  function seccionExperiencia(m) {
    if (!m.experiencia.length) return '';
    return '<h2>' + m.t.experiencia + '</h2>' + m.experiencia.map(function (b) {
      var puntos = lineas(b.detalle), logros = lineas(b.logros);
      return '<div class="exp"><div class="cuando">' + esc(b.cuando) + '</div><div><div class="cab"><span class="puesto">' + esc(b.que) + '</span></div><div class="donde">' + esc(b.donde) + '</div>'
        + (puntos.length ? '<ul>' + puntos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '')
        + (logros.length ? '<div class="logros"><b>' + m.t.logros + '</b><ul>' + logros.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '') + '</div></div>';
    }).join('');
  }
  function seccionEducacion(m) {
    if (!m.educacion.length) return '';
    return '<h2>' + m.t.formacion + '</h2>' + m.educacion.map(function (b) {
      var puntos = lineas(b.detalle);
      return '<div class="exp"><div class="cuando">' + esc(b.cuando) + '</div><div><div class="cab"><span class="puesto">' + esc(b.que) + '</span></div><div class="donde">' + esc(b.donde) + '</div>'
        + (puntos.length ? '<ul>' + puntos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
    }).join('');
  }
  function seccionProyectos(m) {
    if (!m.proyectos.length) return '';
    return '<h2>' + m.t.proyectos + '</h2>' + m.proyectos.map(function (p) {
      return '<div class="proyecto"><div class="cab"><span class="nombre">' + esc(p.nombre) + '</span><span class="periodo">' + esc(p.periodo) + '</span></div>'
        + (p.descripcion ? '<p>' + esc(p.descripcion) + '</p>' : '')
        + (p.logros.length ? '<ul>' + p.logros.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '')
        + '<div class="stack">' + esc(p.stack.join(' · ')) + (p.estrellas ? ' · ★ ' + p.estrellas : '') + (p.licencia ? ' · ' + esc(p.licencia) : '') + '</div>'
        + '<div class="url">' + esc(p.url.replace(/^https?:\/\//, '')) + '</div></div>';
    }).join('');
  }
  function seccionHabilidades(m) {
    if (!m.habilidades.length) return '';
    var cuerpo = m.datos.verBarras
      ? '<div class="barras">' + m.habilidades.map(function (h) { return '<div class="barra"><div class="nom"><span>' + esc(h.nombre) + '</span><span>' + esc(h.detalle) + '</span></div><div class="pista"><i style="width:' + h.nivel + '%"></i></div></div>'; }).join('') + '</div>'
      : '<div class="chips">' + m.habilidades.map(function (h) { return '<span>' + esc(h.nombre) + '</span>'; }).join('') + '</div>';
    return '<h2>' + m.t.habilidades + '</h2>' + cuerpo;
  }
  function seccionIdiomas(m) {
    if (!m.idiomas.length) return '';
    return '<h2>' + m.t.idiomas + '</h2>' + m.idiomas.map(function (i) {
      var et = i.etiqueta || m.t.niveles[Math.max(0, Math.min(4, i.nivel - 1))];
      return '<div class="idioma"><span>' + esc(i.nombre) + (et ? ' <span style="opacity:.7">· ' + esc(et) + '</span>' : '') + '</span>' + estrellas(i.nivel) + '</div>';
    }).join('');
  }
  function seccionCertificaciones(m) {
    if (!m.certificaciones.length) return '';
    return '<h2>' + m.t.certificaciones + '</h2>' + m.certificaciones.map(function (c) {
      return '<div class="cert"><b>' + esc(c.nombre) + '</b>' + (c.emisor || c.cuando ? '<br><span>' + esc([c.emisor, c.cuando].filter(Boolean).join(' · ')) + '</span>' : '') + '</div>';
    }).join('');
  }
  function seccionExtra(m) {
    var s = '';
    if (m.datos.intereses) s += '<h2>' + m.t.intereses + '</h2><p>' + esc(m.datos.intereses) + '</p>';
    if (m.adicional.length) s += '<h2>' + m.t.adicional + '</h2><ul>' + m.adicional.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
    return s;
  }
  function pie(m) { return m.datos.verPie ? '<div class="pie">' + m.t.pie + esc(m.usuario) + '</div>' : ''; }
  function fotoHtml(m) { return m.foto ? '<img class="foto" src="' + m.foto + '" alt="">' : ''; }

  function render() {
    if (!estado.perfil) return;
    var m = modelo(), d = m.datos;
    var estilo = ' style="--acento:' + esc(d.acento) + ';--acento-oscuro:' + oscurecer(d.acento) + '"';
    var titular = '<h1>' + esc(d.nombre || m.usuario) + '</h1>' + (d.titulo ? '<div class="titular">' + esc(d.titulo) + '</div>' : '');
    var html;
    if (d.plantilla === 'moderna') {
      html = '<div class="cv moderna"' + estilo + '><div class="cabeza">' + titular + '</div><div class="cuerpo"><div class="principal">'
        + seccionResumen(m) + seccionExperiencia(m) + seccionProyectos(m) + seccionEducacion(m) + pie(m) + '</div><div class="lateral">'
        + fotoHtml(m) + '<h2>' + m.t.contacto + '</h2>' + contactoHtml(m, true) + seccionHabilidades(m) + seccionIdiomas(m) + seccionCertificaciones(m) + seccionExtra(m) + '</div></div></div>';
    } else if (d.plantilla === 'lateral') {
      html = '<div class="cv lateral"' + estilo + '><div class="lateral">' + fotoHtml(m) + '<h2>' + m.t.contacto + '</h2>' + contactoHtml(m, false)
        + seccionHabilidades(m) + seccionIdiomas(m) + seccionCertificaciones(m) + seccionExtra(m) + '</div><div class="principal"><div class="cabeza">' + titular + '</div><div class="contenido">'
        + seccionResumen(m) + seccionExperiencia(m) + seccionProyectos(m) + seccionEducacion(m) + pie(m) + '</div></div></div>';
    } else {
      html = '<div class="cv clasica"' + estilo + '><div class="cabeza">' + fotoHtml(m) + '<div>' + titular + contactoHtml(m, false) + '</div></div>'
        + seccionResumen(m) + seccionExperiencia(m) + seccionProyectos(m) + seccionHabilidades(m) + seccionIdiomas(m) + seccionEducacion(m) + seccionCertificaciones(m) + seccionExtra(m) + pie(m) + '</div>';
    }
    $('hoja').innerHTML = html;
  }

  function oscurecer(hex) {
    var n = parseInt(hex.slice(1), 16); if (isNaN(n)) return '#16283f';
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, f = 0.72;
    return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
  }

  function markdown(m) {
    var d = m.datos, t = m.t, s = '# ' + (d.nombre || m.usuario) + '\n';
    if (d.titulo) s += '**' + d.titulo + '**\n';
    s += '\n' + [d.correo, d.telefono, d.ciudad, d.linkedin, d.web, 'github.com/' + m.usuario].filter(Boolean).join(' · ') + '\n';
    if (d.resumen) s += '\n## ' + t.resumen + '\n\n' + d.resumen + '\n';
    var bloques = function (lista, titulo, conLogros) {
      if (!lista.length) return '';
      return '\n## ' + titulo + '\n\n' + lista.map(function (b) {
        var out = '- **' + b.que + '**' + (b.donde ? ' · ' + b.donde : '') + (b.cuando ? ' (' + b.cuando + ')' : '');
        lineas(b.detalle).forEach(function (l) { out += '\n  - ' + l; });
        if (conLogros) lineas(b.logros).forEach(function (l) { out += '\n  - ' + t.logros + ': ' + l; });
        return out;
      }).join('\n') + '\n';
    };
    s += bloques(m.experiencia, t.experiencia, true);
    if (m.proyectos.length) s += '\n## ' + t.proyectos + '\n\n' + m.proyectos.map(function (p) {
      var out = '- **[' + p.nombre + '](' + p.url + ')** (' + p.periodo + ')' + (p.descripcion ? ' — ' + p.descripcion : '') + '\n  ' + p.stack.join(' · ') + (p.estrellas ? ' · ★ ' + p.estrellas : '');
      p.logros.forEach(function (l) { out += '\n  - ' + l; });
      return out;
    }).join('\n') + '\n';
    if (m.habilidades.length) s += '\n## ' + t.habilidades + '\n\n' + m.habilidades.map(function (h) { return h.nombre + (h.detalle ? ' ' + h.detalle : ''); }).join(' · ') + '\n';
    if (m.idiomas.length) s += '\n## ' + t.idiomas + '\n\n' + m.idiomas.map(function (i) { return '- ' + i.nombre + (i.etiqueta ? ' · ' + i.etiqueta : '') + ' (' + i.nivel + '/5)'; }).join('\n') + '\n';
    s += bloques(m.educacion, t.formacion, false);
    if (m.certificaciones.length) s += '\n## ' + t.certificaciones + '\n\n' + m.certificaciones.map(function (c) { return '- ' + c.nombre + ([c.emisor, c.cuando].filter(Boolean).length ? ' · ' + [c.emisor, c.cuando].filter(Boolean).join(' · ') : ''); }).join('\n') + '\n';
    if (d.intereses) s += '\n## ' + t.intereses + '\n\n' + d.intereses + '\n';
    if (m.adicional.length) s += '\n## ' + t.adicional + '\n\n' + m.adicional.map(function (l) { return '- ' + l; }).join('\n') + '\n';
    return s;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ------------------------------------------------------------------ tema
  var btnTema = $('btnTema');
  function temaActual() { var f = document.documentElement.dataset.tema; if (f) return f; return matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte'; }
  function pintarTema() { btnTema.textContent = temaActual() === 'mocha' ? '☀' : '☾'; }
  btnTema.addEventListener('click', function () {
    var nuevo = temaActual() === 'mocha' ? 'latte' : 'mocha';
    document.documentElement.dataset.tema = nuevo; try { localStorage.setItem('fumito:tema', nuevo); } catch (e) {} pintarTema();
  });
  pintarTema();
  pintarDatos();
})();

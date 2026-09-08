/* Fumito · CV a partir de repositorios de GitHub. Sin servidor, sin IA: reglas y la API pública. */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------------ estado
  var estado = {
    usuario: '', perfil: null, repos: [], seleccion: {}, detalles: {},
    datos: { nombre: '', titulo: '', correo: '', ciudad: '', web: '', resumen: '', resumenAuto: '', plantilla: 'clasica', idioma: 'es', experiencia: [], educacion: [] }
  };
  try { var g = JSON.parse(localStorage.getItem('fumito:datos') || 'null'); if (g) estado.datos = Object.assign(estado.datos, g); } catch (e) {}
  try { $('token').value = localStorage.getItem('fumito:token') || ''; } catch (e) {}
  try { $('usuario').value = localStorage.getItem('fumito:usuario') || ''; } catch (e) {}

  function guardar() {
    try { localStorage.setItem('fumito:datos', JSON.stringify(estado.datos)); } catch (e) {}
  }

  // ------------------------------------------------------------------ textos
  var L = {
    es: { proyectos: 'Proyectos', habilidades: 'Habilidades', experiencia: 'Experiencia', formacion: 'Formación', resumen: 'Perfil', actual: 'actual', estrellas: 'estrellas', pie: 'Generado con Fumito a partir de github.com/' },
    en: { proyectos: 'Projects', habilidades: 'Skills', experiencia: 'Experience', formacion: 'Education', resumen: 'Profile', actual: 'present', estrellas: 'stars', pie: 'Generated with Fumito from github.com/' }
  };

  // ------------------------------------------------------------------ API
  var restantes = null;
  function api(ruta, opciones) {
    var cab = { Accept: 'application/vnd.github+json' };
    var token = $('token').value.trim();
    if (token) cab.Authorization = 'Bearer ' + token;
    return fetch(API + ruta, Object.assign({ headers: cab }, opciones || {})).then(function (r) {
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
    var rutaRepos = token ? '/user/repos?per_page=100&sort=pushed&affiliation=owner' : '/users/' + encodeURIComponent(u) + '/repos?per_page=100&sort=pushed';
    json('/users/' + encodeURIComponent(u)).then(function (p) {
      estado.perfil = p;
      if (token) {
        // con token, /user/repos incluye privados; comprobamos que el token sea del mismo usuario
        return json('/user').then(function (yo) {
          if (yo.login.toLowerCase() !== u.toLowerCase()) rutaRepos = '/users/' + encodeURIComponent(u) + '/repos?per_page=100&sort=pushed';
          return paginar(rutaRepos);
        });
      }
      return paginar(rutaRepos);
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
    var esPerfil = r.name.toLowerCase() === estado.usuario.toLowerCase();   // el repo del README de perfil no es un proyecto
    return !r.fork && !r.archived && reciente && !esPerfil;
  }

  function pintarRepos() {
    var ul = $('listaRepos'); ul.innerHTML = '';
    var candidatos = estado.repos.filter(esCandidato);
    estado.repos.forEach(function (r, i) {
      if (estado.seleccion[r.full_name] == null) estado.seleccion[r.full_name] = candidatos.indexOf(r) > -1 && candidatos.indexOf(r) < 10;
      var li = document.createElement('li');
      li.dataset.fork = r.fork ? '1' : ''; li.dataset.archivado = r.archived ? '1' : '';
      li.innerHTML = '<input type="checkbox" ' + (estado.seleccion[r.full_name] ? 'checked' : '') + '>'
        + '<div><span class="nombre">' + esc(r.name) + '</span>'
        + (r.private ? '<span class="etq">privado</span>' : '') + (r.fork ? '<span class="etq">fork</span>' : '') + (r.archived ? '<span class="etq">archivado</span>' : '')
        + '<span class="desc">' + esc(r.description || '') + '</span></div>'
        + '<span class="meta">' + (r.language || '') + (r.stargazers_count ? ' · ★' + r.stargazers_count : '') + '</span>';
      li.querySelector('input').addEventListener('change', function (ev) { estado.seleccion[r.full_name] = ev.target.checked; pintarPresupuesto(); });
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
    document.querySelectorAll('#listaRepos li:not(.oculto)').forEach(function (li, i) {
      var r = estado.repos.filter(function (x) { return x.name === li.querySelector('.nombre').textContent; })[0];
      if (r) { estado.seleccion[r.full_name] = v; li.querySelector('input').checked = v; }
    });
    pintarPresupuesto();
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
      $('paso3').hidden = false; $('paso4').hidden = false;
      render();
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Analizar seleccionados'; aviso(e.message, true); });
  });

  function decodificar(b64) {
    try { return decodeURIComponent(Array.prototype.map.call(atob(b64.replace(/\n/g, '')), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }
    catch (e) { return ''; }
  }

  /** Saca del README el primer párrafo que de verdad explica el proyecto. */
  function describir(readme, repo) {
    var texto = (readme || '')
      .replace(/```[\s\S]*?```/g, '')                         // bloques de código
      .replace(/<!--[\s\S]*?-->/g, '')                        // comentarios
      .replace(/<[^>]+>/g, '\n')                              // etiquetas html
      .replace(/^\s*\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*$/gm, '') // badges con enlace
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')                   // imágenes
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                // enlaces → texto
      .replace(/^\s*>\s?\[!\w+\]\s*$/gm, '')                  // cabecera de alertas
      .replace(/^\s*>\s?/gm, '')                              // citas
      .replace(/[*_`~]/g, '');                                // énfasis
    var parrafos = texto.split(/\n\s*\n/).map(function (p) { return p.replace(/\s+/g, ' ').trim(); });
    var util = parrafos.filter(function (p) {
      return p.length >= 60 && !/^#/.test(p) && !/^[-|=]+$/.test(p) && !/^(\||\+)/.test(p) && (p.match(/[a-záéíóúñ]/gi) || []).length > p.length * 0.6;
    })[0];
    if (!util && repo.description) util = repo.description;
    if (!util) util = '';
    // recorta a dos frases largas como mucho
    var frases = util.match(/[^.!?]+[.!?]+(\s|$)/g) || [util];
    var salida = ''; for (var i = 0; i < frases.length && salida.length < 260; i++) salida += frases[i];
    return salida.trim() || util.slice(0, 260);
  }

  function lenguajesTotales() {
    var suma = {};
    Object.keys(estado.detalles).forEach(function (k) {
      var l = estado.detalles[k].lenguajes || {};
      Object.keys(l).forEach(function (n) { suma[n] = (suma[n] || 0) + l[n]; });
    });
    var total = Object.keys(suma).reduce(function (s, n) { return s + suma[n]; }, 0) || 1;
    return Object.keys(suma).map(function (n) { return { nombre: n, bytes: suma[n], pct: Math.round(suma[n] * 100 / total) }; })
      .sort(function (a, b) { return b.bytes - a.bytes; });
  }

  function redactarResumen() {
    var idioma = estado.datos.idioma;
    var langs = lenguajesTotales().filter(function (l) { return l.pct >= 3; }).slice(0, 4).map(function (l) { return l.nombre; });
    var n = Object.keys(estado.detalles).length;
    var temas = {};
    var langsMin = langs.map(function (l) { return l.toLowerCase(); });
    estado.repos.filter(function (r) { return estado.detalles[r.full_name]; }).forEach(function (r) {
      (r.topics || []).forEach(function (t) { if (langsMin.indexOf(t) === -1) temas[t] = (temas[t] || 0) + 1; });
    });
    var top = Object.keys(temas).sort(function (a, b) { return temas[b] - temas[a]; }).slice(0, 4);
    var estrellas = estado.repos.filter(function (r) { return estado.detalles[r.full_name]; }).reduce(function (s, r) { return s + r.stargazers_count; }, 0);
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

  // ------------------------------------------------------------------ paso 3: datos
  ['nombre', 'titulo', 'correo', 'ciudad', 'web', 'resumen'].forEach(function (k) {
    $(k).addEventListener('input', function () { estado.datos[k] = $(k).value; guardar(); render(); });
  });
  function pintarDatos() {
    ['nombre', 'titulo', 'correo', 'ciudad', 'web', 'resumen'].forEach(function (k) { $(k).value = estado.datos[k] || ''; });
    $('plantilla').value = estado.datos.plantilla; $('idioma').value = estado.datos.idioma;
    pintarBloques('experiencia'); pintarBloques('educacion');
  }
  $('btnMasExp').addEventListener('click', function () { estado.datos.experiencia.push({ donde: '', que: '', cuando: '', detalle: '' }); pintarBloques('experiencia'); guardar(); });
  $('btnMasEdu').addEventListener('click', function () { estado.datos.educacion.push({ donde: '', que: '', cuando: '', detalle: '' }); pintarBloques('educacion'); guardar(); });
  function pintarBloques(tipo) {
    var cont = $(tipo); cont.innerHTML = '';
    var etiquetas = tipo === 'experiencia' ? ['Empresa o cliente', 'Puesto', 'Periodo', 'Qué hiciste'] : ['Centro', 'Título', 'Periodo', 'Notas'];
    estado.datos[tipo].forEach(function (b, i) {
      var div = document.createElement('div'); div.className = 'bloque';
      div.innerHTML = '<label>' + etiquetas[0] + '<input data-k="donde"></label><label>' + etiquetas[1] + '<input data-k="que"></label>'
        + '<label class="ancho">' + etiquetas[2] + '<input data-k="cuando" placeholder="2024 – actual"></label>'
        + '<label class="ancho">' + etiquetas[3] + '<textarea data-k="detalle" rows="2"></textarea></label>'
        + '<button class="chico quitar">quitar</button>';
      div.querySelectorAll('[data-k]').forEach(function (inp) {
        inp.value = b[inp.dataset.k] || '';
        inp.addEventListener('input', function () { b[inp.dataset.k] = inp.value; guardar(); render(); });
      });
      div.querySelector('.quitar').addEventListener('click', function () { estado.datos[tipo].splice(i, 1); pintarBloques(tipo); guardar(); render(); });
      cont.appendChild(div);
    });
  }

  // ------------------------------------------------------------------ paso 4: plantilla, exportar
  $('plantilla').addEventListener('change', function () { estado.datos.plantilla = $('plantilla').value; guardar(); render(); });
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
      if (j.datos) estado.datos = Object.assign(estado.datos, j.datos);
      if (j.seleccion) estado.seleccion = j.seleccion;
      if (j.usuario) { $('usuario').value = j.usuario; }
      guardar(); pintarDatos(); render();
    }).catch(function () { aviso('Ese archivo no es de Fumito', true); });
  });

  // ------------------------------------------------------------------ modelo y render
  function periodo(r, t) {
    var desde = new Date(r.created_at).getFullYear(), hasta = new Date(r.pushed_at);
    var vivo = (Date.now() - hasta.getTime()) < 1000 * 60 * 60 * 24 * 180;
    var fin = vivo ? t.actual : hasta.getFullYear();
    return desde === fin ? String(desde) : desde + ' – ' + fin;
  }

  function modelo() {
    var t = L[estado.datos.idioma];
    var proyectos = estado.repos.filter(function (r) { return estado.seleccion[r.full_name] && estado.detalles[r.full_name]; })
      .sort(function (a, b) { return (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)); })
      .map(function (r) {
        var d = estado.detalles[r.full_name];
        var langs = Object.keys(d.lenguajes || {}).sort(function (a, b) { return d.lenguajes[b] - d.lenguajes[a]; }).slice(0, 3);
        var stack = langs.concat((r.topics || []).filter(function (x) { return langs.map(function (l) { return l.toLowerCase(); }).indexOf(x) === -1; }).slice(0, 3));
        return { nombre: r.name, url: r.html_url, descripcion: d.descripcion, stack: stack, estrellas: r.stargazers_count, periodo: periodo(r, t), licencia: r.license && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '' };
      });
    return { t: t, datos: estado.datos, usuario: estado.usuario, perfil: estado.perfil, proyectos: proyectos, habilidades: lenguajesTotales().filter(function (l) { return l.pct >= 2; }).slice(0, 10) };
  }

  function render() {
    if (!estado.perfil) return;
    var m = modelo(), d = m.datos, t = m.t;
    var contacto = [d.correo, d.ciudad, d.web ? d.web.replace(/^https?:\/\//, '') : '', 'github.com/' + m.usuario].filter(Boolean)
      .map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    var cabeza = '<h1>' + esc(d.nombre || m.usuario) + '</h1>' + (d.titulo ? '<p class="titulo">' + esc(d.titulo) + '</p>' : '') + '<div class="contacto">' + contacto + '</div>';
    var resumen = d.resumen ? '<h2>' + t.resumen + '</h2><p>' + esc(d.resumen) + '</p>' : '';
    var proyectos = '<h2>' + t.proyectos + '</h2>' + m.proyectos.map(function (p) {
      return '<div class="proyecto"><div class="cab"><span class="nombre">' + esc(p.nombre) + '</span><span class="periodo">' + esc(p.periodo) + '</span></div>'
        + (p.descripcion ? '<p>' + esc(p.descripcion) + '</p>' : '')
        + '<div class="stack">' + esc(p.stack.join(' · ')) + (p.estrellas ? ' · ★ ' + p.estrellas : '') + (p.licencia ? ' · ' + esc(p.licencia) : '') + '</div>'
        + '<div class="url">' + esc(p.url.replace(/^https?:\/\//, '')) + '</div></div>';
    }).join('');
    var habilidades = '<h2>' + t.habilidades + '</h2><div class="habilidades">' + m.habilidades.map(function (h) { return '<span><b>' + esc(h.nombre) + '</b> ' + h.pct + '%</span>'; }).join('') + '</div>';
    var bloques = function (lista, titulo) {
      var v = lista.filter(function (b) { return b.donde || b.que; });
      if (!v.length) return '';
      return '<h2>' + titulo + '</h2>' + v.map(function (b) {
        return '<div class="exp"><div class="cab"><span><span class="donde">' + esc(b.donde) + '</span>' + (b.que ? ' <span class="que">· ' + esc(b.que) + '</span>' : '') + '</span><span class="cuando">' + esc(b.cuando) + '</span></div>' + (b.detalle ? '<p>' + esc(b.detalle) + '</p>' : '') + '</div>';
      }).join('');
    };
    var exp = bloques(d.experiencia, t.experiencia), edu = bloques(d.educacion, t.formacion);
    var pie = '<div class="pie">' + t.pie + esc(m.usuario) + '</div>';
    var html;
    if (d.plantilla === 'moderna') {
      html = '<div class="cv moderna"><div class="cabeza">' + cabeza + '</div><div class="cuerpo"><div>' + resumen + proyectos + exp + '</div><div>' + habilidades + edu + '</div></div>' + pie + '</div>';
    } else {
      html = '<div class="cv clasica">' + cabeza + resumen + exp + proyectos + habilidades + edu + pie + '</div>';
    }
    $('hoja').innerHTML = html;
  }

  function markdown(m) {
    var d = m.datos, t = m.t, s = '# ' + (d.nombre || m.usuario) + '\n';
    if (d.titulo) s += '**' + d.titulo + '**\n';
    s += '\n' + [d.correo, d.ciudad, d.web, 'github.com/' + m.usuario].filter(Boolean).join(' · ') + '\n';
    if (d.resumen) s += '\n## ' + t.resumen + '\n\n' + d.resumen + '\n';
    var bloques = function (lista, titulo) {
      var v = lista.filter(function (b) { return b.donde || b.que; }); if (!v.length) return '';
      return '\n## ' + titulo + '\n\n' + v.map(function (b) { return '- **' + b.donde + '**' + (b.que ? ' · ' + b.que : '') + (b.cuando ? ' (' + b.cuando + ')' : '') + (b.detalle ? '\n  ' + b.detalle : ''); }).join('\n') + '\n';
    };
    s += bloques(d.experiencia, t.experiencia);
    s += '\n## ' + t.proyectos + '\n\n' + m.proyectos.map(function (p) {
      return '- **[' + p.nombre + '](' + p.url + ')** (' + p.periodo + ')' + (p.descripcion ? ' — ' + p.descripcion : '') + '\n  ' + p.stack.join(' · ') + (p.estrellas ? ' · ★ ' + p.estrellas : '');
    }).join('\n') + '\n';
    s += '\n## ' + t.habilidades + '\n\n' + m.habilidades.map(function (h) { return h.nombre + ' ' + h.pct + '%'; }).join(' · ') + '\n';
    s += bloques(d.educacion, t.formacion);
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

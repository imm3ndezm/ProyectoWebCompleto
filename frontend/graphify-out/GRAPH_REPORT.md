# Graph Report - frontend  (2026-11-22)

## Corpus Check
- 33 files · ~27,120 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 419 nodes · 1434 edges · 19 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Caja POS y Turnos
- Formularios y Campos
- Componentes UI y Tablas
- App Routing y Páginas
- Auth y Cliente HTTP
- Catálogo e Inventario
- Compras y Proveedores
- ESLint y Babel
- Metadatos package.json
- RRHH y Planilla
- Guía de Componentes
- Dependencias Runtime
- Vite y Plugins
- Iconos Plantilla Vite
- Entrada HTML y Main
- Scripts npm
- Plantilla React + Vite
- Fuente Oxygen (OFL)
- Ilustración Login

## God Nodes (most connected - your core abstractions)
1. `Button()` - 39 edges
2. `Loading()` - 32 edges
3. `ErrorState()` - 28 edges
4. `Alert()` - 26 edges
5. `DataTable()` - 25 edges
6. `EmptyState()` - 25 edges
7. `react` - 24 edges
8. `TableScroll()` - 23 edges
9. `App()` - 22 edges
10. `lucide-react` - 21 edges

## Surprising Connections (you probably didn't know these)
- `DataTable` --references--> `Receipt()`  [EXTRACTED]
  GUIA_COMPONENTES_FRONTEND.md → src/components/caja/Receipt.jsx
- `Select nativo` --references--> `AdminLayout()`  [EXTRACTED]
  GUIA_COMPONENTES_FRONTEND.md → src/components/layouts/AdminLayout.jsx
- `Select nativo` --references--> `CajaStatus()`  [EXTRACTED]
  GUIA_COMPONENTES_FRONTEND.md → src/components/caja/CajaStatus.jsx
- `Select nativo` --references--> `BranchSelect()`  [EXTRACTED]
  GUIA_COMPONENTES_FRONTEND.md → src/components/ui/BranchSelect.jsx
- `Button (secondary, primary, danger, link)` --references--> `Button()`  [EXTRACTED]
  GUIA_COMPONENTES_FRONTEND.md → src/components/ui/Button.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Vite React template default public assets (favicon + social icon sprite)** — public_favicon, public_icons, public_icons_github_icon, public_icons_documentation_icon [INFERRED 0.75]
- **Separación de inputs login vs administración** — guia_componentes_frontend_textinput_plan, guia_componentes_frontend_passwordinput, guia_componentes_frontend_maskedinput, src_components_ui_field_textfield [EXTRACTED 1.00]
- **Composición de Select nativo** — guia_componentes_frontend_select_plan, src_components_ui_field_selectfield, src_components_ui_branchselect_branchselect [EXTRACTED 1.00]

## Communities (19 total, 0 thin omitted)

### Community 0 - "Caja POS y Turnos"
Cohesion: 0.08
Nodes (40): lucide-react, getErrorMessage(), abrirTurno(), anularVenta(), cerrarTurno(), getVenta(), listarVentas(), registrarVenta() (+32 more)

### Community 1 - "Formularios y Campos"
Cohesion: 0.08
Nodes (44): MaskedInput (DUI, NIT, NRC, teléfono), actualizarCliente(), buscarClientes(), crearCliente(), nullIfEmpty(), TAMANOS_CONTRIBUYENTE, TIPOS_CONTRIBUYENTE, ClienteForm() (+36 more)

### Community 2 - "Componentes UI y Tablas"
Cohesion: 0.13
Nodes (45): DataTable, MetricCard, Estilo os-table, ArqueoTable(), Diff(), ClienteSelector(), BranchSelect(), Button() (+37 more)

### Community 3 - "App Routing y Páginas"
Cohesion: 0.09
Nodes (45): @headlessui/react@^2.2.10, @headlessui/react, react-router-dom, App(), AppArea(), CajaProvider, ComprasPage, ComprobantePage (+37 more)

### Community 4 - "Auth y Cliente HTTP"
Cohesion: 0.09
Nodes (31): axios@^1.21.1, axios, AUTH_ROUTES, AuthContractError, cleanId(), cleanString(), fetchMe(), isCanceled() (+23 more)

### Community 5 - "Catálogo e Inventario"
Cohesion: 0.11
Nodes (29): react, getTurnoActual(), actualizarPlatillo(), actualizarStockMinimo(), ajustarStock(), clean(), crearInsumo(), crearPlatillo() (+21 more)

### Community 6 - "Compras y Proveedores"
Cohesion: 0.22
Nodes (12): react-hot-toast, actualizarProveedor(), clean(), crearProveedor(), getCompra(), listarCompras(), listarProveedores(), registrarCompra() (+4 more)

### Community 7 - "ESLint y Babel"
Cohesion: 0.19
Nodes (13): devDependencies, @babel/core@^7.29.7, eslint@^10.14.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, @babel/core (+5 more)

### Community 8 - "Metadatos package.json"
Cohesion: 0.18
Nodes (10): babel-plugin-react-compiler@^1.0.0, @types/react@^19.3.0, @types/react-dom@^19.3.0, name, private, type, version, babel-plugin-react-compiler (+2 more)

### Community 9 - "RRHH y Planilla"
Cohesion: 0.33
Nodes (9): actualizarEmpleado(), CARGOS, clean(), consultarPlanilla(), crearEmpleado(), generarPlanilla(), listarEmpleados(), ROLES_ACCESO (+1 more)

### Community 10 - "Guía de Componentes"
Cohesion: 0.27
Nodes (9): Guía de extracción de componentes del frontend, Botón quitar/agregar insumo, Button (secondary, primary, danger, link), FormActions (Cancelar/Enviar), Índice de aperturas JSX, PasswordInput, Control de fechas desde/hasta, Select nativo (+1 more)

### Community 11 - "Dependencias Runtime"
Cohesion: 0.22
Nodes (9): dependencies, framer-motion@^14.11.1, lucide-react@^1.77.0, react@^19.3.1, react-hot-toast@^2.6.1, react-router-dom@^7.18.6, tailwindcss@^4.3.5, framer-motion (+1 more)

### Community 12 - "Vite y Plugins"
Cohesion: 0.22
Nodes (8): @tailwindcss/vite@^4.3.5, @rolldown/plugin-babel@^0.3.0, vite@^8.3.6, @vitejs/plugin-react@^6.1.2, @rolldown/plugin-babel, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 13 - "Iconos Plantilla Vite"
Cohesion: 0.22
Nodes (9): Favicon (Vite lightning-bolt logo), Vite Brand Logo Mark, Icons SVG Sprite Sheet, bluesky-icon symbol, discord-icon symbol, documentation-icon symbol, github-icon symbol, social-icon symbol (+1 more)

### Community 14 - "Entrada HTML y Main"
Cohesion: 0.40
Nodes (4): index.html - Restaurante Origenes SV entry page, #root mount element, react-dom@^19.3.1, react-dom

### Community 15 - "Scripts npm"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 16 - "Plantilla React + Vite"
Cohesion: 0.60
Nodes (5): ESLint Configuration (TypeScript type-aware lint recommendation), React Compiler, React + Vite Template, @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC)

### Community 17 - "Fuente Oxygen (OFL)"
Cohesion: 1.00
Nodes (3): Oxygen Font (vernon adams), Reserved Font Name 'Oxygen', SIL Open Font License 1.1

### Community 18 - "Ilustración Login"
Cohesion: 0.67
Nodes (3): Login Illustration (unDraw), Accent color #6c63ff (unDraw purple), unDraw Illustration Library

## Knowledge Gaps
- **13 isolated node(s):** `unDraw Illustration Library`, `Accent color #6c63ff (unDraw purple)`, `Vite Brand Logo Mark`, `bluesky-icon symbol`, `discord-icon symbol` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 67 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Catálogo e Inventario` to `Caja POS y Turnos`, `Formularios y Campos`, `Componentes UI y Tablas`, `App Routing y Páginas`, `Auth y Cliente HTTP`, `Compras y Proveedores`, `Metadatos package.json`, `RRHH y Planilla`, `Dependencias Runtime`, `Entrada HTML y Main`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `unDraw Illustration Library`, `Accent color #6c63ff (unDraw purple)`, `Vite Brand Logo Mark` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Caja POS y Turnos` be split into smaller, more focused modules?**
  _Cohesion score 0.08248587570621468 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Caja POS y Turnos` to `Formularios y Campos`, `Componentes UI y Tablas`, `App Routing y Páginas`, `Catálogo e Inventario`, `Compras y Proveedores`, `Metadatos package.json`, `RRHH y Planilla`, `Dependencias Runtime`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Formularios y Campos` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
- **Why does `react-hot-toast` connect `Compras y Proveedores` to `Caja POS y Turnos`, `Formularios y Campos`, `Componentes UI y Tablas`, `App Routing y Páginas`, `Auth y Cliente HTTP`, `Catálogo e Inventario`, `Metadatos package.json`, `RRHH y Planilla`, `Dependencias Runtime`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Componentes UI y Tablas` be split into smaller, more focused modules?**
  _Cohesion score 0.13131313131313133 - nodes in this community are weakly interconnected._
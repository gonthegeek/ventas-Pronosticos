# Sistema de Gestión de Ventas para Loteria

> **🛡️ Aplicación Empresarial Legítima** - Sistema interno de gestión de ventas para Loteria con arquitectura modular y seguridad empresarial implementada.

## 1. Descripción del Proyecto

Sistema web completo para registrar, analizar y visualizar las ventas de Loteria. Permite llevar un control detallado de las ventas por hora y por día, con análisis de tendencias, gestión de usuarios con roles, y dashboard de KPIs. La aplicación está construida con arquitectura modular ES6, utiliza TailwindCSS para el diseño y Chart.js para visualizaciones. Como backend, se integra con **Firebase** (Firestore y Authentication) proporcionando una base de datos en tiempo real, centralizada y segura para todos los usuarios.

### 🏗️ Arquitectura Modular

La aplicación implementa una arquitectura modular escalable:
- **Sistema de roles** con control granular de permisos (operador, supervisor, admin)
- **Módulos independientes** para cada funcionalidad del SRS
- **Router protegido** con middleware de autorización
- **Navegación dinámica** basada en permisos de usuario
- **Panel administrativo** seguro para gestión de usuarios

### 🔒 Medidas de Seguridad

Esta aplicación implementa múltiples capas de seguridad empresarial:
- **Sistema de roles jerárquico** (operador < supervisor < admin)
- **Reglas de Firestore** estrictas con validación de roles
- **Middleware de autorización** en todas las rutas
- **Sanitización de logs** sin exposición de datos sensibles
- **Panel administrativo** protegido con validación de roles
- **Headers de seguridad HTTP** (CSP, X-Frame-Options, XSS Protection)
- **Validación y sanitización** de todas las entradas del usuario

Ver [SECURITY.md](./SECURITY.md) para detalles completos.

## 2. Características Principales

### 🎯 **Funcionalidades Implementadas (Fase 1)**

* **Sistema de Autenticación y Roles:**
  * Autenticación Firebase con email/password
  * Sistema de roles jerárquico: operador → supervisor → admin
  * Control granular de permisos por funcionalidad
  * Panel administrativo para gestión de usuarios

* **Registro de Ventas por Hora:**
  * Formulario para registrar ventas con timestamp preciso
  * Cálculo automático de diferencias por período
  * Validación de datos y consistencia temporal
  * Edición y eliminación de registros con recálculo automático

* **Navegación Inteligente:**
  * Menú dinámico basado en permisos de usuario
  * Protección de rutas con middleware de autorización
  * Indicadores visuales de acceso permitido/denegado

### 🚀 **Funcionalidades Avanzadas**

* **Base de Datos Centralizada:** Todos los usuarios acceden y escriben en la misma base de datos, permitiendo trabajo colaborativo en tiempo real.
* **Optimización y Escalabilidad:** Carga de datos bajo demanda con paginación y filtros eficientes.
* **Visualización de Datos:**
    * **Gráficas de Tendencia:** Visualiza las ventas por hora (modo diario) o por día (modo semanal/mensual).
    * **Modo Comparativo:** Selecciona múltiples días y compáralos en una sola gráfica.
    * **Tabla de Registros:** Consulta los datos más recientes en formato tabular.
* **Filtros Avanzados:**
    * Períodos predefinidos: **Hoy, Esta Semana, Este Mes**
    * Filtrado por **máquina específica**
    * Rangos de fechas personalizados
* **Carga Masiva de Datos:** Sube registros históricos desde archivos `.csv`.
* **Manejo de Errores:** Notificaciones visuales para operaciones exitosas, errores y estados de carga.

## 3. Estructura del Proyecto

El proyecto implementa una arquitectura modular ES6 escalable:

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   ├── js/
│   │   ├── core/
│   │   │   ├── api.js                    # API centralizada
│   │   │   └── router.js                 # Router con protección de rutas
│   │   ├── modules/
│   │   │   ├── base-module.js           # Clase base para módulos
│   │   │   ├── dashboard/
│   │   │   │   └── dashboard.js         # Dashboard con KPIs
│   │   │   └── sales/
│   │   │       ├── hourly-sales.js     # Módulo de ventas por hora
│   │   │       └── hourly-sales-events.js  # Eventos del módulo
│   │   ├── ui/
│   │   │   └── navigation.js            # Navegación dinámica por roles
│   │   ├── utils/
│   │   │   ├── permissions.js           # Sistema de roles y permisos
│   │   │   ├── user-setup.js           # Configuración de usuarios
│   │   │   ├── admin-panel.js          # Panel administrativo
│   │   │   └── security-config.js      # Configuración de seguridad
│   │   ├── firebase-*-wrapper.js       # Wrappers de Firebase
│   │   ├── main.js                     # Punto de entrada principal
│   │   ├── auth.js                     # Autenticación y estado
│   │   ├── state.js                    # Gestión de estado global
│   │   ├── ui.js                       # Utilidades de UI
│   │   ├── chart-config.js            # Configuración de gráficas
│   │   └── utils.js                    # Utilidades generales
│   ├── index.html
│   ├── style.css
│   └── firebase-config.js
├── firestore.rules                     # Reglas de seguridad de Firestore
├── firebase.json
├── package.json
├── SECURITY.md
└── README.md
```

## 4. Configuración para Desarrollo Local

Para ejecutar la aplicación en tu máquina local:

### Prerrequisitos

* [Node.js](https://nodejs.org/) instalado
* Visual Studio Code
* La extensión **Live Server** para VS Code
* Cuenta de Firebase con proyecto configurado

### Configuración Inicial

1.  **Clona el repositorio desde GitHub:**
    ```bash
    git clone [tu-repositorio]
    cd ventas-Pronosticos
    ```

2.  **Configura Firebase:**
    ```bash
    # Copia el archivo de configuración
    cp public/firebase-config.js.example public/firebase-config.js
    # Edita firebase-config.js con tus credenciales reales de Firebase
    ```

3.  **Configura el primer usuario admin:**
    * Abre la aplicación en VS Code con Live Server
    * Regístrate con tu email en la aplicación
    * Abre la consola del navegador y ejecuta: `setupInitialAdmin()`
    * Confirma la creación del usuario admin

4.  **Instala dependencias (opcional para desarrollo):**
    ```bash
    npm install
    ```

### Scripts Disponibles

```bash
npm start          # Inicia servidor de desarrollo
npm test           # Ejecuta pruebas (si están configuradas)
npm run deploy     # Despliega a Firebase Hosting
```

## 5. Sistema de Roles y Permisos

La aplicación implementa un sistema de roles jerárquico con control granular:

### 🔑 **Roles Disponibles**

| Rol | Nivel | Permisos |
|-----|-------|----------|
| **Operador** | 1 | Registro de ventas, visualización de datos básicos |
| **Supervisor** | 2 | Todos los permisos de operador + gestión de comisiones y premios |
| **Admin** | 3 | Acceso completo + gestión de usuarios y configuración |

### 🛡️ **Control de Acceso**

- **Navegación dinámica:** Los menús se adaptan automáticamente a los permisos del usuario
- **Protección de rutas:** Middleware de autorización en todas las rutas sensibles
- **Validación en Firestore:** Reglas de seguridad estrictas a nivel de base de datos
- **Panel administrativo:** Solo accesible para usuarios con rol admin

### 👤 **Gestión de Usuarios (Solo Admins)**

Los administradores pueden:
- Agregar nuevos usuarios al sistema
- Asignar y modificar roles
- Activar/desactivar usuarios
- Ver logs de actividad (próximamente)

**Funciones administrativas disponibles en consola:**
```javascript
// Solo disponible para usuarios admin
adminAddUser(userId, email, role, name)
adminGetUserRole(userId)
adminListUsers()
```

## 6. Configuración de Firebase

La aplicación utiliza Firebase como backend con configuración empresarial:

### Servicios Utilizados

- **Authentication:** Email/Password con validación de usuarios autorizados
- **Firestore:** Base de datos NoSQL con reglas de seguridad estrictas
- **Hosting:** Despliegue automático desde GitHub Actions

### Configuración del Proyecto Firebase

1.  **Crea un Proyecto en Firebase:** Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2.  **Registra una App Web:** Obtén tu objeto de configuración
3.  **Configura Authentication:**
    * Activa el proveedor **Email/Password**
    * (Opcional) Configura dominios autorizados para producción
4.  **Configura Firestore:**
    * Crea una base de datos en **modo de producción**
    * Aplica las reglas de seguridad del archivo `firestore.rules`
5.  **Actualiza Configuración:**
    * Edita `public/firebase-config.js` con tus credenciales

### Reglas de Seguridad Implementadas

Las reglas de Firestore implementan:
- **Autenticación obligatoria** para todos los accesos
- **Validación de roles** para operaciones de escritura
- **Estructura de datos** validada para prevenir corrupción
- **Acceso granular** basado en jerarquía de roles

```javascript
// Ejemplo de regla implementada
match /authorizedUsers/{userId} {
  allow read: if isAuthenticated();
  allow write: if hasRole('admin');
  allow create: if hasRole('admin');
  allow delete: if hasRole('admin');
}
```

## 7. Despliegue y CI/CD

### Despliegue Automático (Recomendado)

El proyecto incluye configuración completa de CI/CD con GitHub Actions:

**Configuración requerida en GitHub:**
1. Ve a Settings → Secrets and variables → Actions
2. Configura los siguientes secretos:
   ```
   FIREBASE_API_KEY
   FIREBASE_AUTH_DOMAIN
   FIREBASE_PROJECT_ID
   FIREBASE_STORAGE_BUCKET
   FIREBASE_MESSAGING_SENDER_ID
   FIREBASE_APP_ID
   FIREBASE_MEASUREMENT_ID
   FIREBASE_SERVICE_ACCOUNT_[PROJECT_ID]
   ```

**Flujo automático:**
- ✅ **Push a main** → Deploy automático a producción
- ✅ **Pull Requests** → Deploy a preview (opcional)
- ✅ **Tests automáticos** antes del deploy
- ✅ **Validación de seguridad** integrada

### Despliegue Manual

Para desarrollo y testing:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login y configurar proyecto
firebase login
firebase use --add

# Deploy manual
npm run deploy
# o
firebase deploy
```

### Ambientes

- **Desarrollo:** Live Server local con hot reload
- **Staging:** Firebase Preview Channels (branches)
- **Producción:** Firebase Hosting (rama main)

## 8. Roadmap de Desarrollo

### ✅ **Fase 1 - Completada** 
- [x] Sistema de autenticación y roles
- [x] Navegación dinámica por permisos  
- [x] Módulo de ventas por hora
- [x] Refactorización de arquitectura

### 🚧 **Fase 2 - En Desarrollo**
- [ ] Dashboard con KPIs avanzados
- [ ] Módulo de comisiones mensuales
- [ ] Módulo de cambios de rollos

### 📋 **Fase 3 - Planificada**
- [ ] Análisis de ventas diarias/semanales
- [ ] Gestión de boletos vendidos  
- [ ] Cálculo de promedios de boletos

### 🎯 **Fase 4 - Futura**
- [ ] Gestión de premios pagados
- [ ] Registro de primeros lugares
- [ ] Analytics avanzado y reportes

## 9. Contribución y Soporte

### Contacto de Seguridad
Para reportes de seguridad: **security@gonzaloronzon.com**

### Estructura de Commits
El proyecto utiliza [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: nueva funcionalidad
fix: corrección de bug  
docs: actualización de documentación
style: cambios de formato
refactor: refactorización de código
test: adición de pruebas
chore: tareas de mantenimiento
```

### Licencia
Este proyecto es de uso interno empresarial. Ver archivo de licencia para detalles.

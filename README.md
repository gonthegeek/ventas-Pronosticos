Tracker de Ventas para Máquinas Vending
1. Descripción del Proyecto
Esta es una aplicación web diseñada para registrar, analizar y visualizar las ventas de máquinas vending. Permite llevar un control detallado de las ventas por hora y por día, facilitando el análisis de tendencias y el rendimiento de cada máquina. La aplicación está construida con HTML, CSS y JavaScript puro, utiliza TailwindCSS para el diseño y Chart.js para las gráficas. Como backend, se integra con Firebase (Firestore y Authentication) para ofrecer una base de datos en tiempo real, centralizada y compartida para todos los usuarios.

2. Características Principales
Registro de Ventas Diarias: Formulario simple para registrar el total acumulado de ventas de cada máquina al final de un período.

Cálculo Automático: La aplicación calcula automáticamente la venta real del período (la diferencia con el registro anterior del mismo día).

Base de Datos Centralizada: Todos los usuarios acceden y escriben en la misma base de datos, permitiendo un trabajo colaborativo en tiempo real.

Visualización de Datos:

Gráficas de Tendencia: Visualiza las ventas por hora (en modo diario) o por día (en modo semanal/mensual).

Modo Comparativo: Selecciona múltiples días y compáralos en una sola gráfica de líneas para identificar patrones.

Tabla de Registros: Consulta los datos más recientes en un formato tabular claro.

Filtros Avanzados:

Filtra los datos por períodos predefinidos: Hoy, Esta Semana, Este Mes.

Filtra la información por máquina específica.

Edición de Registros: Modifica registros existentes a través de una interfaz segura que recalcula automáticamente los datos dependientes para mantener la consistencia.

Carga Masiva de Datos: Sube registros históricos desde un archivo .csv para centralizar toda tu información.

Despliegue Automatizado: Configurado para despliegue continuo a través de GitHub Actions.

3. Estructura del Proyecto
El proyecto está modularizado para facilitar su mantenimiento:

/
├── index.html      # Contiene la estructura y el layout de la página.
├── main.js         # Toda la lógica de la aplicación, interacción con Firebase y manipulación del DOM.
├── style.css       # Estilos visuales personalizados.
├── firebase.json   # Configuración de Firebase Hosting.
└── README.md       # Este archivo.

4. Configuración para Desarrollo Local
Para ejecutar la aplicación en tu máquina local:

Prerrequisitos
Node.js instalado.

Visual Studio Code.

La extensión Live Server para VS Code.

Pasos
Clona el repositorio desde GitHub.

Abre la carpeta del proyecto en Visual Studio Code.

Haz clic derecho sobre el archivo index.html y selecciona "Open with Live Server".

5. Configuración de Firebase
La aplicación está conectada a un proyecto de Firebase. Para apuntarla a tu propio backend, sigue estos pasos:

Crea un Proyecto en Firebase: Ve a la Consola de Firebase y crea un nuevo proyecto.

Registra una App Web: Dentro de tu proyecto, registra una nueva aplicación web (</>) para obtener tu objeto de configuración.

Activa los Servicios:

Authentication: En la pestaña "Sign-in method", activa el proveedor Anónimo.

Firestore: Crea una base de datos de Firestore en modo de producción.

Actualiza las Reglas de Seguridad: Ve a la pestaña "Reglas" de Firestore y pega lo siguiente:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /public_data/ventas-pronosticos/sales/{saleId} {
      allow read, write: if request.auth != null;
    }
  }
}

Actualiza el Código: Abre el archivo main.js y reemplaza el objeto firebaseConfig con el que te proporcionó tu proyecto.

6. Despliegue
El proyecto está configurado para despliegue automático en Firebase Hosting a través de GitHub Actions.

Despliegue Manual
Si necesitas hacer un despliegue manual, asegúrate de tener Firebase CLI instalado (npm install -g firebase-tools) y ejecuta:

firebase login
firebase deploy

Despliegue Automático (CI/CD)
El repositorio contiene un archivo de flujo de trabajo en .github/workflows/deploy.yml. Este se activa automáticamente cada vez que se hace un push a la rama main, desplegando la versión más reciente del código a Firebase Hosting. Para que funcione, es necesario configurar un secreto en el repositorio de GitHub llamado FIREBASE_SERVICE_ACCOUNT_ADMINISTRACIONPRONOSTICOS con las credenciales de una cuenta de servicio de tu proyecto.
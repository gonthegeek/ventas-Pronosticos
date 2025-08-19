# 🔐 User Setup Guide - Sistema de Roles

## Quick Setup (Para empezar rápidamente)

### 1. **Hacer login en la aplicación**
Inicia sesión con tu cuenta de Firebase Auth.

### 2. **Abrir consola del navegador**
Presiona `F12` y ve a la pestaña "Console".

### 3. **Ejecutar setup automático**
```javascript
// Configurar tu usuario actual como admin
await setupInitialAdmin();
```

### 4. **Refrescar la página**
Una vez confirmado, refresca la página para aplicar los cambios.

## Manual User Setup

### Agregar usuarios específicos:

```javascript
// Agregar un operador
await addAuthorizedUser('firebase-uid-here', 'operador@example.com', 'operador', 'Juan Pérez');

// Agregar un supervisor  
await addAuthorizedUser('firebase-uid-here', 'supervisor@example.com', 'supervisor', 'María García');

// Agregar un admin
await addAuthorizedUser('firebase-uid-here', 'admin@example.com', 'admin', 'Carlos Admin');
```

### Verificar rol de un usuario:

```javascript
// Ver datos de un usuario
const userData = await getUserRole('firebase-uid-here');
console.log(userData);
```

## Roles y Permisos

### 🔵 **Operador**
- ✅ Dashboard (lectura)
- ✅ Ventas (todas las operaciones)
- ✅ Boletos (crear/leer)
- ✅ Cambio de rollos
- ❌ Comisiones
- ❌ Premiados
- ❌ Sorteos
- ❌ Admin

### 🟡 **Supervisor**
- ✅ **Todo lo del Operador +**
- ✅ Comisiones (todas)
- ✅ Premiados (todas)
- ✅ Sorteos (todas)
- ❌ Gestión usuarios

### 🔴 **Admin**
- ✅ **Todo lo del Supervisor +**
- ✅ Gestión de usuarios
- ✅ Configuración del sistema

## Firebase Auth UIDs

Para obtener el UID de un usuario de Firebase Auth:

```javascript
// Si el usuario está logueado
console.log('Current user UID:', auth.currentUser?.uid);

// O desde la consola de Firebase Auth
// Ve a Authentication > Users y copia el UID
```

## Troubleshooting

### Error: "Usuario no autorizado"
- Verifica que el usuario exista en la colección `authorizedUsers`
- Verifica que tenga un rol válido: 'operador', 'supervisor', o 'admin'

### Error: "Permisos insuficientes"
- El usuario necesita un rol superior para acceder a esa sección
- Los admins pueden modificar roles desde Firestore Console

### Error: "getDoc is not found"
- Ya está solucionado en firebase-firestore-wrapper.js
- Refresca la página si persiste

## Estructura de datos en Firestore

```javascript
// Colección: artifacts/1:154235122109:web:3747377946727b2081e2d4/public/data/config/authorizedUsers
{
  "firebase-uid": {
    "email": "user@example.com",
    "role": "operador|supervisor|admin", 
    "name": "Nombre Usuario",
    "createdAt": "2024-...",
    "updatedAt": "2024-...",
    "active": true
  }
}
```

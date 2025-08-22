<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Sales & Lottery Management System - React Migration

This project is migrating from a legacy SPA to a modern React + TailwindCSS modular architecture.

## Project Context
- **Legacy System**: Working Firebase-integrated SPA with role-based access
- **Target**: Modular React architecture with Redux Toolkit state management
- **Migration Strategy**: Hybrid approach preserving working functionality

## Key Requirements
- React + Vite for build tooling
- TailwindCSS for styling
- Redux Toolkit for state management
- React Hook Form for form handling
- Recharts for data visualization
- Firebase integration (Auth, Firestore)
- TypeScript support
- Modular architecture supporting 9 SRS functionalities

## Architecture Guidelines
- Use modular structure: core/, services/, modules/, components/, state/
- Preserve working Firebase authentication and role-based access
- Migrate functionality incrementally from legacy codebase
- Follow event-driven architecture patterns
- Implement proper service layer separation

## Checklist Progress

- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
	<!-- React + TailwindCSS modular architecture for Sales & Lottery Management System migration -->

- [x] Scaffold the Project
	<!-- ✅ Created React + Vite project structure with TypeScript, TailwindCSS, Redux Toolkit, and all required dependencies -->

- [x] Customize the Project
	<!-- ✅ Set up complete modular architecture with:
	     - core/ services/ modules/ components/ state/ directories
	     - Firebase integration and AuthService migration
	     - Redux Toolkit state management
	     - Migrated HourlySales module (SRS #1) with full CRUD functionality
	     - Role-based navigation and permissions
	     - Responsive layout with sidebar/header
	     - Sales comparison feature with flexible date/weekday selection
	     - Proper edit functionality with automatic recalculation -->

- [ ] Install Required Extensions
	<!-- Install any VS Code extensions for React/TypeScript development -->

- [x] Compile the Project
	<!-- ✅ Dependencies installed successfully, TypeScript configured -->

- [x] Create and Run Task
	<!-- ✅ Development server configured and running -->

- [x] Launch the Project
	<!-- ✅ Development server started at http://localhost:3000/ -->

- [x] Ensure Documentation is Complete
	<!-- ✅ Comprehensive README.md created with migration guide, architecture documentation, and progress tracking -->
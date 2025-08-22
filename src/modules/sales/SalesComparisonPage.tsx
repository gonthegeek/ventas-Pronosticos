import React from 'react';
import SalesComparison from '../../components/sales/SalesComparison';

/**
 * Sales Comparison Page - Compare sales data across different date ranges and machines
 */
const SalesComparisonPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Comparación de Ventas
          </h1>
          <p className="text-gray-600">
            Compara el rendimiento de ventas entre diferentes fechas, máquinas y períodos de tiempo
          </p>
        </div>
      </div>
      
      <SalesComparison />
    </div>
  );
};

export default SalesComparisonPage;

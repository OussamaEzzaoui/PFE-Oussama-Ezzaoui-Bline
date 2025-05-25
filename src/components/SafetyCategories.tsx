import React from 'react';
import * as lucide from 'lucide-react';

interface SafetyCategoriesProps {
  selectedCategories: string[];
  onSelectCategory: (categoryId: string) => void;
  categories: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  error?: string;
}
// I edited the Lucid icons to match my new safety categories
const iconMap: Record<string, keyof typeof lucide> = {
  'hard-hat': 'HardHat',
  'flame': 'Flame',
  'footprints': 'Footprints',
  'tool': 'Wrench',
  'truck': 'Truck',
  'construction': 'Construction',
  'zap': 'Zap',
  'shield-off': 'ShieldOff',
  'arrow-up': 'ArrowUp',
  'square': 'Square',
  'car': 'Car',
  'flask-conical': 'FlaskConical',
  'plug': 'Plug',
  'target': 'Target',
  'arrow-up-from-line': 'ArrowUpFromLine',
  'file-check': 'FileCheck',
};

export function SafetyCategories({ selectedCategories, onSelectCategory, categories, error }: SafetyCategoriesProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {categories.map((category) => {
          // Get the icon component from lucide, fallback to AlertCircle if not found
          const Icon = lucide[iconMap[category.icon] || 'AlertCircle'] as React.ElementType;

          // Only allow one selected category
          const isSelected = selectedCategories.includes(category.id);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              } ${error ? 'border-red-500' : ''}`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
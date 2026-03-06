import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";

const { categories, loading } = useCategories();


export const hierarchicalCategories = useMemo(() => {
    if (!categories.length) return [];
    
    const parents = categories.filter(c => !c.parent || c.parent === 0);
    return parents.map(parent => ({
      id: parent.id,
      name: parent.name,
      subcategories: categories.filter(c => c.parent === parent.id)
    })).filter(cat => cat.name !== "Sem categoria");
  }, [categories]);
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, ChevronDown, ChevronRight } from "lucide-react";
import { getEastZone, getWastZone, getGeneral, getBRIGRAJSINH } from "@/data/index";

interface NestedItem {
  id: string;
  label: string;
  children?: NestedItem[];
}

const createNestedData = (
  data: any[],
): NestedItem[] => {
  const nestedData: NestedItem[] = [];
  const zoneMap = new Map<string, NestedItem>();

  data.forEach((item, index) => {
    // Add null checks to prevent undefined errors
    if (!item || !item.Zone || !item.Ward) {
      console.warn('Invalid item data:', item);
      return;
    }
    
    const zoneId = `zone_${item.Zone.toLowerCase().replace(/\s+/g, "_")}`;
    const wardId = `ward_${item.Ward.toLowerCase().replace(/\s+/g, "_")}`;
    const jobId = `job_${index}`;

    if (!zoneMap.has(zoneId)) {
      zoneMap.set(zoneId, {
        id: zoneId,
        label: item.Zone,
        children: [],
      });
      nestedData.push(zoneMap.get(zoneId)!);
    }

    const zone = zoneMap.get(zoneId)!;
    let town = zone.children?.find((child) => child.id === wardId);

    if (!town) {
      town = {
        id: wardId,
        label: item.Ward,
        children: [],
      };
      zone.children?.push(town);
    }

    town.children?.push({
      id: jobId,
      label: item["Job Name"],
    });
  });

  return nestedData;
};

// Data will be loaded dynamically inside the component

const collectItemIds = (item: NestedItem): string[] => {
  const ids = [item.label];

  if (item.children) {
    item.children.forEach((child) => {
      ids.push(...collectItemIds(child));
    });
  }

  return ids;
};

const NestedDropdownItem: React.FC<{
  item: NestedItem;
  depth: number;
  parentChecked: boolean;
  onChildCheck: (checked: boolean, id: string) => void;
  onItemCheck: (id: string[], checked: boolean) => void;
}> = ({ item, depth, parentChecked, onChildCheck, onItemCheck }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    setIsChecked(parentChecked);
  }, [parentChecked]);

  const handleCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);

    // Collect all IDs of this item and its children
    const allIds = collectItemIds(item);

    // Notify parent of checked/unchecked items
    onItemCheck(allIds, checked);
    onChildCheck(checked, item.id);
  };

  return (
    <div className="ml-4 mt-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={item.id}
          checked={isChecked}
          onCheckedChange={handleCheckboxChange}
        />
        <label
          htmlFor={item.id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {item.label}
        </label>
        {item.children && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        )}
      </div>
      {isOpen && item.children && (
        <div className="mt-2">
          {item.children.map((child) => (
            <NestedDropdownItem
              key={child.id}
              item={child}
              depth={depth + 1}
              parentChecked={isChecked}
              onChildCheck={(checked, parentId) => {
                if (!checked) {
                  setIsChecked(false);
                  onChildCheck(false, parentId);
                }
              }}
              onItemCheck={onItemCheck}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NestedDropdownCheckbox = (props: {
  town: { value: string; label: string };
  zone: { value: string; label: string };
  ward: { value: string; label: string };
  onCheckedItemsChange?: (items: string[]) => void;
  validate: boolean;
}) => {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [nestedData, setNestedData] = useState<NestedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCheckedItems([]);
  }, [props.validate]);

  // Load data dynamically based on zone and town
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        let data: any[] = [];
        
        if (props.town.value === "BRIGRAJSINH") {
          if (props.zone.value === "WEST_ZONE") {
            data = await getBRIGRAJSINH();
          }
        } else {
          if (props.zone.value === "WEST_ZONE") {
            data = await getWastZone();
          } else if (props.zone.value === "EAST_ZONE") {
            data = await getEastZone();
          } else if (props.zone.value === "GENERAL") {
            data = await getGeneral();
          }
        }
        
        const nested = createNestedData(data);
        setNestedData(nested);
      } catch (error) {
        console.error('Error loading data:', error);
        setNestedData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [props.zone.value, props.town.value]);

  const handleItemCheck = useCallback((ids: string[], checked: boolean) => {
    setCheckedItems((prev) => {
      const newCheckedItems = checked
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((item) => !ids.includes(item));

      // Use setTimeout to defer the callback to avoid state update during render
      setTimeout(() => {
        props.onCheckedItemsChange?.(newCheckedItems);
      }, 0);
      
      return newCheckedItems;
    });
  }, [props.onCheckedItemsChange]);

  const renderDropdown = (data: NestedItem[]) => {
    return data.map((item) => (
      <NestedDropdownItem
        key={item.id}
        item={item}
        depth={0}
        parentChecked={false}
        onChildCheck={() => {}}
        onItemCheck={handleItemCheck}
      />
    ));
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading filters...</div>;
  }

  let filteredData: NestedItem[] = nestedData;

  if (props.ward.value === "All") {
    return renderDropdown(filteredData);
  }

  // If ward.value is not "All", filter based on the specific ward label
  filteredData = filteredData.map((zone) => {
    return {
      ...zone,
      children: zone.children?.filter(
        (child) => child.label === props.ward.label,
      ),
    };
  });

  return renderDropdown(filteredData);
};

export default NestedDropdownCheckbox;

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getEastZone, getWastZone, getGeneral, getBRIGRAJSINH } from "@/data/index";

interface NestedItem {
  id: string;
  label: string;
  children?: NestedItem[];
}

const createNestedData = (
  data: unknown[],
): NestedItem[] => {
  const nestedData: NestedItem[] = [];
  const zoneMap = new Map<string, NestedItem>();

  console.log('Creating nested data from:', data.length, 'items');
  console.log('Sample data structure:', data.slice(0, 2));

  data.forEach((item, index) => {
    // Check if this is a job object with Zone/Ward properties
    if (item && typeof item === 'object' && 'Zone' in item && 'Ward' in item && 'Job Name' in item) {
      const jobItem = item as { Zone: string; Ward: string; 'Job Name': string };
      console.log('Processing job item:', { Zone: jobItem.Zone, Ward: jobItem.Ward, JobName: jobItem["Job Name"] });
      
      const zoneId = `zone_${jobItem.Zone.toLowerCase().replace(/\s+/g, "_")}`;
      const wardId = `ward_${jobItem.Ward.toLowerCase().replace(/\s+/g, "_")}`;
      const jobId = `job_${index}`;

      if (!zoneMap.has(zoneId)) {
        zoneMap.set(zoneId, {
          id: zoneId,
          label: jobItem.Zone,
          children: [],
        });
        nestedData.push(zoneMap.get(zoneId)!);
      }

      const zone = zoneMap.get(zoneId)!;
      let town = zone.children?.find((child) => child.id === wardId);

      if (!town) {
        town = {
          id: wardId,
          label: jobItem.Ward,
          children: [],
        };
        zone.children?.push(town);
      }

      town.children?.push({
        id: jobId,
        label: jobItem["Job Name"],
      });
    } else {
      // This might be detailed data, skip it for now
      console.log('Skipping item without Zone/Ward/Job Name:', item);
    }
  });

  console.log('Created nested data:', nestedData);
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
  const { town, zone, ward, onCheckedItemsChange } = props;
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [nestedData, setNestedData] = useState<NestedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCheckedItems([]);
  }, [zone.value, ward.value]);

  // Load data dynamically based on zone and town
  useEffect(() => {
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        let data: unknown[] = [];
        
        console.log('Loading data for:', { town: town.value, zone: zone.value });
        
        if (town.value === "BRIGRAJSINH") {
          // BRIGRAJSINH only has WEST_ZONE data
          data = await getBRIGRAJSINH();
          console.log('BRIGRAJSINH data loaded:', data.length, 'items');
          console.log('BRIGRAJSINH sample data:', data.slice(0, 2));
          
          // Filter data to only include job summary records (not detailed records)
          const jobSummaryData = data.filter((item: unknown) => {
            if (item && typeof item === 'object' && 'Zone' in item && 'Ward' in item && 'Job Name' in item) {
              return true;
            }
            return false;
          });
          console.log('BRIGRAJSINH job summary data after filtering:', jobSummaryData.length, 'items');
          data = jobSummaryData;
        } else if (town.value === "BHAVNAGAR_OSC") {
          if (zone.value === "WEST_ZONE") {
            data = await getWastZone();
            console.log('WastZone data loaded:', data.length, 'items');
          } else if (zone.value === "EAST_ZONE") {
            data = await getEastZone();
            console.log('EastZone data loaded:', data.length, 'items');
          } else if (zone.value === "GENERAL") {
            data = await getGeneral();
            console.log('General data loaded:', data.length, 'items');
          } else if (zone.value === "All") {
            // Load all data when zone is "All"
            const [wastZoneData, eastZoneData, generalData] = await Promise.all([
              getWastZone(),
              getEastZone(),
              getGeneral()
            ]);
            data = [...wastZoneData, ...eastZoneData, ...generalData];
            console.log('All data loaded:', data.length, 'items');
          }
        }
        
        console.log('Final data before nesting:', data.slice(0, 3)); // Log first 3 items
        const nested = createNestedData(data);
        console.log('Nested data created:', nested);
        setNestedData(nested);
      } catch (error) {
        console.error('Error loading data:', error);
        setNestedData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [zone.value, town.value]);

  const handleItemCheck = useCallback((ids: string[], checked: boolean) => {
    setCheckedItems((prev) => {
      const newCheckedItems = checked
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((item) => !ids.includes(item));
      
      return newCheckedItems;
    });
  }, []);

  // Use useEffect to call the callback after state update
  useEffect(() => {
    onCheckedItemsChange?.(checkedItems);
  }, [checkedItems, onCheckedItemsChange]);

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

  if (ward.value === "All") {
    return renderDropdown(filteredData);
  }

  // If ward.value is not "All", filter based on the specific ward label
  filteredData = filteredData.map((zone) => {
    return {
      ...zone,
      children: zone.children?.filter(
        (child) => child.label === ward.label,
      ),
    };
  });

  return renderDropdown(filteredData);
};

export default NestedDropdownCheckbox;
